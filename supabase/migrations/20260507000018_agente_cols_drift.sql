-- =========================================================
-- MASSFLOW · Deriva de esquema (auditoría ronda 2) — columnas del agente
-- =========================================================
-- Las columnas `contacto_id` y `llm_messages` de `agente_conversaciones` se
-- añadieron EN VIVO durante la construcción del agente (Fase 9) pero nunca se
-- reflejaron en un fichero de migración. Un despliegue limpio desde migraciones
-- estaría roto (el código del agente las usa). Esta migración las declara de
-- forma idempotente para que el esquema de ficheros case con la BD real.

alter table public.agente_conversaciones
  add column if not exists contacto_id  uuid references public.contactos(id) on delete set null;

alter table public.agente_conversaciones
  add column if not exists llm_messages jsonb not null default '[]'::jsonb;

create index if not exists idx_agente_conv_contacto on public.agente_conversaciones(contacto_id);
