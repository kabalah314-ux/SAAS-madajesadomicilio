# 🗺️ ESTADO Y PLAN — Camino a MassFlow 100% funcional

> **Esta es la ÚNICA fuente de verdad del progreso.** Marca `[x]` al terminar cada tarea
> y apunta una línea en el **Diario** (al final). Trabaja las fases EN ORDEN.

**Leyenda de casillas:**
`[ ]` pendiente · `[x]` hecho y verificado · `[~]` empezado a medias · `[🔒]` bloqueado (necesita algo del usuario, ver Fase 0)

**Progreso global:** Fase 0 ✅ · Fase 1 ✅ · Fase 2 ✅ · Fase 3 ✅ · Fase 4 ✅ · Fase 5 🟦 (código listo, falta activar con tu cuenta Stripe) · Fase 6 ✅ · Fase 7 ✅ (solo queda repaso responsive móvil) · Fase 8 ✅ (B1–B8 hechos; **email Resend ACTIVO en modo prueba**; textos legales borrador pendientes de revisión del negocio; Stripe opcional) · **DESPLEGADO en Vercel** (`saas-madajesadomicilio.vercel.app`) y revisado en móvil · **Fase 9 · Agente FASE A ✅** (agente OpenRouter + sección admin "Agente") · **FASE C ✅ v1** (pestaña "Análisis": KPIs, resultado/canal, temas, actividad). **SIGUIENTE: Fase 9 · FASE B (WhatsApp + teléfono)** — ver [`08_AGENTE.md`](08_AGENTE.md).
> Edge Functions desplegadas: `admin-actions`, `expire-reservas`, `send-email` (Resend), `agente` (OpenRouter). `create-checkout`/`stripe-webhook` escritas sin desplegar (esperan Stripe). Cron `expire-reservas-cada-15min` activo. Proyecto `lzvbfmphtrhvrjjnvqtt`.
> **Estado:** app FUNCIONAL, testeada, DESPLEGADA. Ahora lo vivo es el **agente** (Fase 9). Handoff completo en [`00_LEEME_PRIMERO.md`](00_LEEME_PRIMERO.md).
_(actualiza esta línea cuando cierres una fase)_

> **Entorno EN VIVO (2026-06-30):** Supabase real conectado (`lzvbfmphtrhvrjjnvqtt`), app en `localhost:5173`. Usuarios de prueba: `admin@massflow.app` / `masajista@massflow.app` / `clienta@massflow.app`, todos con contraseña `Test1234`. La IA administra Supabase vía Management API (token del usuario; revocar al terminar).

---

## FASE 0 — Setup del entorno (lo hace EL USUARIO) 🔒

Sin esto, la app **no se puede ver funcionando** (el cliente Supabase revienta sin claves). El código se puede escribir igualmente; esto es para *ver* y *probar*. Guía detallada en [`03_SETUP_ENTORNO.md`](03_SETUP_ENTORNO.md).

- [x] **0.1** Proyecto Supabase creado (`lzvbfmphtrhvrjjnvqtt`).
- [x] **0.2** Migraciones aplicadas (las 6, incl. la 0006 de RLS de solicitudes). 14 tablas + seed OK.
- [x] **0.3** `.env` con URL + publishable key escrito por la IA. App arranca con datos reales.
- [x] **0.4** Admin creado de forma segura (`admin@massflow.app`, promovido por SQL; el auto-registro NO permite admin).
- [🔒] **0.5** (Para pagos, Fase 5) Crear cuenta Stripe y obtener claves de test.

---

## FASE 1 — Seguridad (CRÍTICO, lo primero) ✅

> Hoy cualquiera puede registrarse como **admin** desde el formulario público. Hay que cerrarlo.

- [x] **1.1** Quitar la opción "Admin" del formulario de registro público (`src/components/Login.tsx`). _(El selector ahora solo ofrece Cliente/Masajista.)_
- [x] **1.2** Endurecer `signUp` en `src/hooks/useAuth.tsx`: que el tipo y la implementación SOLO acepten `'cliente' | 'masajista'`. _(Firma `AuthCtx` y `signUp` ya no admiten `'admin'`.)_
- [x] **1.3** Reforzar en servidor: el trigger `handle_new_user` ignora cualquier `role='admin'` que venga en la metadata y lo fuerza a `'cliente'`. Migración nueva `..._06_security.sql`.
- [x] **1.4** Dejar `enable_confirmations` documentado en `03_SETUP_ENTORNO.md` (decisión del usuario: ON para producción). _(No se fuerza en código; documentado.)_

