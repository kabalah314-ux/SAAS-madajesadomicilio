-- =============================================================
-- MASSFLOW · SETUP COMPLETO DE BASE DE DATOS (un solo archivo)
-- Generado juntando supabase/migrations/ en orden.
-- Pega TODO esto en Supabase → SQL Editor → Run.
-- =============================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- supabase/migrations/20260507000000_init.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =========================================================
-- MASSFLOW - INIT SCHEMA
-- =========================================================

-- Extensiones
create extension if not exists "pgcrypto";

-- =========================================================
-- ENUMS
-- =========================================================
create type user_role as enum ('admin', 'masajista', 'cliente');
create type reserva_estado as enum ('pendiente','aceptada','rechazada','completada','cancelada','expirada');
create type documento_estado as enum ('pendiente','verificado','rechazado');
create type transferencia_estado as enum ('pendiente','enviada','confirmada','fallida');
create type pago_estado as enum ('pendiente','pagado','reembolsado','fallido');
create type notificacion_tipo as enum (
  'reserva_nueva','reserva_aceptada','reserva_rechazada','reserva_cancelada',
  'documento_verificado','documento_rechazado','pago_recibido','valoracion_recibida','sistema'
);

-- =========================================================
-- TABLA: profiles
-- =========================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'cliente',
  full_name   text not null,
  email       text not null unique,
  phone       text,
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_profiles_role on public.profiles(role);
create index idx_profiles_active on public.profiles(is_active);

