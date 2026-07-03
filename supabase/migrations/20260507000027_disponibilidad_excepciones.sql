-- =========================================================
-- FASE 11 · C — Excepciones de disponibilidad por FECHA concreta
-- El horario semanal (Bloque B) es la base recurrente. Encima:
--  · bloqueo: marca una fecha (o franja de esa fecha) como NO disponible
--  · extra:   añade disponibilidad en una fecha que no es su día habitual
-- =========================================================

create table if not exists public.disponibilidad_excepciones (
  id           uuid primary key default uuid_generate_v4(),
  masajista_id uuid not null references public.masajistas(id) on delete cascade,
  fecha        date not null,
  tipo         text not null check (tipo in ('bloqueo','extra')),
  hora_inicio  time,   -- null = día completo (para bloqueo) / desde el principio (extra)
  hora_fin     time,
  motivo       text,
  created_at   timestamptz not null default now(),
  check (hora_inicio is null or hora_fin is null or hora_fin > hora_inicio)
);
create index if not exists idx_disp_exc_masajista_fecha
  on public.disponibilidad_excepciones(masajista_id, fecha);

alter table public.disponibilidad_excepciones enable row level security;

-- La masajista gestiona las suyas; el admin puede ver/gestionar todas.
drop policy if exists "disp_exc_owner_admin" on public.disponibilidad_excepciones;
create policy "disp_exc_owner_admin" on public.disponibilidad_excepciones
  for all
  using (masajista_id = auth.uid() or public.is_admin())
  with check (masajista_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------
-- C2 · masajista_disponible extendida con las excepciones (misma firma → propaga
-- solo a clienta/admin/agente/pool, que ya la usan como fuente única de verdad).
-- Orden: (1) ¿bloqueo que cubra la hora? → NO. (2) ¿extra que cubra [hora,hora+dur]?
-- → SÍ. (3) si no, el horario SEMANAL. (4) en todo caso, sin solapar reserva activa.
-- ---------------------------------------------------------
create or replace function public.masajista_disponible(
  p_masajista uuid, p_fecha date, p_hora time, p_dur int
) returns boolean
language sql stable security definer set search_path = public
as $$
  select
    -- (1) ningún bloqueo de esa fecha que cubra la hora pedida
    not exists (
      select 1 from public.disponibilidad_excepciones x
      where x.masajista_id = p_masajista and x.fecha = p_fecha and x.tipo = 'bloqueo'
        and (
          x.hora_inicio is null
          or (p_hora, p_hora + make_interval(mins => p_dur))
             overlaps (x.hora_inicio, coalesce(x.hora_fin, time '23:59'))
        )
    )
    and (
      -- (2) un 'extra' de esa fecha cubre [hora, hora+dur]
      exists (
        select 1 from public.disponibilidad_excepciones x
        where x.masajista_id = p_masajista and x.fecha = p_fecha and x.tipo = 'extra'
          and p_hora >= coalesce(x.hora_inicio, time '00:00')
          and (p_hora + make_interval(mins => p_dur)) <= coalesce(x.hora_fin, time '23:59')
      )
      -- (3) o el horario SEMANAL cubre la hora
      or exists (
        select 1 from public.disponibilidad d
        where d.masajista_id = p_masajista and d.is_active = true
          and d.dia_semana = extract(dow from p_fecha)::int
          and p_hora >= d.hora_inicio
          and (p_hora + make_interval(mins => p_dur)) <= d.hora_fin
      )
    )
    -- (4) y no solapa con una reserva ya tomada
    and not exists (
      select 1 from public.reservas r
      where r.masajista_id = p_masajista
        and r.estado in ('aceptada','completada','ofrecida')
        and r.fecha = p_fecha
        and (p_hora, p_hora + make_interval(mins => p_dur))
            overlaps (r.hora_inicio, r.hora_inicio + make_interval(mins => r.duracion_min))
    );
$$;