---

## FASE 2 — Saneamiento (modelo + código muerto) ✅

> Quitar lo que confunde, para que una IA menos capaz no se pierda.

- [x] **2.1** Borrar `src/mockData.ts` (código muerto, 0 imports) y `src/github_uploader.py` (script suelto que no es de la app).
- [x] **2.2** Borrar los componentes Stub huérfanos de `src/App.tsx` (`DisponibilidadStub`, `NuevaReservaStub`, `MisReservasStub`, `AdminDashboardStub`). Dejar solo `ClienteInicioStub` que sí se usa (y cablear sus botones en Fase 7).
- [x] **2.3** Unificar comisión: que TODA la UI lea `configuracion` del contexto en vez de 40%/60% hardcodeados (`Dashboard.tsx`, `Solicitudes.tsx`, `Historial.tsx`). _(Helper `pagoMasajistaPct`/`comisionPct` desde configuración.)_
- [x] **2.4** Documentar la decisión `cliente`/`clienta` en `04_REFERENCIA_TECNICA.md` y dejar el mapeo en UN solo punto robusto (no se renombra todo).
- [x] **2.5** Decisión capa de datos: **`AppContext.tsx` es la fuente única.** Se borró `src/services/` (era código muerto que duplicaba/confundía); su lógica útil se reimplementa en AppContext según se necesita.

---

## FASE 3 — Arreglar los 3 flujos rotos del negocio ✅

> Sin esto el negocio no funciona: la masajista no ve trabajo, la clienta no puede elegir, y los datos no llegan a las pantallas.

- [x] **3.1** **La masajista ve solicitudes.** Cargar reservas `pendiente` **sin asignar** (`masajista_id IS NULL`) filtradas por las zonas/especialidades de la masajista. Nueva función `loadSolicitudesMasajista()` en AppContext. _(Las reservas asignadas y las solicitudes se combinan en el estado.)_
- [x] **3.2** **Cargar el registro de la masajista logueada** (bio, especialidades, zonas, documentos, rating, total_sesiones, iban) dentro de `currentUser`/estado, para que MiPerfil, Documentación y estadísticas dejen de salir vacías. Nueva función `loadMiPerfilMasajista()`.
- [x] **3.3** **Cargar masajistas para la clienta** (las verificadas y activas) para que el paso "elegir masajista" de `NuevaReserva` funcione.
- [x] **3.4** **Mapear `reserva.valoracion`** en `mapReserva` (traer la valoración desde la BD) para historial y MisReservas.
- [x] **3.5** **`createReserva` honesto:** hacer el insert `await`, leer el `codigo` REAL que genera la BD y devolver ese (no inventar `MF-AAAA-001` en cliente). Refrescar desde Supabase.
- [x] **3.6** **RLS de solicitudes (descubierto en la verificación en vivo):** las políticas de `reservas` impedían a la masajista ver/coger solicitudes abiertas. Migración `..._06_rls_solicitudes.sql`: SELECT incluye pendientes sin asignar para masajistas; nueva policy de UPDATE para "coger" una solicitud asignándosela solo a sí misma. Verificado E2E.

---

## FASE 4 — Completar escrituras que hoy son "fachada" 🚧

> Botones que dicen "guardado" pero no guardan, o que solo hacen `alert`.