-- =========================================================
-- TABLA: masajistas
-- =========================================================
create table public.masajistas (
  id                  uuid primary key references public.profiles(id) on delete cascade,
  bio                 text,
  especialidades      text[] not null default '{}',
  zonas_cobertura     text[] not null default '{}',
  anos_experiencia    int not null default 0,
  iban                text,
  stripe_account_id   text unique,
  stripe_onboarding_completed boolean not null default false,
  rating_promedio     numeric(3,2) not null default 0,
  total_sesiones      int not null default 0,
  is_verified         boolean not null default false,
  is_suspended        boolean not null default false,
  suspension_reason   text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index idx_masajistas_verified on public.masajistas(is_verified);
create index idx_masajistas_suspended on public.masajistas(is_suspended);

-- =========================================================
-- TABLA: clientes
-- =========================================================
create table public.clientes (
  id                  uuid primary key references public.profiles(id) on delete cascade,
  direccion           text,
  ciudad              text,
  codigo_postal       text,
  preferencias        jsonb not null default '{}'::jsonb,
  pin_hash            text,
  is_blocked          boolean not null default false,
  block_reason        text,
  internal_notes      text,
  stripe_customer_id  text unique,
  total_reservas      int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- =========================================================
-- TABLA: servicios
-- =========================================================
create table public.servicios (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  descripcion  text,
  duracion_min int not null check (duracion_min > 0),
  precio_eur   numeric(10,2) not null check (precio_eur >= 0),
  is_active    boolean not null default true,
  orden        int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- =========================================================
-- TABLA: disponibilidad
-- =========================================================
create table public.disponibilidad (
  id            uuid primary key default gen_random_uuid(),
  masajista_id  uuid not null references public.masajistas(id) on delete cascade,
  dia_semana    int  not null check (dia_semana between 0 and 6),
  hora_inicio   time not null,
  hora_fin      time not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  check (hora_fin > hora_inicio)
);
create index idx_disponibilidad_masajista on public.disponibilidad(masajista_id);

-- =========================================================
-- TABLA: reservas
-- =========================================================
create sequence reserva_codigo_seq start 1000;

create table public.reservas (
  id                 uuid primary key default gen_random_uuid(),
  codigo             text unique not null default ('MF-' || lpad(nextval('reserva_codigo_seq')::text, 6, '0')),
  cliente_id         uuid not null references public.clientes(id) on delete restrict,
  masajista_id       uuid references public.masajistas(id) on delete set null,
  servicio_id        uuid not null references public.servicios(id) on delete restrict,
  fecha              date not null,
  hora_inicio        time not null,
  duracion_min       int  not null,
  direccion_servicio text not null,
  ciudad             text not null,
  codigo_postal      text,
  notas_cliente      text,
  estado             reserva_estado not null default 'pendiente',
  precio_total       numeric(10,2) not null,
  comision_pct       numeric(5,2)  not null,
  comision_monto     numeric(10,2) not null,
  pago_masajista     numeric(10,2) not null,
  pago_estado        pago_estado not null default 'pendiente',
  stripe_payment_intent_id text,
  rechazo_motivo     text,
  cancelacion_motivo text,
  cancelado_por      uuid references public.profiles(id),
  expira_en          timestamptz,
  aceptada_en        timestamptz,
  completada_en      timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index idx_reservas_cliente on public.reservas(cliente_id);
create index idx_reservas_masajista on public.reservas(masajista_id);
create index idx_reservas_fecha on public.reservas(fecha);
create index idx_reservas_estado on public.reservas(estado);

-- =========================================================
-- TABLA: valoraciones
-- =========================================================
create table public.valoraciones (
  id            uuid primary key default gen_random_uuid(),
  reserva_id    uuid not null unique references public.reservas(id) on delete cascade,
  cliente_id    uuid not null references public.clientes(id),
  masajista_id  uuid not null references public.masajistas(id),
  puntuacion    int not null check (puntuacion between 1 and 5),
  comentario    text,
  created_at    timestamptz not null default now()
);
create index idx_valoraciones_masajista on public.valoraciones(masajista_id);

-- =========================================================
-- TABLA: documentos
-- =========================================================
create table public.documentos (
  id            uuid primary key default gen_random_uuid(),
  masajista_id  uuid not null references public.masajistas(id) on delete cascade,
  tipo          text not null,
  storage_path  text not null,
  estado        documento_estado not null default 'pendiente',
  rechazo_motivo text,
  uploaded_at   timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid references public.profiles(id)
);
create unique index uq_documentos_masajista_tipo on public.documentos(masajista_id, tipo);

-- =========================================================
-- TABLA: ciclos_pago
-- =========================================================
create table public.ciclos_pago (
  id            uuid primary key default gen_random_uuid(),
  fecha_inicio  date not null,
  fecha_fin     date not null,
  is_closed     boolean not null default false,
  closed_at     timestamptz,
  created_at    timestamptz not null default now(),
  unique (fecha_inicio, fecha_fin),
  check (fecha_fin >= fecha_inicio)
);

-- =========================================================
-- TABLA: transferencias
-- =========================================================
create table public.transferencias (
  id              uuid primary key default gen_random_uuid(),
  ciclo_id        uuid not null references public.ciclos_pago(id) on delete restrict,
  masajista_id    uuid not null references public.masajistas(id) on delete restrict,
  monto_eur       numeric(10,2) not null,
  num_sesiones    int not null,
  estado          transferencia_estado not null default 'pendiente',
  stripe_transfer_id text,
  referencia      text,
  enviada_en      timestamptz,
  confirmada_en   timestamptz,
  notas           text,
  created_at      timestamptz not null default now(),
  unique (ciclo_id, masajista_id)
);

-- =========================================================
-- TABLA: notificaciones
-- =========================================================
create table public.notificaciones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  tipo        notificacion_tipo not null,
  titulo      text not null,
  mensaje     text not null,
  payload     jsonb not null default '{}'::jsonb,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index idx_notif_user_unread on public.notificaciones(user_id, is_read);

-- =========================================================
-- TABLA: configuracion
-- =========================================================
create table public.configuracion (
  clave       text primary key,
  valor       jsonb not null,
  descripcion text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id)
);

-- =========================================================
-- TABLA: pagos_stripe
-- =========================================================
create table public.pagos_stripe (
  id                       uuid primary key default gen_random_uuid(),
  reserva_id               uuid not null references public.reservas(id) on delete cascade,
  stripe_payment_intent_id text not null unique,
  stripe_charge_id         text,
  monto_eur                numeric(10,2) not null,
  estado                   pago_estado not null default 'pendiente',
  metodo                   text,
  raw_event                jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index idx_pagos_reserva on public.pagos_stripe(reserva_id);

-- =========================================================
-- TABLA: audit_log
-- =========================================================
create table public.audit_log (
  id          bigserial primary key,
  actor_id    uuid references public.profiles(id),
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  diff        jsonb,
  created_at  timestamptz not null default now()
);


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- supabase/migrations/20260507000001_rls.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =========================================================
-- HELPER FUNCTIONS
-- =========================================================
create or replace function public.current_role()
returns user_role
language sql stable security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select public.current_role() = 'admin';
$$;

create or replace function public.is_masajista()
returns boolean language sql stable as $$
  select public.current_role() = 'masajista';
$$;

create or replace function public.is_cliente()
returns boolean language sql stable as $$
  select public.current_role() = 'cliente';
$$;

-- =========================================================
-- ACTIVAR RLS
-- =========================================================
alter table public.profiles        enable row level security;
alter table public.masajistas      enable row level security;
alter table public.clientes        enable row level security;
alter table public.servicios       enable row level security;
alter table public.disponibilidad  enable row level security;
alter table public.reservas        enable row level security;
alter table public.valoraciones    enable row level security;
alter table public.documentos      enable row level security;
alter table public.ciclos_pago     enable row level security;
alter table public.transferencias  enable row level security;
alter table public.notificaciones  enable row level security;
alter table public.configuracion   enable row level security;
alter table public.pagos_stripe    enable row level security;
alter table public.audit_log       enable row level security;

-- =========================================================
-- PROFILES
-- =========================================================
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using ( auth.uid() = id or public.is_admin() );

create policy "profiles_update_own"
  on public.profiles for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id and role = (select role from public.profiles where id = auth.uid()) );

create policy "profiles_admin_all"
  on public.profiles for all
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- =========================================================
-- MASAJISTAS
-- =========================================================
create policy "masajistas_select_public"
  on public.masajistas for select
  using ( true );

create policy "masajistas_update_own"
  on public.masajistas for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

create policy "masajistas_admin_all"
  on public.masajistas for all
  using ( public.is_admin() );

-- =========================================================
-- CLIENTES
-- =========================================================
create policy "clientes_select_own_or_admin_or_assigned_masajista"
  on public.clientes for select
  using (
    auth.uid() = id
    or public.is_admin()
    or exists (
      select 1 from public.reservas r
      where r.cliente_id = clientes.id
        and r.masajista_id = auth.uid()
    )
  );

create policy "clientes_update_own"
  on public.clientes for update
  using ( auth.uid() = id ) with check ( auth.uid() = id );

create policy "clientes_admin_all"
  on public.clientes for all using ( public.is_admin() );

-- =========================================================
-- SERVICIOS
-- =========================================================
create policy "servicios_select_all"
  on public.servicios for select using ( is_active = true or public.is_admin() );

create policy "servicios_admin_write"
  on public.servicios for all using ( public.is_admin() ) with check ( public.is_admin() );

-- =========================================================
-- DISPONIBILIDAD
-- =========================================================
create policy "disp_select_all"
  on public.disponibilidad for select using ( true );

create policy "disp_owner_write"
  on public.disponibilidad for all
  using ( masajista_id = auth.uid() or public.is_admin() )
  with check ( masajista_id = auth.uid() or public.is_admin() );

-- =========================================================
-- RESERVAS
-- =========================================================
create policy "reservas_select_visible"
  on public.reservas for select
  using (
    cliente_id   = auth.uid()
    or masajista_id = auth.uid()
    or public.is_admin()
  );

create policy "reservas_insert_cliente"
  on public.reservas for insert
  with check ( cliente_id = auth.uid() and public.is_cliente() );

create policy "reservas_update_participants"
  on public.reservas for update
  using (
    cliente_id   = auth.uid()
    or masajista_id = auth.uid()
    or public.is_admin()
  );

create policy "reservas_delete_admin"
  on public.reservas for delete using ( public.is_admin() );

-- =========================================================
-- VALORACIONES
-- =========================================================
create policy "valoraciones_select_all"
  on public.valoraciones for select using ( true );

create policy "valoraciones_insert_cliente"
  on public.valoraciones for insert
  with check (
    cliente_id = auth.uid()
    and exists (
      select 1 from public.reservas r
      where r.id = valoraciones.reserva_id
        and r.cliente_id = auth.uid()
        and r.estado = 'completada'
    )
  );

-- =========================================================
-- DOCUMENTOS
-- =========================================================
create policy "documentos_owner_or_admin_select"
  on public.documentos for select
  using ( masajista_id = auth.uid() or public.is_admin() );

create policy "documentos_owner_insert"
  on public.documentos for insert
  with check ( masajista_id = auth.uid() );

create policy "documentos_owner_update_own"
  on public.documentos for update
  using ( masajista_id = auth.uid() and estado = 'pendiente' );

create policy "documentos_admin_all"
  on public.documentos for all using ( public.is_admin() );

-- =========================================================
-- CICLOS + TRANSFERENCIAS
-- =========================================================
create policy "ciclos_admin"
  on public.ciclos_pago for all using ( public.is_admin() ) with check ( public.is_admin() );

create policy "transfer_admin_all"
  on public.transferencias for all using ( public.is_admin() );

create policy "transfer_select_own"
  on public.transferencias for select
  using ( masajista_id = auth.uid() or public.is_admin() );

-- =========================================================
-- NOTIFICACIONES
-- =========================================================
create policy "notif_select_own"
  on public.notificaciones for select using ( user_id = auth.uid() );

create policy "notif_update_own"
  on public.notificaciones for update using ( user_id = auth.uid() );

-- =========================================================
-- CONFIGURACION
-- =========================================================
create policy "config_select_all"
  on public.configuracion for select using ( true );

create policy "config_admin_write"
  on public.configuracion for all using ( public.is_admin() ) with check ( public.is_admin() );

-- =========================================================
-- PAGOS_STRIPE
-- =========================================================
create policy "pagos_select_visible"
  on public.pagos_stripe for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.reservas r
      where r.id = pagos_stripe.reserva_id
        and (r.cliente_id = auth.uid() or r.masajista_id = auth.uid())
    )
  );

-- =========================================================
-- AUDIT LOG
-- =========================================================
create policy "audit_admin_only"
  on public.audit_log for select using ( public.is_admin() );


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- supabase/migrations/20260507000002_logic.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =========================================================
-- TRIGGER: handle_new_user
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role user_role;
  v_full_name text;
begin
  v_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'cliente');
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  insert into public.profiles (id, role, full_name, email, phone)
  values (new.id, v_role, v_full_name, new.email, new.raw_user_meta_data->>'phone');

  if v_role = 'cliente' then
    insert into public.clientes (id) values (new.id);
  elsif v_role = 'masajista' then
    insert into public.masajistas (id) values (new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- TRIGGER: updated_at
-- =========================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_profiles_updated   before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_masajistas_updated before update on public.masajistas for each row execute function public.set_updated_at();
create trigger trg_clientes_updated   before update on public.clientes for each row execute function public.set_updated_at();
create trigger trg_servicios_updated  before update on public.servicios for each row execute function public.set_updated_at();
create trigger trg_reservas_updated   before update on public.reservas for each row execute function public.set_updated_at();
create trigger trg_pagos_updated      before update on public.pagos_stripe for each row execute function public.set_updated_at();

-- =========================================================
-- TRIGGER: rating masajista
-- =========================================================
create or replace function public.recalc_rating_masajista()
returns trigger language plpgsql as $$
begin
  update public.masajistas m
  set rating_promedio = sub.avg_p,
      total_sesiones  = sub.cnt
  from (
    select masajista_id, round(avg(puntuacion)::numeric, 2) as avg_p, count(*) as cnt
    from public.valoraciones
    where masajista_id = new.masajista_id
    group by masajista_id
  ) sub
  where m.id = sub.masajista_id;
  return new;
end; $$;

create trigger trg_valoraciones_rating
  after insert on public.valoraciones
  for each row execute function public.recalc_rating_masajista();

-- =========================================================
-- TRIGGER: notificaciones
-- =========================================================
create or replace function public.notify_reserva_event()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' and new.masajista_id is not null then
    insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
    values (new.masajista_id, 'reserva_nueva', 'Nueva solicitud',
            'Tienes una nueva solicitud de reserva ' || new.codigo,
            jsonb_build_object('reserva_id', new.id));
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

create trigger trg_reservas_notify
  after insert or update on public.reservas
  for each row execute function public.notify_reserva_event();

-- =========================================================
-- VISTA: kpis_admin
-- =========================================================
create or replace view public.v_admin_kpis as
select
  (select count(*) from public.reservas where estado = 'completada' and date_trunc('month', fecha) = date_trunc('month', now())) as reservas_mes,
  (select coalesce(sum(precio_total),0) from public.reservas where estado='completada' and date_trunc('month',fecha)=date_trunc('month',now())) as ingresos_mes,
  (select coalesce(sum(comision_monto),0) from public.reservas where estado='completada' and date_trunc('month',fecha)=date_trunc('month',now())) as comisiones_mes,
  (select count(*) from public.masajistas where is_verified = true and is_suspended = false) as masajistas_activos,
  (select count(*) from public.clientes where is_blocked = false) as clientes_activos;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- supabase/migrations/20260507000003_storage.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =========================================================
-- BUCKETS
-- =========================================================
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- =========================================================
-- POLICIES: documentos
-- =========================================================
create policy "doc_owner_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documentos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

create policy "doc_owner_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "doc_owner_update"
  on storage.objects for update to authenticated
  using ( bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text );

-- =========================================================
-- POLICIES: avatars
-- =========================================================
create policy "avatars_public_read"
  on storage.objects for select using ( bucket_id = 'avatars' );

create policy "avatars_owner_write"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );

