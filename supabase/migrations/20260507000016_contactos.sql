-- =========================================================
-- MASSFLOW · Contactos (perfiles de cliente internos, sin login)
-- =========================================================
-- El negocio atiende a gente que NO se registra en la app (llaman/WhatsApp).
-- Se guardan como "contactos" (desacoplados de auth). Una reserva puede ser
-- de un cliente registrado (cliente_id) O de un contacto (contacto_id).

create table if not exists public.contactos (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  telefono      text,
  email         text,
  direccion     text,
  barrio        text,
  ciudad        text,
  codigo_postal text,
  notas         text,
  preferencias  jsonb not null default '{}'::jsonb,
  origen        text not null default 'agente',  -- 'agente' | 'admin' | 'whatsapp' | 'telefono'
  cliente_id    uuid references public.clientes(id) on delete set null, -- si luego se registra
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_contactos_telefono on public.contactos(telefono);

create trigger trg_contactos_updated before update on public.contactos
  for each row execute function public.set_updated_at();

-- --- reservas: cliente_id O contacto_id (exactamente uno) ------------
alter table public.reservas alter column cliente_id drop not null;
alter table public.reservas add column if not exists contacto_id uuid references public.contactos(id) on delete set null;
alter table public.reservas drop constraint if exists reservas_cliente_o_contacto;
alter table public.reservas add constraint reservas_cliente_o_contacto
  check ( (cliente_id is not null)::int + (contacto_id is not null)::int = 1 );

-- --- notify: solo avisa in-app/email al cliente REGISTRADO -----------
-- (a los contactos se les avisa por WhatsApp/teléfono vía el agente).
create or replace function public.notify_reserva_event()
returns trigger language plpgsql security definer set search_path = public as $$
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
end; $$;

-- --- guard_update: congelar también contacto_id para no-admin ---------
create or replace function public.reservas_guard_update()
returns trigger language plpgsql security definer set search_path = public as $$
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
  if new.masajista_id is distinct from old.masajista_id then
    if not (old.masajista_id is null and new.masajista_id = v_uid) then
      new.masajista_id := old.masajista_id;
    end if;
  end if;
  if new.estado is distinct from old.estado then
    if v_uid = old.cliente_id then
      if new.estado <> 'cancelada' then raise exception 'La clienta solo puede cancelar la reserva'; end if;
    elsif v_uid = new.masajista_id then
      if new.estado not in ('aceptada','rechazada','completada','cancelada') then
        raise exception 'Transición de estado no permitida para la masajista'; end if;
    else
      raise exception 'No autorizado a cambiar el estado de la reserva';
    end if;
    if new.estado = 'cancelada' and new.cancelado_por is null then new.cancelado_por := v_uid; end if;
  end if;
  return new;
end; $$;

-- --- RLS contactos: admin gestiona; masajista ve el contacto de sus reservas ---
alter table public.contactos enable row level security;
drop policy if exists "contactos_admin" on public.contactos;
create policy "contactos_admin" on public.contactos
  for all using ( public.is_admin() ) with check ( public.is_admin() );
drop policy if exists "contactos_masajista_asignada" on public.contactos;
create policy "contactos_masajista_asignada" on public.contactos
  for select using (
    public.is_masajista()
    and exists (select 1 from public.reservas r where r.contacto_id = contactos.id and r.masajista_id = auth.uid())
  );
