-- =========================================================
-- MASSFLOW · RLS para el modelo "marketplace" de solicitudes
-- =========================================================
-- Problema: la política original solo dejaba a la masajista ver/editar
-- reservas YA asignadas a ella. Por eso nunca veía las solicitudes abiertas
-- (pendientes sin asignar) ni podía aceptarlas.
--
-- Arreglo:
--  1) SELECT: una masajista también ve las reservas 'pendiente' sin asignar.
--  2) UPDATE: una masajista puede "coger" una solicitud abierta, pero solo
--     puede asignársela A SÍ MISMA (with check masajista_id = auth.uid()).
-- =========================================================

drop policy if exists "reservas_select_visible" on public.reservas;
create policy "reservas_select_visible"
  on public.reservas for select
  using (
    cliente_id   = auth.uid()
    or masajista_id = auth.uid()
    or public.is_admin()
    or (public.is_masajista() and masajista_id is null and estado = 'pendiente')
  );

drop policy if exists "reservas_claim_open" on public.reservas;
create policy "reservas_claim_open"
  on public.reservas for update
  using ( public.is_masajista() and masajista_id is null and estado = 'pendiente' )
  with check ( masajista_id = auth.uid() );