- [x] **4.1** **MisDatos (clienta):** guarda nombre/apellidos/teléfono en `profiles` y preferencias en `clientes.preferencias` (jsonb); precarga con `loadMiPerfilClienta`. Verificado EN VIVO.
- [x] **4.2** **Configuración (admin):** persiste TODOS los campos vía upsert (comisión, precio, ciclo de pago, % Meta Ads, moneda). Confirmación real. Verificado EN VIVO.
- [x] **4.3** **Admin → Asignar masajista:** arreglado el filtro de zona (usa ciudad con match difuso; ya no bloquea). Verificado EN VIVO (MF-001000 asignada).
- [x] **4.4** **Admin → CRUD de servicios:** crear/editar/borrar/activar reales (`createServicio`/`updateServicio`/`deleteServicio`); `loadServicios` ya trae inactivos para el admin. Verificado EN VIVO.
- [x] **4.5** **Masajista → Documentación:** subida real a Storage (bucket `documentos`, ruta `<id>/<tipo>`) + upsert en tabla `documentos`; "Ver" con URL firmada; siempre se ven los 3 tipos. Verificado EN VIVO.
- [x] **4.6** **Masajista → Disponibilidad:** `getDisponibilidad`/`saveDisponibilidad` (reemplazo completo) sobre la tabla `disponibilidad`; carga al entrar. Verificado EN VIVO.
- [x] **4.7** **Admin → Transferencias:** marcar enviada/confirmar (`updateTransferencia`) y botón **"Cerrar ciclo"** → Edge Function `admin-actions` (`close_ciclo`) que genera transferencias. Verificado EN VIVO.
- [x] **4.8** **Cambiar contraseña** (sustituye al "cambiar PIN" falso): `changePassword` usa `supabase.auth.updateUser({ password })`; modal de PIN reemplazado. (Compila; no probado en vivo para no cambiar la pass de prueba.)
- [x] **4.9** **Admin → Suspender/activar masajista:** persiste `is_suspended` (y `activo` refleja `is_active && !is_suspended`). Verificado EN VIVO.
- [x] **4.10** **Admin → Crear masajista:** el submit en modo "crear" llama a `createMasajista` → Edge Function `admin-actions` (`create_user`) con contraseña temporal; luego rellena el perfil. Verificado EN VIVO.

---

## FASE 5 — Pagos con Stripe 🔒 (CÓDIGO LISTO; falta tu cuenta Stripe para activar)

> Guía de activación turnkey: **[`05_STRIPE.md`](05_STRIPE.md)**. Sin clave de Stripe el botón no aparece y la app funciona igual (reserva sin cobro online).

- [~] **5.1/5.2** Edge Functions escritas: `create-checkout` (Stripe Checkout) y `stripe-webhook` (marca pagado + `pagos_stripe`). **Falta desplegarlas con los secretos de Stripe.**
- [~] **5.3** Integrado en el frontend: botón **"Pagar online"** en *Mis Reservas* (solo visible si `VITE_STRIPE_PUBLISHABLE_KEY`), `crearCheckoutReserva` en AppContext, mapeo de `pago_estado`. Compila.
- [ ] **5.4** Pagos a masajistas (Stripe Connect) — v2; hoy se gestionan manualmente desde Admin → Transferencias.
- **Para activar:** seguir [`05_STRIPE.md`](05_STRIPE.md) (crear cuenta Stripe, claves, `supabase secrets set`, desplegar las 2 funciones, configurar webhook). No probado en vivo (sin cuenta).

---

## FASE 6 — Automatización del backend 🚧

- [x] **6.1** `expire-reservas` programada con **pg_cron** (cada 15 min, job `expire-reservas-cada-15min`) vía `net.http_post` a la Edge Function. Verificado (la función responde). Migración `..._07_cron.sql`.
- [x] **6.2** Generación de transferencias: **botón "Cerrar ciclo"** en Admin → Transferencias (Edge Function `close_ciclo`). Verificado EN VIVO. _(Auto-cron quincenal: opcional a futuro; el cierre manual ya funciona.)_

---

## FASE 7 — Pulido y verificación final 🚧

