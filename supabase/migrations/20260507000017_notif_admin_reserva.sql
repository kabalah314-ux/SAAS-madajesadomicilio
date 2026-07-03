-- =========================================================
-- MASSFLOW · B-01 (Guía de testeo FA2) — avisar al ADMIN de cada reserva nueva
-- =========================================================
-- Antes, notify_reserva_event (INSERT) solo notificaba a la masajista asignada
-- o a las masajistas verificadas si la reserva nacía sin asignar; el admin NUNCA
-- se enteraba. El testeo E2E (harness/09 · FA2) lo marcó como fallo: la reserva
-- debe generar también una notificación al admin. Se recrea el trigger añadiendo
-- ese aviso, conservando el resto de la lógica intacta.

create or replace function public.notify_reserva_event()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if TG_OP = 'INSERT' then
    if new.masajista_id is not null then
      insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
      values (new.masajista_id, 'reserva_nueva', 'Nueva solicitud',
              'Tienes una nueva solicitud de reserva ' || new.codigo,
              jsonb_build_object('reserva_id', new.id));
    else
      insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
      select m.id, 'reserva_nueva', 'Nueva solicitud disponible',
             'Hay una nueva solicitud (' || new.codigo || ') en ' || coalesce(new.ciudad, 'tu zona'),
             jsonb_build_object('reserva_id', new.id)
      from public.masajistas m
      join public.profiles p on p.id = m.id
      where m.is_verified = true and m.is_suspended = false and p.is_active = true;
    end if;

    -- B-01: aviso al ADMIN de TODA reserva nueva (asignada o no).
    insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
    select p.id, 'reserva_nueva', 'Nueva reserva',
           'Nueva reserva ' || new.codigo ||
             case when new.masajista_id is null then ' (pendiente de asignar)' else '' end,
           jsonb_build_object('reserva_id', new.id)
    from public.profiles p
    where p.role = 'admin';
  end if;

  if TG_OP = 'UPDATE' and old.estado <> new.estado and new.cliente_id is not null then
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
end; $function$;
