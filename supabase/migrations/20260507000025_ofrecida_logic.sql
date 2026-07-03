-- =========================================================
-- FASE 11 · A2/A3 — Lógica del reparto con consentimiento
-- (usa el valor 'ofrecida' añadido en el _24; va en migración aparte)
-- =========================================================

-- ---------------------------------------------------------
-- A2 · reservas_guard_update: permitir a la masajista OFERTADA
-- rechazar su oferta (ofrecida → pendiente, liberando la reserva al pool).
-- Aceptar (ofrecida → aceptada) ya lo permitía la rama de la masajista.
-- El admin/service_role sigue con vía libre (ofrecer = pendiente→ofrecida).
-- ---------------------------------------------------------
create or replace function public.reservas_guard_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if public.is_admin() or v_uid is null then return new; end if;

  new.cliente_id               := old.cliente_id;
  new.contacto_id              := old.contacto_id;
  new.servicio_id              := old.servicio_id;
  new.codigo                   := old.codigo;
  new.precio_total             := old.precio_total;
  new.comision_pct             := old.comision_pct;
  new.comision_monto           := old.comision_monto;
  new.pago_masajista           := old.pago_masajista;
  new.pago_estado              := old.pago_estado;
  new.stripe_payment_intent_id := old.stripe_payment_intent_id;

  -- La masajista OFERTADA rechaza su oferta → vuelve al pool sin asignar.
  -- (motivo en rechazo_motivo; NO pasa a 'rechazada', que es terminal)
  if old.estado = 'ofrecida' and old.masajista_id = v_uid and new.estado = 'pendiente' then
    new.masajista_id := null;
    return new;
  end if;

  -- Congelar masajista_id salvo el claim del pool abierto (old null → yo).
  if new.masajista_id is distinct from old.masajista_id then
    if not (old.masajista_id is null and new.masajista_id = v_uid) then
      new.masajista_id := old.masajista_id;
    end if;
  end if;

  if new.estado is distinct from old.estado then
    if v_uid = old.cliente_id then
      if new.estado <> 'cancelada' then raise exception 'La clienta solo puede cancelar la reserva'; end if;
    elsif v_uid = new.masajista_id then
      -- incluye ofrecida→aceptada (aceptar oferta) y el claim del pool
      if new.estado not in ('aceptada','rechazada','completada','cancelada') then
        raise exception 'Transición de estado no permitida para la masajista'; end if;
    else
      raise exception 'No autorizado a cambiar el estado de la reserva';
    end if;
    if new.estado = 'cancelada' and new.cancelado_por is null then new.cancelado_por := v_uid; end if;
  end if;
  return new;
end; $$;

-- ---------------------------------------------------------
-- RLS: permitir a la masajista dejar SU reserva ofertada de vuelta en el pool
-- (estado 'pendiente' + masajista_id NULL). El WITH CHECK solo ve la fila nueva;
-- el trigger de arriba es el guardián real de qué transición es válida.
-- ---------------------------------------------------------
alter policy "reservas_update_participants" on public.reservas
  with check (
    cliente_id = auth.uid()
    or masajista_id = auth.uid()
    or public.is_admin()
    or (public.is_masajista() and masajista_id is null and estado = 'pendiente')
  );

