-- =========================================================
-- MASSFLOW · Agente (fase 1) — almacenamiento de interacciones
-- =========================================================
-- Guarda TODO lo que el agente habla con cada cliente, por cualquier
-- canal (teléfono/WhatsApp/test), para que el admin lo consulte y para
-- análisis futuro. Las Edge Functions (service_role) escriben; el admin
-- lee vía RLS.

-- Una fila por conversación (llamada/chat).
create table if not exists public.agente_conversaciones (
  id           uuid primary key default gen_random_uuid(),
  canal        text not null default 'test',      -- 'telefono' | 'whatsapp' | 'test'
  telefono     text,                              -- caller ID de quien llama
  cliente_id   uuid references public.clientes(id) on delete set null,
  estado       text not null default 'activa',    -- 'activa' | 'finalizada'
  resultado    text,                              -- 'reserva' | 'consulta' | 'info' | 'recado' | 'transferida' | 'sin_resolver'
  resumen      text,                              -- resumen corto (para la lista del admin)
  reserva_id   uuid references public.reservas(id) on delete set null,  -- si se creó una reserva
  temas        text[] not null default '{}',      -- intents/temas (para análisis)
  num_mensajes int not null default 0,
  created_at   timestamptz not null default now(),
  ended_at     timestamptz
);
create index if not exists idx_agente_conv_created on public.agente_conversaciones(created_at desc);
create index if not exists idx_agente_conv_cliente on public.agente_conversaciones(cliente_id);
create index if not exists idx_agente_conv_telefono on public.agente_conversaciones(telefono);

-- Transcripción: una fila por turno/mensaje.
create table if not exists public.agente_mensajes (
  id              uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.agente_conversaciones(id) on delete cascade,
  rol             text not null,                  -- 'cliente' | 'agente' | 'sistema'
  contenido       text not null,
  metadata        jsonb not null default '{}',    -- p.ej. herramienta usada + argumentos + resultado
  created_at      timestamptz not null default now()
);
create index if not exists idx_agente_msg_conv on public.agente_mensajes(conversacion_id, created_at);

-- Mantener num_mensajes al día.
create or replace function public.agente_bump_msg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.agente_conversaciones
  set num_mensajes = num_mensajes + 1
  where id = new.conversacion_id;
  return new;
end; $$;
drop trigger if exists trg_agente_bump_msg on public.agente_mensajes;
create trigger trg_agente_bump_msg after insert on public.agente_mensajes
  for each row execute function public.agente_bump_msg();

-- RLS: solo el admin ve/gestiona; las Edge Functions escriben con service_role (bypass RLS).
alter table public.agente_conversaciones enable row level security;
alter table public.agente_mensajes       enable row level security;

drop policy if exists "agente_conv_admin" on public.agente_conversaciones;
create policy "agente_conv_admin" on public.agente_conversaciones
  for all using ( public.is_admin() ) with check ( public.is_admin() );

drop policy if exists "agente_msg_admin" on public.agente_mensajes;
create policy "agente_msg_admin" on public.agente_mensajes
  for all using ( public.is_admin() ) with check ( public.is_admin() );
