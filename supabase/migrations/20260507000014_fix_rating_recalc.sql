-- =========================================================
-- MASSFLOW · Arreglar recálculo de rating frente al freeze de B1
-- =========================================================
-- El trigger de valoraciones recalcula rating_promedio/total_sesiones,
-- pero lo dispara la clienta (no-admin) y el trigger anti-auto-verificación
-- de B1 (masajistas_freeze_sensitive) congela esas columnas para no-admin.
-- Solución: el recálculo (función de confianza que calcula el valor REAL
-- desde valoraciones) limpia temporalmente los claims JWT → auth.uid() NULL
-- → B1 lo trata como contexto de servidor y permite el cambio. Se restauran
-- los claims al terminar. Una masajista NO puede abusar de esto: por la API
-- solo puede hacer un UPDATE directo (que sí congela B1); este camino es
-- exclusivo del trigger interno.
create or replace function public.recalc_rating_masajista()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_claims text;
begin
  v_claims := current_setting('request.jwt.claims', true);
  perform set_config('request.jwt.claims', '', true);  -- auth.uid() -> NULL

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

  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);  -- restaurar
  return new;
end; $$;
