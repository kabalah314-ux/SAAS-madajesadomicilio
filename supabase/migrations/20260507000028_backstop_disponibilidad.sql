-- =========================================================
-- FASE 11 · B6 — Backstop en BD: no se puede confirmar/ofrecer una reserva a una
-- masajista FUERA de su disponibilidad (robustez de servidor, como el de overbooking).
-- Se separa "está en su horario" (semanal + excepciones, SIN mirar solapes) del
-- chequeo de ocupación, para poder usarlo en el trigger sin autoconflicto.
-- =========================================================

-- ¿La fecha/hora cae dentro del horario de la masajista? (bloqueo manda; extra abre;
-- si no, el semanal). NO comprueba solapes (de eso ya se encarga el overbooking).
create or replace function public.masajista_en_horario(
  p_masajista uuid, p_fecha date, p_hora time, p_dur int
) returns boolean
language sql stable security definer set search_path = public
as $$
  select
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
      exists (
        select 1 from public.disponibilidad_excepciones x
        where x.masajista_id = p_masajista and x.fecha = p_fecha and x.tipo = 'extra'
          and p_hora >= coalesce(x.hora_inicio, time '00:00')
          and (p_hora + make_interval(mins => p_dur)) <= coalesce(x.hora_fin, time '23:59')
      )
      or exists (
        select 1 from public.disponibilidad d
        where d.masajista_id = p_masajista and d.is_active = true
          and d.dia_semana = extract(dow from p_fecha)::int
          and p_hora >= d.hora_inicio
          and (p_hora + make_interval(mins => p_dur)) <= d.hora_fin
      )
    );
$$;

-- masajista_disponible = está en horario Y no solapa reserva activa.
create or replace function public.masajista_disponible(
  p_masajista uuid, p_fecha date, p_hora time, p_dur int
) returns boolean
language sql stable security definer set search_path = public
as $$
  select public.masajista_en_horario(p_masajista, p_fecha, p_hora, p_dur)
    and not exists (
      select 1 from public.reservas r
      where r.masajista_id = p_masajista
        and r.estado in ('aceptada','completada','ofrecida')
        and r.fecha = p_fecha
        and (p_hora, p_hora + make_interval(mins => p_dur))
            overlaps (r.hora_inicio, r.hora_inicio + make_interval(mins => r.duracion_min))
    );
$$;

-- Backstop: al ASIGNAR/OFRECER/CONFIRMAR (estado aceptada u ofrecida con masajista),
-- exigir que esté en su horario. Se comprueba solo cuando entra en ese compromiso o
-- cambian los datos relevantes (NO en aceptada→completada ni al cancelar, para no
-- romper reservas históricas). Aplica a todos los actores (estricto).
create or replace function public.reservas_check_disponibilidad()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.masajista_id is not null
     and new.estado in ('aceptada','ofrecida')
     and (
       TG_OP = 'INSERT'
       or new.estado       is distinct from old.estado
       or new.masajista_id is distinct from old.masajista_id
       or new.fecha        is distinct from old.fecha
       or new.hora_inicio  is distinct from old.hora_inicio
       or new.duracion_min is distinct from old.duracion_min
     )
  then
    if not public.masajista_en_horario(new.masajista_id, new.fecha, new.hora_inicio, new.duracion_min) then
      raise exception 'La masajista no tiene disponibilidad para esa fecha/hora (fuera de su horario o día bloqueado).';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_reservas_check_disponibilidad on public.reservas;
create trigger trg_reservas_check_disponibilidad
  before insert or update on public.reservas
  for each row execute function public.reservas_check_disponibilidad();
