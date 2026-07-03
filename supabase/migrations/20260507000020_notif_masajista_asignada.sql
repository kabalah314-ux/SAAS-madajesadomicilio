-- =========================================================
-- MASSFLOW · N2 (auditoría ronda 2) — avisar a la masajista cuando la ASIGNAN
-- =========================================================
-- El admin asigna con la misma función que el claim (aceptarSolicitud): la reserva
-- pasa pendiente→aceptada y se le pone masajista_id. El trigger notificaba a la
-- clienta ("reserva confirmada") pero NO a la masajista recién asignada. Además,
-- para reservas de un contacto (cliente_id NULL) el bloque de UPDATE se saltaba
-- entero. Se añade un bloque independiente: si alguien DISTINTO de la propia
-- masajista (admin o service_role) le asigna una reserva, se le notifica.
-- Distingue por auth.uid(): si la masajista se autoasigna (claim), no se duplica.

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

    insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
    select p.id, 'reserva_nueva', 'Nueva reserva',
           'Nueva reserva ' || new.codigo ||
             case when new.masajista_id is null then ' (pendiente de asignar)' else '' end,
           jsonb_build_object('reserva_id', new.id)
    from public.profiles p
    where p.role = 'admin';
  end if;

  -- N2: la masajista recibe aviso si OTRO (admin/servicio) la asigna a una reserva
  -- que estaba sin asignar. Si se autoasigna (claim), auth.uid() = ella → no se avisa.
  if TG_OP = 'UPDATE'
     and old.masajista_id is null and new.masajista_id is not null
     and coalesce(auth.uid()::text, '') <> new.masajista_id::text then
    insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
    values (new.masajista_id, 'reserva_nueva', 'Reserva asignada',
            'Te han asignado la reserva ' || new.codigo,
            jsonb_build_object('reserva_id', new.id, 'evento', 'asignada'));
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