create policy "avatars_owner_update"
  on storage.objects for update to authenticated
  using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- supabase/migrations/20260507000004_seed.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =========================================================
-- CONFIGURACION INICIAL
-- =========================================================
insert into public.configuracion (clave, valor, descripcion) values
  ('comision_pct',         '25',                 'Porcentaje de comision de la plataforma'),
  ('precio_maximo_eur',    '200',                'Precio maximo permitido por servicio'),
  ('cancelacion_horas',    '24',                 'Horas minimas antes para cancelar sin penalizacion'),
  ('solicitud_timeout_min','60',                 'Minutos para que masajista responda solicitud'),
  ('moneda',               '"EUR"',              'Moneda principal'),
  ('iva_pct',              '21',                 'IVA aplicado'),
  ('soporte_email',        '"soporte@massflow.app"', 'Email de soporte')
on conflict (clave) do nothing;

-- =========================================================
-- SERVICIOS DEMO
-- =========================================================
insert into public.servicios (nombre, descripcion, duracion_min, precio_eur, orden) values
  ('Masaje Relajante 60 min',    'Masaje sueco enfocado en relajacion', 60,  55.00, 1),
  ('Masaje Descontracturante 60','Trabajo profundo de tensiones',       60,  65.00, 2),
  ('Masaje Deportivo 60 min',    'Pre/post entreno',                    60,  70.00, 3),
  ('Masaje Pareja 90 min',       '2 masajistas simultaneos',            90, 140.00, 4),
  ('Drenaje Linfatico 75 min',   'Tecnica suave de drenaje',            75,  80.00, 5);


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- supabase/migrations/20260507000005_security.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- =========================================================
-- MASSFLOW - SECURITY HARDENING
-- =========================================================
-- Evita la escalada de privilegios en el auto-registro:
-- aunque alguien envíe role='admin' en la metadata del signUp,
-- el trigger lo fuerza a 'cliente'. Los admin SOLO se crean
-- por SQL directo o por la Edge Function admin-actions (que ya
-- verifica que el llamante es admin).
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role user_role;
  v_full_name text;
begin
  -- Solo se permiten 'cliente' o 'masajista' desde el auto-registro.
  -- Cualquier otro valor (incluido 'admin') cae a 'cliente'.
  v_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'cliente');
  if v_role not in ('cliente', 'masajista') then
    v_role := 'cliente';
  end if;

  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  insert into public.profiles (id, role, full_name, email, phone)
  values (new.id, v_role, v_full_name, new.email, new.raw_user_meta_data->>'phone');

  if v_role = 'cliente' then
    insert into public.clientes (id) values (new.id);
  elsif v_role = 'masajista' then
    insert into public.masajistas (id) values (new.id);
  end if;

  return new;
end;
$$;

-- El trigger on_auth_user_created ya existe (migración _logic);
-- esta redefinición de la función basta.

