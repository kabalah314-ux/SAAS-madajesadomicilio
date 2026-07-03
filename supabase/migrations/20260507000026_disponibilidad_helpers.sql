-- =========================================================
-- FASE 11 · B1 — Disponibilidad real como ÚNICA fuente de verdad
-- Funciones que cruzan la tabla `disponibilidad` (horario semanal) con la
-- ocupación real. ESTRICTO: sin franja activa que cubra el hueco = NO disponible.
-- Las usan la clienta (NuevaReserva), el admin (picker de oferta) y el agente.
-- =========================================================

-- ¿La masajista M está libre y disponible para [fecha, hora, +duración]?
-- (1) tiene una franja ACTIVA ese día de la semana que cubre [hora, hora+dur]
-- (2) no solapa con una reserva ya tomada (aceptada/completada/ofrecida)
create or replace function public.masajista_disponible(
  p_masajista uuid, p_fecha date, p_hora time, p_dur int
) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.disponibilidad d
    where d.masajista_id = p_masajista
      and d.is_active = true
      and d.dia_semana = extract(dow from p_fecha)::int
      and p_hora >= d.hora_inicio
      and (p_hora + make_interval(mins => p_dur)) <= d.hora_fin
  )
  and not exists (
    select 1 from public.reservas r
    where r.masajista_id = p_masajista
      and r.estado in ('aceptada','completada','ofrecida')
      and r.fecha = p_fecha
      and (p_hora, p_hora + make_interval(mins => p_dur))
          overlaps (r.hora_inicio, r.hora_inicio + make_interval(mins => r.duracion_min))
  );
$$;

-- Masajistas verificadas/activas que pueden atender ESE servicio (por especialidad)
-- y están disponibles en [fecha, hora, +duración]. Devuelve sus ids.
create or replace function public.masajistas_disponibles(
  p_fecha date, p_hora time, p_dur int, p_servicio uuid
) returns setof uuid
language sql stable security definer set search_path = public
as $$
  select m.id
  from public.masajistas m
  join public.profiles p on p.id = m.id
  left join public.servicios s on s.id = p_servicio
  where m.is_verified = true and m.is_suspended = false and p.is_active = true
    and public.masajista_disponible(m.id, p_fecha, p_hora, p_dur)
    and (
      coalesce(array_length(m.especialidades, 1), 0) = 0
      or s.nombre is null
      or exists (select 1 from unnest(m.especialidades) e where s.nombre ilike '%' || e || '%')
    );
$$;

-- Horas (paso 30 min) de una fecha en las que hay AL MENOS una masajista
-- disponible para ese servicio (usa su duración). Para el selector de la clienta.
create or replace function public.horas_disponibles(
  p_fecha date, p_servicio uuid
) returns setof text
language plpgsql stable security definer set search_path = public
as $$
declare
  v_dur int;
  v_h   time;
begin
  select duracion_min into v_dur from public.servicios where id = p_servicio;
  if v_dur is null then v_dur := 60; end if;
  for v_h in
    select g::time
    from generate_series(timestamp '2000-01-01 07:00', timestamp '2000-01-01 22:00', interval '30 minutes') g
  loop
    if exists (select 1 from public.masajistas_disponibles(p_fecha, v_h, v_dur, p_servicio)) then
      return next to_char(v_h, 'HH24:MI');
    end if;
  end loop;
end;
$$;

grant execute on function public.masajista_disponible(uuid, date, time, int) to anon, authenticated;
grant execute on function public.masajistas_disponibles(date, time, int, uuid) to anon, authenticated;
grant execute on function public.horas_disponibles(date, uuid) to anon, authenticated;