- [x] **7.1** Navegación real cableada (`navigate` en el contexto): CTAs de la home de la clienta, "Ver Mis Reservas", "Repetir", "Ver solicitudes". **Avatar:** la cámara de MiPerfil ahora **sube la foto de verdad** (`uploadAvatar` → bucket `avatars`, verificado EN VIVO). Botón muerto "Reportar" **eliminado**. (Sin stubs muertos.)
- [x] **7.2** Modo oscuro: **botón quitado** (hacerlo real exigiría reescribir todos los componentes con variantes `dark:`; no aporta y confundía).
- [x] **7.3** Empty states presentes en las vistas clave (EmptyState + estados de carga en formularios). _(No auditado exhaustivamente vista por vista.)_
- [x] **7.4** Responsive: **repaso completo en móvil (375px) hecho y verificado** — los 3 roles, ~15 vistas, todas sin desbordamiento horizontal (overflow 0). Nav drawer+hamburguesa OK; tablas admin con scroll horizontal interno; NuevaReserva multi-paso OK. Arreglado el botón flotante de Configuración (`pb-24`). Build OK.
- [x] **7.5** **Verificación end-to-end EN VIVO** completada: flujo nuclear (clienta→masajista→admin→notificación) + las 10 tareas de Fase 4 verificadas contra la BD real con RLS. Scripts en el scratchpad de la sesión.

---

## FASE 8 — Camino a VENDIBLE (auditoría 2026-06-30) 🔴

> Detalle completo en **[`06_VENDIBLE.md`](06_VENDIBLE.md)**. Una auditoría de readiness encontró que, aunque la app funciona, faltan **8 bloqueantes** para cobrar a un cliente (~4-6 días). Lo más urgente: **3 agujeros de seguridad RLS explotables HOY**.

- [x] **B1** Verificación de masajistas COMPLETA: (a) trigger anti-auto-verificación (congela `is_verified`/`is_suspended`/`rating_promedio`/`total_sesiones`/`stripe_*` para no-admin); (b) el admin ya **ve** los documentos (`loadAllMasajistas`/`mapMasajista` traen `documentos`), puede **abrirlos** (URL firmada, botón "Ver"), **aprobarlos** (botón "Verificar") y **verificar a la masajista** (`is_verified=true`, botón "Verificar masajista"). Se hace con update directo de admin (no hace falta Edge Function: el trigger ya bloquea a no-admin). Verificado EN VIVO + build OK.
- [x] **B2** RLS `reservas` con `WITH CHECK` + trigger `reservas_guard_update` (congela importes/identidad y limita transiciones de estado para no-admin) + `reservas_calc_importes` calcula importes en BD en INSERT. Verificado EN VIVO.
- [x] **B3** Fuga PII entre clientas: añadido `is_masajista()` a la rama EXISTS de `clientes_select`. Verificado EN VIVO.
- [x] **B4** La masajista ve nombre/teléfono del cliente de sus reservas **asignadas** (policy nueva en `profiles` + embed en la query; en solicitudes abiertas no se muestra contacto por privacidad). Verificado EN VIVO.
- [x] **B5** Una solicitud creada **sin asignar** notifica a las masajistas verificadas/activas (trigger `notify_reserva_event` ampliado). Verificado EN VIVO.
- [x] **B6** Capa legal RGPD (parte técnica): aceptación de **Términos/Privacidad** obligatoria en el registro (recordada con fecha+versión en `profiles`) y **consentimiento explícito de datos de salud** (Art. 9) al rellenar notas de salud en MisDatos (recordado en `clientes`). Textos en `src/legal.ts` (modal `LegalModal`). ⚠️ Los textos son **BORRADOR**: el negocio rellena sus datos y los revisa con asesoría legal. Verificado EN VIVO + build.
- [x] **B7** Email transaccional **ACTIVADO en modo prueba** (Resend). Función `send-email` desplegada (`--no-verify-jwt`, protegida por `WEBHOOK_SECRET`), secretos cargados (`RESEND_API_KEY`/`EMAIL_FROM`/`WEBHOOK_SECRET`), y trigger `trg_notif_send_email` que llama a la función vía pg_net en cada INSERT de `notificaciones`. Verificado E2E (trigger→función→Resend; email real entregado). **Falta solo para producción:** verificar un dominio en Resend y cambiar `EMAIL_FROM` (hoy `onboarding@resend.dev` solo entrega al email de la cuenta Resend). Ver [`07_EMAIL.md`](07_EMAIL.md).
- [x] **B8** Navegación móvil: el Sidebar es columna fija en escritorio (`hidden lg:block`) y **drawer deslizante + backdrop** en móvil, abierto por una **hamburguesa** en el Header (`lg:hidden`); al tocar un ítem navega y cierra el drawer. Verificado EN VIVO en viewport móvil (375px) con el navegador de preview.
- [x] **Claim atómico de solicitudes:** `aceptarSolicitud` hace un UPDATE con guarda `estado='pendiente' AND masajista_id IS NULL` y comprueba que afectó 1 fila; si no, avisa "ya la tomó otra". Verificado (el 1er claim gana, el 2º afecta 0 filas).
- [x] **Errores no silenciosos:** `updateReserva`/`updateClienta`/`updateMasajista`/`createValoracion`/`aceptarSolicitud` ahora leen `{error}` y lanzan; los handlers (Solicitudes, MiCalendario, MisDatos) hacen try/catch con aviso al usuario. Ya no se finge "guardado".
- [x] **"Olvidé mi contraseña":** enlace en el login → `supabase.auth.resetPasswordForEmail`.
- [x] **Anti-overbooking:** trigger `reservas_check_overbooking` (BEFORE INSERT/UPDATE) impide que una masajista tenga dos sesiones activas solapadas; vale al reservar eligiéndola y al coger una solicitud (a prueba de carreras). Verificado (solapada falla, adyacente pasa).
- [x] **Filtro de zona/especialidad en solicitudes:** `loadReservasMasajista` solo muestra las solicitudes abiertas que encajan con las especialidades y zonas de cobertura de la masajista (si no tiene configuradas, no filtra). Se persiste `barrio` en la reserva (migración `..._12`) para que el match de zona sea fiable.
- [ ] Importantes restantes: CORS `*` en Edge Functions, `tsc --noEmit` en CI, onboarding de masajista por `alert()` (ver `06_VENDIBLE.md`).

