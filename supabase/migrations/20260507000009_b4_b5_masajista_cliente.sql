-- =========================================================
-- MASSFLOW · B4 (masajista ve al cliente) + B5 (notificar solicitudes)
-- =========================================================

-- ---------------------------------------------------------
-- B4 · La masajista puede leer el PERFIL (nombre/teléfono) de los
--      clientes de SUS reservas asignadas.
-- ---------------------------------------------------------
-- profiles_select original solo deja ver el propio perfil o al admin,
-- así que la masajista nunca veía nombre/teléfono del cliente. Esta
-- policy ADICIONAL (permissive, se suma por OR) lo permite SOLO para
-- clientes con una reserva asignada a ella. Para solicitudes abiertas
-- (sin asignar) NO aplica → no se filtra contacto hasta aceptar.
drop policy if exists "profiles_select_assigned_masajista" on public.profiles;
create policy "profiles_select_assigned_masajista"
  on public.profiles for select
  using (
    public.is_masajista()
    and exists (
      select 1 from public.reservas r
      where r.cliente_id = profiles.id
        and r.masajista_id = auth.uid()
    )
  );

-- ---------------------------------------------------------
-- B5 · Notificar a las masajistas elegibles cuando entra una
--      solicitud SIN asignar (modelo "la primera que acepta").
-- ---------------------------------------------------------
-- Antes el trigger solo notificaba si la reserva nacía con masajista.
-- Las reservas con asignación automática (masajista_id null) no
-- avisaban a nadie. Ahora se notifica a toda masajista verificada,
-- activa y no suspendida.
create or replace function public.notify_reserva_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    if new.masajista_id is not null then
      -- Reserva que nace asignada a una masajista concreta.
      insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
      values (new.masajista_id, 'reserva_nueva', 'Nueva solicitud',
              'Tienes una nueva solicitud de reserva ' || new.codigo,
              jsonb_build_object('reserva_id', new.id));
    else
      -- Solicitud abierta: avisar a las masajistas elegibles.
      insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
      select m.id, 'reserva_nueva', 'Nueva solicitud disponible',
             'Hay una nueva solicitud (' || new.codigo || ') en ' || coalesce(new.ciudad, 'tu zona'),
             jsonb_build_object('reserva_id', new.id)
      from public.masajistas m
      join public.profiles p on p.id = m.id
      where m.is_verified = true
        and m.is_suspended = false
        and p.is_active = true;
    end if;
  end if;

  if TG_OP = 'UPDATE' and old.estado <> new.estado then
    if new.estado = 'aceptada' then
      insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
      values (new.cliente_id, 'reserva_aceptada', 'Reserva confirmada',
              'Tu reserva ' || new.codigo || ' fue aceptada',
              jsonb_build_object('reserva_id', new.id));
    elsif new.estado = 'rechazada' then
      insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
      values (new.cliente_id, 'reserva_rechazada', 'Reserva rechazada',
              'Tu reserva ' || new.codigo || ' fue rechazada',
              jsonb_build_object('reserva_id', new.id, 'motivo', new.rechazo_motivo));
    elsif new.estado = 'cancelada' then
      insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
      values (
        case when new.cancelado_por = new.cliente_id then new.masajista_id else new.cliente_id end,
        'reserva_cancelada', 'Reserva cancelada',
        'La reserva ' || new.codigo || ' fue cancelada',
        jsonb_build_object('reserva_id', new.id));
    end if;
  end if;
  return new;
end; $$;
-- El trigger trg_reservas_notify ya existe (migración _logic); basta redefinir la función.
