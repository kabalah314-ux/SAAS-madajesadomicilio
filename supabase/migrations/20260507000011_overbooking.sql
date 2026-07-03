-- =========================================================
-- MASSFLOW · Anti-overbooking (importante de 2ª capa)
-- =========================================================
-- Impide que una masajista tenga DOS sesiones activas solapadas.
-- Se comprueba en BD (BEFORE INSERT/UPDATE) para que valga tanto al
-- reservar eligiéndola como al "coger" una solicitud (claim) — y para
-- que sea a prueba de carreras (dos aceptaciones casi simultáneas).
-- =========================================================

create or replace function public.reservas_check_overbooking()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Solo aplica cuando la reserva queda asignada y activa.
  if new.masajista_id is not null and new.estado in ('aceptada','completada') then
    if exists (
      select 1
      from public.reservas r
      where r.masajista_id = new.masajista_id
        and r.id <> new.id
        and r.fecha = new.fecha
        and r.estado in ('aceptada','completada')
        and (
          new.hora_inicio,
          new.hora_inicio + make_interval(mins => new.duracion_min)
        ) overlaps (
          r.hora_inicio,
          r.hora_inicio + make_interval(mins => r.duracion_min)
        )
    ) then
      raise exception 'La masajista ya tiene una sesión en ese horario (solapamiento).';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reservas_overbooking on public.reservas;
create trigger trg_reservas_overbooking
  before insert or update on public.reservas
  for each row execute function public.reservas_check_overbooking();
