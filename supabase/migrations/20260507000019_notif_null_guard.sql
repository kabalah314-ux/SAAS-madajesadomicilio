-- =========================================================
-- MASSFLOW · N1 (auditoría ronda 2) — cancelar reserva pendiente sin asignar
-- =========================================================
-- BUG confirmado EN VIVO: si una clienta cancela una reserva PENDIENTE (aún sin
-- masajista, masajista_id NULL), el trigger notify_reserva_event calculaba el
-- destinatario como `masajista_id` (=NULL) e intentaba insertar una notificación
-- con user_id NULL → viola el NOT NULL de `notificaciones.user_id` → el UPDATE
-- fallaba y la reserva NO se podía cancelar.
-- Arreglo: solo insertar la notificación de cancelación si el destinatario NO es
-- NULL. Se recrea la función conservando el resto (incluida la notif al admin de _17).

create or replace function public.notify_reserva_event()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  destinatario uuid;
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

    -- Aviso al ADMIN de TODA reserva nueva (B-01).
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
      -- N1: el destinatario puede ser NULL (p.ej. clienta cancela una pendiente
      -- sin masajista). Solo notificar si hay destinatario válido.
      destinatario := case when new.cancelado_por = new.cliente_id then new.masajista_id else new.cliente_id end;
      if destinatario is not null then
        insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
        values (destinatario, 'reserva_cancelada', 'Reserva cancelada',
                'La reserva ' || new.codigo || ' fue cancelada',
                jsonb_build_object('reserva_id', new.id));
      end if;
    end if;
  end if;
  return new;
end; $function$;
