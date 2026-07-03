-- =========================================================
-- MASSFLOW · Aviso al cliente al RECIBIR su solicitud + emails más cuidados
-- =========================================================
-- Hoy, cuando un cliente crea una reserva, NO recibe ningún aviso (ni in-app ni
-- por email) — solo se notifica a la masajista y al admin. Se añade una
-- notificación de "hemos recibido tu solicitud" para el cliente, y se enriquece
-- el payload de las notificaciones del cliente (servicio/fecha/hora/precio/código)
-- para que send-email pueda montar una tarjeta de detalles bonita en vez de un
-- único mensaje de texto plano.

create or replace function public.notify_reserva_event()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  destinatario uuid;
  v_servicio   text;
begin
  if TG_OP = 'INSERT' then
    select nombre into v_servicio from public.servicios where id = new.servicio_id;

    if new.masajista_id is not null then
      insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
      values (new.masajista_id, 'reserva_nueva', 'Nueva solicitud',
              'Tienes una nueva solicitud de reserva ' || new.codigo,
              jsonb_build_object('reserva_id', new.id, 'codigo', new.codigo,
                'servicio', v_servicio, 'fecha', new.fecha, 'hora', new.hora_inicio,
                'direccion', new.direccion_servicio));
    else
      insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
      select m.id, 'reserva_nueva', 'Nueva solicitud disponible',
             'Hay una nueva solicitud (' || new.codigo || ') en ' || coalesce(new.ciudad, 'tu zona'),
             jsonb_build_object('reserva_id', new.id, 'codigo', new.codigo,
               'servicio', v_servicio, 'fecha', new.fecha, 'hora', new.hora_inicio,
               'direccion', new.direccion_servicio)
      from public.masajistas m
      join public.profiles p on p.id = m.id
      where m.is_verified = true and m.is_suspended = false and p.is_active = true;
    end if;

    insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
    select p.id, 'reserva_nueva', 'Nueva reserva',
           'Nueva reserva ' || new.codigo ||
             case when new.masajista_id is null then ' (pendiente de asignar)' else '' end,
           jsonb_build_object('reserva_id', new.id, 'codigo', new.codigo,
             'servicio', v_servicio, 'fecha', new.fecha, 'hora', new.hora_inicio)
    from public.profiles p
    where p.role = 'admin';

    -- Aviso al CLIENTE de que su solicitud se ha recibido correctamente
    -- (antes no recibía ningún aviso al enviarla).
    if new.cliente_id is not null then
      insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
      values (new.cliente_id, 'reserva_nueva', 'Hemos recibido tu solicitud',
              'Tu solicitud ' || new.codigo || ' se ha registrado correctamente. Te avisaremos en cuanto una masajista la confirme.',
              jsonb_build_object('reserva_id', new.id, 'evento', 'solicitud_recibida',
                'codigo', new.codigo, 'servicio', v_servicio, 'fecha', new.fecha,
                'hora', new.hora_inicio, 'direccion', new.direccion_servicio, 'precio', new.precio_total));
    end if;
  end if;

  -- N2: la masajista recibe aviso si OTRO (admin/servicio) la asigna a una reserva
  -- que estaba sin asignar. Si se autoasigna (claim), auth.uid() = ella → no se avisa.
  if TG_OP = 'UPDATE'
     and old.masajista_id is null and new.masajista_id is not null
     and coalesce(auth.uid()::text, '') <> new.masajista_id::text then
    select nombre into v_servicio from public.servicios where id = new.servicio_id;
    insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
    values (new.masajista_id, 'reserva_nueva', 'Reserva asignada',
            'Te han asignado la reserva ' || new.codigo,
            jsonb_build_object('reserva_id', new.id, 'evento', 'asignada', 'codigo', new.codigo,
              'servicio', v_servicio, 'fecha', new.fecha, 'hora', new.hora_inicio,
              'direccion', new.direccion_servicio));
  end if;

  if TG_OP = 'UPDATE' and old.estado <> new.estado and new.cliente_id is not null then
    select nombre into v_servicio from public.servicios where id = new.servicio_id;
    if new.estado = 'aceptada' then
      insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
      values (new.cliente_id, 'reserva_aceptada', 'Reserva confirmada',
              'Tu reserva ' || new.codigo || ' fue aceptada',
              jsonb_build_object('reserva_id', new.id, 'codigo', new.codigo,
                'servicio', v_servicio, 'fecha', new.fecha, 'hora', new.hora_inicio,
                'direccion', new.direccion_servicio, 'precio', new.precio_total));
    elsif new.estado = 'rechazada' then
      insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
      values (new.cliente_id, 'reserva_rechazada', 'Reserva rechazada',
              'Tu reserva ' || new.codigo || ' fue rechazada',
              jsonb_build_object('reserva_id', new.id, 'motivo', new.rechazo_motivo,
                'codigo', new.codigo, 'servicio', v_servicio, 'fecha', new.fecha, 'hora', new.hora_inicio));
    elsif new.estado = 'cancelada' then
      destinatario := case when new.cancelado_por = new.cliente_id then new.masajista_id else new.cliente_id end;
      if destinatario is not null then
        insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
        values (destinatario, 'reserva_cancelada', 'Reserva cancelada',
                'La reserva ' || new.codigo || ' fue cancelada',
                jsonb_build_object('reserva_id', new.id, 'codigo', new.codigo,
                  'servicio', v_servicio, 'fecha', new.fecha, 'hora', new.hora_inicio));
      end if;
    end if;
  end if;
  return new;
end; $function$;
