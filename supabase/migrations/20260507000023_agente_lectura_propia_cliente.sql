-- =========================================================
-- MASSFLOW · La clienta puede LEER su propia conversación con el agente
-- =========================================================
-- Antes, `agente_conversaciones`/`agente_mensajes` solo las leía el admin (`is_admin()`),
-- así que el chat de la clienta (FC2) guardaba el historial únicamente en memoria del
-- navegador → al recargar o cerrar la pestaña, se perdía el contexto visual (el agente en
-- el servidor SÍ recordaba la conversación, la app nunca la volvía a pedir).
-- Se añaden políticas de SOLO LECTURA, aditivas (no tocan las de admin ni las de escritura,
-- que siguen siendo admin/service_role únicamente): una clienta puede leer sus PROPIAS
-- conversaciones y mensajes, nunca los de otra. Sin recursión: solo comparan
-- cliente_id/conversacion_id, sin tocar profiles ni is_admin().

drop policy if exists "agente_conv_select_own_cliente" on public.agente_conversaciones;
create policy "agente_conv_select_own_cliente" on public.agente_conversaciones
  for select using (cliente_id = auth.uid());

drop policy if exists "agente_msg_select_own_cliente" on public.agente_mensajes;
create policy "agente_msg_select_own_cliente" on public.agente_mensajes
  for select using (
    exists (
      select 1 from public.agente_conversaciones c
      where c.id = agente_mensajes.conversacion_id
        and c.cliente_id = auth.uid()
    )
  );
