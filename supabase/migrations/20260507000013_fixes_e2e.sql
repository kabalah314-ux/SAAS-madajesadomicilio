-- =========================================================
-- MASSFLOW · Arreglos encontrados por la batería E2E completa
-- =========================================================

-- --- C4: recursión infinita en las políticas de profiles -------------
-- La policy de B4 (profiles_select_assigned_masajista) llamaba a
-- is_masajista() y el with_check de profiles_update_own subconsultaba
-- profiles directamente → recursión. Se usa current_role() (security
-- definer) en el with_check y se quita la llamada redundante a
-- is_masajista() (el EXISTS sobre reservas ya garantiza que solo la
-- masajista asignada -cuyo uid es masajista_id- puede ver el perfil).
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id and role = public.current_role() );

drop policy if exists "profiles_select_assigned_masajista" on public.profiles;
create policy "profiles_select_assigned_masajista"
  on public.profiles for select
  using (
    exists (
      select 1 from public.reservas r
      where r.cliente_id = profiles.id
        and r.masajista_id = auth.uid()
    )
  );

-- --- C10: el recálculo de rating debe ser SECURITY DEFINER -----------
-- Lo dispara el INSERT de la clienta en valoraciones; sin definer, el
-- UPDATE sobre masajistas lo bloquea la RLS y el rating nunca cambia.
create or replace function public.recalc_rating_masajista()
returns trigger language plpgsql security definer set search_path = public as $$
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

-- --- M8: el anti-overbooking solo debe revisar cuando cambia el -------
-- horario/asignación o la reserva pasa a activa; no en transiciones
-- normales como aceptada -> completada (que no mueven la franja).
create or replace function public.reservas_check_overbooking()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.masajista_id is not null
     and new.estado in ('aceptada','completada')
     and (
       TG_OP = 'INSERT'
       or new.masajista_id is distinct from old.masajista_id
       or new.fecha       is distinct from old.fecha
       or new.hora_inicio is distinct from old.hora_inicio
       or new.duracion_min is distinct from old.duracion_min
       or old.estado not in ('aceptada','completada')
     ) then
    if exists (
      select 1 from public.reservas r
      where r.masajista_id = new.masajista_id
        and r.id <> new.id
        and r.fecha = new.fecha
        and r.estado in ('aceptada','completada')
        and (
          new.hora_inicio, new.hora_inicio + make_interval(mins => new.duracion_min)
        ) overlaps (
          r.hora_inicio, r.hora_inicio + make_interval(mins => r.duracion_min)
        )
    ) then
      raise exception 'La masajista ya tiene una sesión en ese horario (solapamiento).';
    end if;
  end if;
  return new;
end; $$;