-- ---------------------------------------------------------
-- A3 · notify_reserva_event: avisos de oferta / aceptación / rechazo-devolución.
-- Se reescribe entera preservando el comportamiento previo y añadiendo:
--  · ofrecer  → aviso a la masajista ("Nueva oferta de reserva")
--  · aceptar oferta → aviso a los admins
--  · rechazar oferta → aviso a los admins (vuelve a estar libre)
-- Además el bloque "Reserva asignada" (N2) se excluye cuando es una OFERTA.
-- ---------------------------------------------------------
create or replace function public.notify_reserva_event()
returns trigger
language plpgsql
security definer set search_path = public
as $$
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

    if new.cliente_id is not null then
      insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
      values (new.cliente_id, 'reserva_nueva', 'Hemos recibido tu solicitud',
              'Tu solicitud ' || new.codigo || ' se ha registrado correctamente. Te avisaremos en cuanto una masajista la confirme.',
              jsonb_build_object('reserva_id', new.id, 'evento', 'solicitud_recibida',
                'codigo', new.codigo, 'servicio', v_servicio, 'fecha', new.fecha,
                'hora', new.hora_inicio, 'direccion', new.direccion_servicio, 'precio', new.precio_total));
    end if;
  end if;

  -- Fase 11·A: OFERTA dirigida (admin propone a una masajista concreta).
  -- Cubre pendiente→ofrecida y re-ofrecer a OTRA masajista (ofrecida→ofrecida, cambia el destino).
  if TG_OP = 'UPDATE' and new.estado = 'ofrecida' and new.masajista_id is not null
     and (old.estado is distinct from 'ofrecida' or new.masajista_id is distinct from old.masajista_id) then
    select nombre into v_servicio from public.servicios where id = new.servicio_id;
    insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
    values (new.masajista_id, 'reserva_nueva', 'Nueva oferta de reserva',
            'Te han ofrecido la reserva ' || new.codigo || '. Acéptala o recházala.',
            jsonb_build_object('reserva_id', new.id, 'evento', 'ofrecida', 'codigo', new.codigo,
              'servicio', v_servicio, 'fecha', new.fecha, 'hora', new.hora_inicio,
              'direccion', new.direccion_servicio));
  end if;

  -- N2: aviso "Reserva asignada" cuando OTRO (admin/servicio) asigna una reserva
  -- que estaba sin asignar — EXCEPTO si es una oferta (se avisa arriba).
  if TG_OP = 'UPDATE'
     and old.masajista_id is null and new.masajista_id is not null
     and new.estado is distinct from 'ofrecida'
     and coalesce(auth.uid()::text, '') <> new.masajista_id::text then
    select nombre into v_servicio from public.servicios where id = new.servicio_id;
    insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
    values (new.masajista_id, 'reserva_nueva', 'Reserva asignada',
            'Te han asignado la reserva ' || new.codigo,
            jsonb_build_object('reserva_id', new.id, 'evento', 'asignada', 'codigo', new.codigo,
              'servicio', v_servicio, 'fecha', new.fecha, 'hora', new.hora_inicio,
              'direccion', new.direccion_servicio));
  end if;

  -- Fase 11·A: la masajista ACEPTA la oferta → avisar a los admins.
  if TG_OP = 'UPDATE' and old.estado = 'ofrecida' and new.estado = 'aceptada' then
    insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
    select p.id, 'reserva_aceptada', 'Oferta aceptada',
           'La reserva ' || new.codigo || ' fue aceptada por la masajista',
           jsonb_build_object('reserva_id', new.id, 'evento', 'oferta_aceptada', 'codigo', new.codigo)
    from public.profiles p where p.role = 'admin';
  end if;

  -- Fase 11·A: la masajista RECHAZA la oferta → vuelve al pool; avisar a los admins.
  -- Solo cuando la rechaza la MASAJISTA (no cuando el admin la retira).
  if TG_OP = 'UPDATE' and old.estado = 'ofrecida' and new.estado = 'pendiente'
     and coalesce(auth.uid()::text, '') = old.masajista_id::text then
    insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
    select p.id, 'reserva_rechazada', 'Oferta rechazada',
           'La reserva ' || new.codigo || ' fue rechazada y vuelve a estar libre',
           jsonb_build_object('reserva_id', new.id, 'evento', 'oferta_rechazada', 'codigo', new.codigo,
             'motivo', new.rechazo_motivo)
    from public.profiles p where p.role = 'admin';
  end if;

  -- Avisos al CLIENTE por cambio de estado (confirmada / rechazada / cancelada).
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
end; $$;