> **Para SaaS replicable (no piloto):** multi-tenant + modelo de planes = semanas aparte.

---

## FASE 9 — Agente conversacional (WhatsApp + teléfono) 🤖 EN DISEÑO

> **Plan completo: [`08_AGENTE.md`](08_AGENTE.md).** No se itera hasta cerrar el plan.
> Objetivo: agente que atiende clientes (texto/test → WhatsApp → teléfono), resuelve todo
> y **guarda cada conversación** (nueva sección admin "Agente") para consulta y análisis.
> Cerebro con **OpenRouter** (modelo barato). Identidad por teléfono + alta progresiva.

- [x] **A0–A6 FASE A COMPLETA Y VERIFICADA** (2026-07-01): tablas + `contactos` (clientes internos), Edge Function `agente` (OpenRouter + tools + logging + identidad por teléfono), sección admin "Agente" (lista + transcripción + "Probar agente"). E2E: cliente nuevo por texto → contacto + reserva creados y guardados; chat probado en vivo en la web desplegada. Detalle en `08_AGENTE.md`.
- [x] **FASE C · v1 COMPLETA Y VERIFICADA EN VIVO** (2026-07-01): pestaña **"Análisis"** en la sección admin Agente (`src/components/admin/AgenteAnalisis.tsx`). KPIs (tasa de reserva, % sin resolver, media de mensajes, nuevos vs conocidos), distribución por resultado/canal, temas más frecuentes, actividad por día; selector 7d/30d/todo. Todo en el cliente desde `agente_conversaciones` (sin migraciones). Verificado con preview MCP como admin. Build OK.
- **FASE B (pendiente):** conectar **WhatsApp** + **teléfono** (voz) como canales que llaman a la misma función. **Necesita del usuario:** número de WhatsApp (Twilio/Meta) y plataforma de voz + número de teléfono.

---

## 📓 Diario de progreso (lo más nuevo arriba)

> Una línea por tarea terminada: `AAAA-MM-DD · tarea · qué se hizo · ¿compila/verificado?`

