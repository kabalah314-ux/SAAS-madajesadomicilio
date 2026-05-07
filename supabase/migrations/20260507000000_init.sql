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