- 2026-06-30 · **Harness creado** · estructura `harness/` + plan completo. · n/a
- 2026-06-30 · **Fase 1 (Seguridad)** · quitado registro admin del formulario (`Login.tsx`), `signUp` solo cliente/masajista (`useAuth.tsx`), migración `..._05_security.sql` que fuerza rol no-admin en el trigger. · compila + `npm run build` OK; pendiente probar en vivo.
- 2026-06-30 · **Fase 2 (Saneamiento)** · borrado `src/services/`, `src/mockData.ts`, `src/github_uploader.py` y 4 stubs huérfanos de `App.tsx`; comisión leída de `configuracion` en `Dashboard`/`Solicitudes`/`Historial`. · build OK.
- 2026-06-30 · **Fase 3 (Flujos rotos)** · AppContext: la masajista ahora ve solicitudes (pendientes sin asignar), se carga su perfil real (bio/zonas/docs/rating), se cargan masajistas para la clienta, se mapea `reserva.valoracion`, y `createReserva` es async y devuelve el código real de la BD. · build OK.
- 2026-06-30 · **Fase 0 (Entorno EN VIVO)** · Supabase real conectado, 6 migraciones aplicadas, 3 usuarios de prueba creados (admin/masajista/clienta, pass `Test1234`). · verificado.
- 2026-06-30 · **Fase 3.6 + verificación E2E** · test de flujo real (clienta reserva → masajista ve y acepta → admin lo ve → notificación) descubrió que la RLS bloqueaba las solicitudes; arreglado con migración `_06_rls_solicitudes.sql`. **Los 6 pasos del E2E pasan.** Fase 3 verificada EN VIVO. · ✅ verificado contra BD real.
- 2026-06-30 · **Fase 4 lote 1 (4.1, 4.2, 4.3, 4.8, 4.9)** · MisDatos guarda perfil+preferencias y precarga; Configuración persiste todo (upsert); asignar masajista arreglado (zona difusa por ciudad); cambiar contraseña real; suspender/activar persiste `is_suspended`. · build OK + **E2E verificado EN VIVO** (4.1/4.2/4.3/4.9). Falta lote 2: 4.4 servicios, 4.5 documentos(storage), 4.6 disponibilidad, 4.7 transferencias y 4.10 crear masajista (estas 2 requieren desplegar Edge Function).
- 2026-06-30 · **Fase 4 lote 2 (4.4, 4.5, 4.6, 4.7, 4.10) — FASE 4 COMPLETA** · CRUD servicios, subida de documentos a Storage, disponibilidad, transferencias+cerrar ciclo y crear masajista. Desplegadas las Edge Functions `admin-actions` y `expire-reservas` (sin Docker, vía CLI + token). · build OK + **E2E lote 2 verificado EN VIVO** (los 5 pasan).
- 2026-06-30 · **Fase 6 (Automatización)** · `expire-reservas` programada con pg_cron cada 15 min (extensiones pg_cron+pg_net creadas, job activo). Cierre de ciclo manual desde Admin. · verificado.
- 2026-06-30 · **Fase 7 (Pulido)** · navegación real (`navigate` en contexto) cableando los CTAs muertos; modo oscuro retirado. Build OK + **regresión del flujo nuclear EN VIVO** (MF-001002, 6/6). Quedan: repaso responsive fino y 2 stubs cosméticos (Reportar, cámara avatar). · ✅ verificado.
- 2026-06-30 · **Fase 5 (Stripe) código listo + Fase 7 pulido final** · Edge Functions `create-checkout`/`stripe-webhook` escritas; botón "Pagar online" con degradación elegante; guía `05_STRIPE.md`. Avatar: subida real a Storage (verificada EN VIVO); botón "Reportar" eliminado; perfil de masajista con guardado robusto. · build OK; Stripe pendiente de activar con cuenta del usuario.
- 2026-06-30 · **Fase 8 · 3 agujeros RLS (B1, B2, B3)** · migración `..._08_security_rls.sql`: trigger `masajistas_freeze_sensitive` (B1, anti auto-verificación/rating), triggers `reservas_calc_importes` (B2a, importes en BD desde servicio+config) y `reservas_guard_update` (B2b, congela dinero/identidad + limita estados) + `WITH CHECK` en `reservas_update_participants`, y `is_masajista()` en la rama EXISTS de `clientes_select` (B3). · **Verificado EN VIVO** simulando los ataques como cada rol (12/12 comprobaciones; ver `scratchpad/verify_rls.py`). Patrón de actor de confianza: admin o service_role (`auth.uid() IS NULL`) no se congelan. Pendiente de B1: verificación de docs por admin (paso 2). · ✅ verificado contra BD real.
- 2026-06-30 · **Fase 8 · B1 completo (verificación de masajistas)** · frontend: `loadAllMasajistas` hace join con `documentos` y `mapMasajista` los mapea (antes `[]`); nueva `verificarMasajista(id)` (update directo de admin, seguro por el trigger de B1); en `GestionMasajistas` el drawer lee la masajista viva del array y añade botones "Ver" (URL firmada), "Verificar" (doc) y "Verificar masajista" (`is_verified`), + aviso si no hay docs. · **Verificado EN VIVO** como admin (ve docs, aprueba doc, verifica masajista; rollback limpio) + `npm run build` OK.
- 2026-06-30 · **Fase 8 · B4 + B5** · migración `..._09_b4_b5_masajista_cliente.sql`: (B4) policy `profiles_select_assigned_masajista` para que la masajista lea el perfil de clientes de sus reservas asignadas; frontend embebe `clientes(profiles(full_name, phone))` en `loadReservasMasajista`, `mapReserva` lo expone como `cliente_nombre`/`cliente_telefono`, y `MiCalendario`/`Historial` lo muestran (antes buscaban en `clientas`, vacío en sesión de masajista). (B5) trigger `notify_reserva_event` ampliado: una reserva sin asignar notifica a las masajistas verificadas/activas. · **Verificado EN VIVO** (B4 3/3 con negativos; B5 1 notificación) + `npm run build` OK.
- 2026-06-30 · **Fase 8 · B8 (navegación móvil)** · `Sidebar` ahora es columna fija en escritorio (`hidden lg:block`) y **drawer deslizante + backdrop** en móvil (`lg:hidden`); `Header` lleva una **hamburguesa** (`lg:hidden`, prop `onMenuClick`); el estado `mobileMenuOpen` vive en `App.tsx`. Al tocar un ítem se navega y se cierra el drawer (`handleSelect`). El bloque de nombre/rol del Header se oculta en pantallas muy pequeñas. · **Verificado EN VIVO** en viewport móvil 375px (preview): hamburguesa→drawer→navegar→cierre; escritorio intacto. Build OK.
- 2026-06-30 · **Fase 8 · Robustez (claim atómico + errores no silenciosos) + "olvidé contraseña"** · `aceptarSolicitud` con claim atómico (guarda `estado=pendiente AND masajista_id IS NULL`, comprueba 1 fila); escrituras dejan de fingir éxito (leen `{error}` y lanzan) + try/catch en Solicitudes/MiCalendario/MisDatos; enlace de recuperar contraseña en Login. · build OK + claim verificado (1ª gana, 2ª 0 filas).
- 2026-06-30 · **Fase 8 · B6 (legal/RGPD)** · migración `..._10_legal_rgpd.sql` (columnas de aceptación de Términos en `profiles` y de consentimiento de salud en `clientes`; `handle_new_user` registra la aceptación). Front: `src/legal.ts` (textos BORRADOR + `LEGAL_VERSION`), `LegalModal`, casilla obligatoria de Términos en el registro, consentimiento de datos de salud en MisDatos con fecha+versión. · Verificado EN VIVO (columnas + escritura de consentimiento) + build OK.
- 2026-06-30 · **Fase 8 · B7 (email) código listo** · Edge Function `send-email` (Resend, plantilla HTML, degradación sin clave, no bloquea el flujo) + guía `07_EMAIL.md` (cuenta Resend → secretos → deploy → Database Webhook sobre `notificaciones`). · No desplegado (sin cuenta), como Stripe.
- 2026-06-30 · **Fase 8 · Importantes 2ª capa (overbooking + filtro zona/especialidad)** · migración `..._11_overbooking.sql` (trigger anti-solapamiento por masajista) y `..._12_reserva_barrio.sql` (columna `barrio`); `createReserva` persiste el barrio, `mapReserva` lo lee, y `loadReservasMasajista` filtra las solicitudes abiertas por especialidad (servicio↔especialidades) y zona (barrio/ciudad↔zonas_cobertura). · **Verificado EN VIVO** (overbooking: solapada falla / adyacente pasa) + build OK.
- 2026-06-30 · **Fase 8 · B7 email ACTIVADO (modo prueba)** · clave Resend del usuario cargada; función `send-email` desplegada vía CLI+token (`--no-verify-jwt --use-api`), protegida con `WEBHOOK_SECRET`; trigger `trg_notif_send_email` (pg_net `net.http_post`) en INSERT de `notificaciones`. Verificado: sin secreto→401, con secreto→Resend OK, trigger dispara la función, y **email real entregado** a la cuenta Resend. Falta dominio verificado para enviar a terceros. · ✅ verificado E2E.
- 2026-06-30 · **Fase 8 · Prueba E2E completa de TODAS las funcionalidades (30 checks, 3 roles + sistema)** · script `scratchpad/e2e_full.py` impersonando cada rol con RLS. Cazó y arregló 3 bugs reales (migración `..._13` + `..._14`): (1) **recursión infinita** en políticas de `profiles` (la policy de B4 + el subquery del with_check) → se usa `current_role()` y se quita `is_masajista()` redundante; (2) **rating no recalculaba** (el freeze de B1 congelaba `rating_promedio` para la clienta que valora) → el recálculo limpia temporalmente los claims JWT (auth.uid()→NULL, trusted) y restaura; (3) **overbooking bloqueaba marcar 'completada'** → el trigger solo revisa si cambian horario/asignación o la reserva pasa a activa. · **Resultado final: 30/30 PASS.**
- 2026-06-30 · **Testeo Batch 2 (integraciones) + email real E2E** · script `scratchpad/e2e_batch2.py`. Verificado EN VIVO: **expire-reservas** (Edge Function expira pendiente vieja + notifica), **close_ciclo** (admin-actions crea ciclo+transferencias; con JWT de admin real), **create_user/delete_user** (admin-actions crea y borra masajista), **Storage** (buckets documentos/avatars + RLS en storage.objects), **ruteo de cancelación** (masajista cancela → notifica al CLIENTE). Y **email real de extremo a extremo**: reserva→aceptación→notificación→**email entregado** por Resend a la bandeja real. Todo limpiado tras los tests (BD vuelve a 3 reservas). · **8/8 + email OK.**
- 2026-07-01 · **Despliegue Vercel + Fase 9 (agente) arrancada** · desplegado en `saas-madajesadomicilio.vercel.app` (env vars vía `.env.production`; Supabase auth con la URL de Vercel para reset de contraseña); web revisada en móvil real con Playwright (8 pantallas, 3 roles, overflow 0). · **Agente:** plan de diseño escrito (`08_AGENTE.md`), tablas `agente_conversaciones`/`agente_mensajes` creadas (migración `..._15`). LLM decidido: **OpenRouter**. Pendiente: decisión de alta de cliente nuevo + claves + construir. · deploy verificado; agente en diseño.
- 2026-07-01 · **Fase 9 · Agente FASE A COMPLETA** · migración `..._16` (tabla `contactos` = clientes internos sin auth; `reservas` acepta cliente O contacto). Edge Function `agente` desplegada (OpenRouter `gpt-4o-mini`, 7 herramientas, logging, identidad por teléfono). Sección admin `Agente.tsx` (lista + transcripción + "Probar agente") en menú/App. **Verificado en vivo**: conversación de texto creó contacto "Marta" + reserva MF-001046; chat probado en la web desplegada. Handoff para continuar en otra sesión escrito en `00_LEEME_PRIMERO.md`. · desplegado y verificado.
- 2026-07-01 · **Fase 9 · Agente FASE C (Análisis) v1** · nueva pestaña "Análisis" en la sección admin Agente (`src/components/admin/AgenteAnalisis.tsx`, tabs en `Agente.tsx`). Calcula en el cliente desde `agente_conversaciones` (sin migraciones/deps): KPIs (nº convs + media mensajes, tasa de reserva, % sin resolver, nuevos vs conocidos), barras por resultado y por canal, chips de temas más frecuentes, mini-barras de actividad por día, contadores de recados/transferencias; selector de período 7d/30d/todo + empty state. · **Verificado EN VIVO** (preview MCP, login admin → Agente → Análisis): 2 convs, tasa 50%, 4 secciones, período conmuta OK, sin overflow. `npm run build` OK.
- _(las siguientes entradas las añade quien trabaje)_
