# 🗺️ ESTADO Y PLAN — Camino a MassFlow 100% funcional

> **Esta es la ÚNICA fuente de verdad del progreso.** Marca `[x]` al terminar cada tarea
> y apunta una línea en el **Diario** (al final). Trabaja las fases EN ORDEN.

**Leyenda de casillas:**
`[ ]` pendiente · `[x]` hecho y verificado · `[~]` empezado a medias · `[🔒]` bloqueado (necesita algo del usuario, ver Fase 0)

**Progreso global:** Fase 0 ✅ · Fase 1 ✅ · Fase 2 ✅ · Fase 3 ✅ · Fase 4 ✅ · Fase 5 🟦 (código listo, falta activar con tu cuenta Stripe) · Fase 6 ✅ · Fase 7 ✅ (solo queda repaso responsive móvil) · Fase 8 ✅ (B1–B8 hechos; **email Resend ACTIVO en modo prueba**; textos legales borrador pendientes de revisión del negocio; Stripe opcional) · **DESPLEGADO en Vercel** (`saas-madajesadomicilio.vercel.app`) y revisado en móvil · **Fase 9 · Agente FASE A ✅** (agente OpenRouter + sección admin "Agente") · **FASE C ✅ v1** (pestaña "Análisis": KPIs, resultado/canal, temas, actividad). Fase 8 "importantes restantes" ✅ (2026-07-02: CORS allowlist, contraseña mín. 8, tsc 0 errores + CI). **SIGUIENTE: FASE 12 — correcciones de la revisión del usuario (2026-07-02), ver abajo** → después Fase 11 (consentimiento + disponibilidad) o Fase 9 · FASE B (WhatsApp + teléfono, [`08_AGENTE.md`](08_AGENTE.md)).
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
- [x] Importantes restantes: CORS `*` en Edge Functions, `tsc --noEmit` en CI, onboarding de masajista por `alert()` (ver `06_VENDIBLE.md`).

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

## FASE 10 — Pulido de perfil 🚧

- [x] **10.1 Foto de perfil en las 3 categorías — COMPLETO Y VERIFICADO** (2026-07-02). `uploadAvatar`
  (ya existía, genérico) enganchado en `MisDatos.tsx` (clienta) y en una nueva tarjeta "Mi Perfil" al
  principio de `Configuracion.tsx` (admin no tenía página propia). `Header.tsx` ya pintaba el avatar
  para cualquier rol — solo faltaba la UI de subida. Verificado en vivo (local y producción) con
  Playwright: sube foto real, se ve al instante en la página y en el Header, persiste tras recargar.
  Detalle en `09_TESTEO_MAESTRO.md · FC1`. Sin migraciones. Desplegado a Vercel.

- [x] **10.2 Chat con el agente desde la cuenta de la clienta — COMPLETO Y VERIFICADO** (2026-07-02).
  Nueva vista "Asistente" (menú + tarjeta en Inicio); Edge Function `agente` amplía su autorización a
  JWT de `role='cliente'` (canal `'app'`, `cliente_id` resuelto del JWT, nunca del body). Reservar por
  chat dispara el hilo completo (importes/notificaciones/Mis Reservas se refresca al instante). **2
  ataques probados y bloqueados:** secuestro de `conversation_id` ajeno (IDOR) y suplantación de rol
  (masajista→401). Runner `test_asistente_cliente.py` 16/16 + Playwright local y en producción.
  Detalle completo en `09_TESTEO_MAESTRO.md · FC2`. Desplegado (`agente` redeploy + frontend a Vercel).

---

## FASE 11 — Reparto con consentimiento + disponibilidad real 🚧 (PLANTEADO, sin construir)

> Diseño completo + matriz de impacto en **`09_TESTEO_MAESTRO.md · FC3`**. Decisiones del usuario:
> (1) coexisten pool abierto + oferta del admin; (2) si la masajista rechaza la oferta, vuelve al
> admin (a `pendiente`); (3) sin disponibilidad configurada = NO disponible (estricto).
> ⚠️ Implicación piloto: cada masajista real DEBE configurar su disponibilidad o no le entran reservas.

**Bloque A — Oferta con consentimiento (admin propone, masajista acepta):**
- [x] **A1** Añadir estado `ofrecida` al enum `reserva_estado` (migración aparte). → `_24_ofrecida_enum.sql`
- [x] **A2** `reservas_guard_update`: permitir `pendiente↔ofrecida` (admin) y `ofrecida→aceptada`/`ofrecida→pendiente` (masajista ofertada). → `_25` + cláusula RLS en `reservas_update_participants` WITH CHECK (el trigger sigue siendo el guardián).
- [x] **A3** `notify_reserva_event`: avisos de oferta / aceptación / rechazo-devolución al admin. → `_25` (ofrecer avisa a la masajista; aceptar/rechazar avisan a admins; N2 "asignada" excluye ofertas).
- [x] **A4** AppContext: `ofrecerReserva` (admin) + `aceptarOferta`/`rechazarOferta` (masajista); mantener el claim del pool.
- [x] **A5** UI admin (`GestionReservas`): "Asignar" → "Ofrecer a…" (crea oferta, no confirma); estado `ofrecida` = "Oferta enviada / Esperando respuesta" + Retirar / Ofrecer a otra.
- [x] **A6** UI masajista (`Solicitudes`): sección "Ofertas para ti" con Aceptar/Rechazar (separada del pool abierto).

**Bloque B — Disponibilidad real:**
- [x] **B1** Helper "¿masajista disponible?" → funciones SQL `masajista_disponible` / `masajistas_disponibles` / `horas_disponibles` (migración `_26`, verificadas: lunes 09-13+16-19, martes vacío, estricto). Fuente ÚNICA de verdad, la usan clienta/admin/agente.
- [x] **B2** `consultar_huecos` (agente): cruza `disponibilidad` vía `masajistas_disponibles` (RPC). **Redeploy hecho**.
- [x] **B3** `NuevaReserva` (clienta): horas reales reactivas a la fecha (`getHorasDisponibles`) + paso 4 filtra masajistas por disponibilidad. **Verificado UI** (lunes 16 horas, martes "sin disponibilidad").
- [x] **B4** Picker del admin: al ofrecer, marca/deshabilita las no disponibles ese día/hora y que no dan ese servicio (**incluye 12.8**, `getMasajistasDisponibles`).
- [x] **B5** Pool abierto (`Solicitudes` vía `loadReservasMasajista`): filtra por la disponibilidad real de la propia masajista (estricto: sin disponibilidad → no ve nada).
- [x] **B7** (parcial) Aviso a la masajista sin disponibilidad en Mi Calendario ("No recibirás reservas"). ⚠️ Falta la **vista admin de quién no la tiene**.
- [ ] **B6** (opcional fase 2) Backstop en BD: trigger que impida confirmar fuera de disponibilidad.

**Bloque C — Excepciones de disponibilidad por fecha concreta:**
- [x] **C1** Tabla `disponibilidad_excepciones` (+ RLS: la masajista gestiona las suyas, admin lee/gestiona). Migración `_27`.
- [x] **C2** `masajista_disponible` extendida: bloqueo de fecha oculta (aunque el semanal diga que trabaja), extra abre un día no habitual, si no cae al semanal; siempre sin solapar. **Verificado** (bloqueo vacía el lunes, extra abre el martes 10-12). Como es la fuente única, propaga a clienta/admin/agente/pool solo.
- [x] **C3** UI en `Disponibilidad.tsx`: sección "Excepciones por fecha" (bloquear día/franja o añadir extra) + listado de próximas. **Verificado UI** (añadir+borrar, RLS OK, 0 errores). B5 refactorizado a la RPC para que las excepciones apliquen también al pool.

- [ ] **Verificación E2E** de la matriz R1–R8 (`09 · FC3`): parcial — verificado por piezas (R1 clienta horas reales ✅, R2 oferta no confirma ✅, R3/R4 aceptar/rechazar ✅, R5 clienta no acepta oferta ✅, R7 agente cruza disponibilidad ✅, R8 bloqueo/extra ✅). Falta una pasada E2E conjunta formal + R6 (backstop BD = B6, opcional).

---

## FASE 12 — Correcciones de la revisión del usuario (2026-07-02) 🔧 ← EMPEZAR POR AQUÍ

> El usuario probó la app (sobre todo en **móvil**) y reportó estos fallos/pulidos. Son lo
> PRIMERO a hacer (antes que Fase 11) porque varios son bugs visibles o funcionalidad rota.
> Trabaja tarea a tarea según `02_COMO_TRABAJAR.md`. Donde pone "verificar en móvil",
> usa el preview a 375px (`preview_resize`) o Playwright como en `09_TESTEO_MAESTRO.md`.
> ⚠️ Contexto de despliegue: los cambios de la Fase 8 del 2026-07-02 (CORS allowlist en
> `supabase/functions/_shared/cors.ts`, contraseña mínima 8, CI) están commiteados pero
> **las Edge Functions NO están redesplegadas ni el frontend re-subido a Vercel**. Lo que
> el usuario probó en producción es el código ANTERIOR. Tenlo en cuenta al reproducir bugs.

**Transversal (los 3 roles):**

- [x] **12.1 La campana de notificaciones no funciona / no navega (los 3 roles).** El usuario reporta que el botón de notificaciones "no funciona" en masajista y cliente, y que en admin al pulsar una notificación debería llevarte a la sección correspondiente. Hacer en `src/components/Header.tsx`:
  (a) **Investigar primero por qué "no funciona"** en masajista/cliente: abrir el preview en móvil (375px), entrar con `masajista@massflow.app` / `clienta@massflow.app` (pass `Test1234`) y pulsar la campana. Sospechas: el dropdown no se abre en móvil (z-index tapado por el drawer/backdrop de B8, o el botón queda fuera del área táctil), o sí abre pero pulsar una notificación solo la marca leída y no hace nada visible (parece "roto").
  (b) **Navegar al pulsar**: el contexto ya expone `navigate()` (cableado en Fase 7). Al pulsar una notificación: marcarla leída (ya se hace) + cerrar el dropdown + `navigate(destino)` según tipo y rol. Mapa de destinos: admin → `reserva_*`→'reservas', `documento_*`→'masajistas', resto→'dashboard'; masajista → `reserva_nueva`→'solicitudes', `reserva_cancelada`/`reserva_aceptada`→'calendario', `documento_*`→'documentacion'; clienta → `reserva_*`→'mis-reservas'. (Los nombres exactos de las vistas están en `src/App.tsx` — compruébalos antes, no los inventes.)
  (c) Verificar EN VIVO en los 3 roles (móvil y escritorio) que abre, navega y marca leída.

**Admin:**

- [x] **12.2 Cambiar el estado de una reserva debe ser fácil.** En `src/components/admin/GestionReservas.tsx` hoy no hay forma directa de cambiar el estado. Añadir en cada reserva (fila en escritorio / tarjeta en móvil, ver 12.4) un control de acciones según el estado actual: pendiente→(asignar/ofrecer, cancelar), confirmada→(completar, cancelar, reasignar), etc. Cancelar SIEMPRE pide motivo en modal y escribe `cancelacion_motivo` + `cancelado_por`. Ojo con el trigger `reservas_guard_update` (migración `..._08`): limita transiciones a no-admin, pero al admin le deja — si algo se bloquea, revisar el trigger, no quitarlo. Verificar EN VIVO cada transición.

- [x] **12.3 BUG: "Invitar masajista" no crea la masajista (ningún botón de esa acción funciona).** Reproducir EN LOCAL con la consola del navegador abierta: Accesos → rellenar email nuevo → Invitar (`src/components/admin/GestionAccesos.tsx` → `inviteMasajista` en AppContext → Edge Function `admin-actions` action `invite_masajista`). Pistas por orden de probabilidad: (1) mirar la respuesta HTTP de `admin-actions` en la pestaña Network — si es 400, el mensaje exacto (¿"email ya registrado"? ¿falla `generateLink`?); (2) el email automático está en modo prueba de Resend (solo entrega a la cuenta propia) pero eso NO debe impedir crear la cuenta — el flujo devuelve `action_link` igualmente y la UI lo muestra para copiar; si ni siquiera crea la cuenta, el fallo es anterior al email; (3) al REDESPLEGAR `admin-actions` con el nuevo CORS (`_shared/cors.ts`), añadir antes `http://localhost:5199` (puerto del preview del harness) a la allowlist o el panel local dejará de poder invocar las funciones. Arreglar, redesplegar `admin-actions` y verificar EN VIVO que la cuenta se crea (aparece en Accesos/Masajistas) y el enlace de invitación funciona (pantalla SetPassword).

- [x] **12.4 Móvil: Reservas (admin) como tarjetas, no tabla con scroll lateral.** En `src/components/admin/GestionReservas.tsx`, en móvil (`lg:hidden` / `hidden lg:block`, mismo patrón que el Sidebar de B8) sustituir la tabla por tarjetas apiladas con SOLO: nombre del cliente, masajista asignada (o "Sin asignar") y badge de estado. Al tocar la tarjeta → modal/drawer flotante con la información completa (servicio, fecha/hora, dirección, importes, notas) y las acciones de 12.2. Escritorio se queda con la tabla. Verificar a 375px: cero scroll horizontal.

- [x] **12.5 Móvil: Clientas (admin) igual que 12.4.** En `src/components/admin/GestionClientas.tsx`: tarjeta con nombre, nº de reservas y total pagado; al tocar → ficha completa flotante (el drawer que ya existe vale si funciona bien en móvil). ⚠️ El "total pagado" debe ser REAL: comprobar cómo se calcula `gasto_acumulado` en `mapClienta` (`src/AppContext.tsx`) — si sigue hardcodeado a 0, calcularlo sumando `precio_total` de las reservas completadas de esa clienta (el admin ya tiene todas las reservas cargadas en el contexto).

- [x] **12.6 BUG móvil: al salir de la app un momento y volver, los modales se cierran y se pierde lo escrito.** Pasa en todas las secciones del admin salvo Dashboard (y seguramente en el resto de roles). Causa probable: al recuperar el foco, Supabase refresca el token → `onAuthStateChange` en `src/hooks/useAuth.tsx` dispara (`TOKEN_REFRESHED`/`SIGNED_IN`) → `loadProfile` → `setProfile` con objeto nuevo → `AppContext` re-mapea `currentUser` → algún gate de carga o cambio de identidad desmonta la vista activa (y con ella el modal y su estado local). Arreglo sugerido: en `useAuth`, si el evento trae el MISMO `user.id` que ya tenemos, no volver a tocar `profile` ni `loading` (ignorar el evento); en `AppContext`, no recrear `currentUser` si `profile.id` no cambió. Verificar EN MÓVIL REAL o simulando: abrir el modal de editar masajista, cambiar de app ~10s, volver → el modal debe seguir abierto con el texto intacto. Probar también en Reservas y Configuración.

- [x] **12.7 BUG: Gestión de servicios no deja crear un servicio nuevo.** Reproducir en local: Servicios → Nuevo Servicio → rellenar → Crear (`src/components/admin/GestionServicios.tsx`, `createServicio` en AppContext). Sospechas: el guard `if (!formData.nombre || !formData.tipo)` bloquea si el select "tipo" quedó en '' (el tipo es un campo derivado que NO existe en la tabla — quizá el flujo de creación nunca se probó tras conectarlo); o el insert falla por RLS/columnas y el error no se muestra bien. Arreglar para que crear sea fácil (tipo opcional o con valor por defecto), mostrar el error real si Supabase falla, y verificar EN VIVO que el servicio nuevo aparece en el catálogo del admin, en NuevaReserva de la clienta **y que el agente lo ofrece** (la herramienta de info del agente lee la tabla `servicios` en vivo — probarlo en Agente → "Probar agente" preguntando por el servicio nuevo).

- [x] **12.8 El agente y el picker del admin deben respetar disponibilidad Y especialidad.** Esto ES la Fase 11 · Bloque B (B2/B4) — no lo dupliques, hazlo allí — pero el usuario añade un matiz que queda registrado aquí: al pedir cita ("mañana a las 12"), el agente solo debe dar el hueco si existe una masajista con esa franja en su `disponibilidad` **y que ofrezca ese tipo de masaje** (cruce con `especialidades`); y en el picker de asignación del admin solo deben salir masajistas que den ESE servicio concreto (además del filtro de disponibilidad de B4). → Añadido como requisito a B2/B4.

**Masajista:**

- [x] **12.9 Rediseño de Mi Calendario** (`src/components/masajista/MiCalendario.tsx`), de arriba a abajo:
  (1) **Calendario mensual**: una cuadrícula del mes con: puntito/marca pequeña en los días que tienen sesiones (confirmadas o pendientes de la masajista) y fondo/borde VERDE en los días en que tiene disponibilidad configurada (cruzar `dia_semana` de la tabla `disponibilidad` con los días del mes; si Fase 11·C está hecha, respetar también las excepciones por fecha). Navegación mes anterior/siguiente.
  (2) **Vista semanal (semana vigente)** debajo: por horas, mostrando sus franjas de disponibilidad y las sesiones de esa semana colocadas en su hora; flechas para semana anterior/siguiente. Los datos deben ser FIELES a la BD (disponibilidad real + reservas reales), no rangos inventados. Cuidado con el bug histórico de zona horaria al pintar días (usar fecha local, no `toISOString()`).
  (3) **Botón "Modificar horario"** debajo de la vista semanal → `navigate('disponibilidad')` (comprobar el nombre exacto de la vista en `App.tsx`).
  (4) **Lista de sesiones** al final, ordenadas de la más próxima a la más lejana: cada una con Aceptar / Rechazar si es una solicitud pendiente (reutilizar `aceptarSolicitud`/`rechazarSolicitud` con su claim atómico y el motivo de rechazo), o su badge de estado si ya está aceptada/completada/cancelada.
  Verificar EN VIVO como `masajista@massflow.app` en escritorio y móvil (375px, sin overflow), y pasar la regresión del flujo nuclear después (aceptar desde la nueva lista debe seguir funcionando).

- [ ] **12.10 Verificación final de la fase:** `npx tsc --noEmit` (0 errores), `npm run build`, regresión rápida de los 3 roles en vivo, y REDESPLEGAR: Edge Functions tocadas + frontend a Vercel (pedir permiso para `vercel --prod`). Actualizar el Diario y `00_LEEME_PRIMERO.md`.

---

## 📓 Diario de progreso (lo más nuevo arriba)

> Una línea por tarea terminada: `AAAA-MM-DD · tarea · qué se hizo · ¿compila/verificado?`

- 2026-07-03 · **FASE 11 · BLOQUE C (excepciones por fecha) — C1–C3 COMPLETO** · Tabla `disponibilidad_excepciones` + RLS (migración `_27`); `masajista_disponible` extendida (bloqueo manda sobre el semanal, extra abre un día no habitual, si no cae al semanal); UI "Excepciones por fecha" en `Disponibilidad.tsx` (bloquear día/franja o extra + lista con borrar). B5 refactorizado a la RPC `masajista_disponible` para que las excepciones apliquen también al pool (eliminado el espejo JS). · **Verificado**: C2 en BD (bloqueo vacía el lunes, extra abre el martes 10-12) + **E2E UI** (masajista añade y borra excepción, RLS OK, 0 errores) + tsc 0 + build OK. **FASE 11 (A+B+C) prácticamente cerrada**; quedan flecos: B7 vista admin, B6 backstop opcional, pasada E2E conjunta formal.
- 2026-07-03 · **FASE 11 · BLOQUE B (disponibilidad real) — B1–B5 + B7(parcial) + 12.8** · La disponibilidad de la masajista es ahora la ÚNICA fuente de verdad (estricto: sin franjas = no disponible). DB: migración `_26` con `masajista_disponible` / `masajistas_disponibles` / `horas_disponibles` (funciones SQL reutilizables). Front: clienta (`NuevaReserva`) muestra horas reales reactivas a la fecha + filtra masajistas del paso 4; admin (`GestionReservas`) el picker de oferta marca/deshabilita las no disponibles y que no dan ese servicio (12.8); pool de la masajista (`loadReservasMasajista`) filtra por su disponibilidad; aviso en Mi Calendario si no tiene disponibilidad. Agente (`consultar_huecos`) cruza disponibilidad vía la RPC — **Edge Function redesplegada**. · **Verificado**: funciones SQL (lunes 09-13/16-19, martes vacío) + **E2E UI clienta** (Playwright: lunes 16 horas, martes "sin disponibilidad", 0 errores) + tsc 0 + build OK. Pendiente: B7 vista admin de quién no tiene disponibilidad, B6 (backstop opcional), Bloque C (excepciones por fecha).
- 2026-07-03 · **FASE 11 · BLOQUE A (consentimiento) — A1–A7 COMPLETO** · El admin OFRECE (estado `ofrecida`) y la masajista acepta/rechaza. DB: migración `_24` (enum `ofrecida`) + `_25` (trigger `reservas_guard_update` permite el rechazo ofrecida→pendiente liberando la reserva; `notify_reserva_event` avisa oferta/aceptación/rechazo; cláusula RLS en `reservas_update_participants` WITH CHECK para que la masajista devuelva la reserva al pool). Front: `ofrecerReserva`/`aceptarOferta`/`rechazarOferta` en AppContext; `GestionReservas` "Ofrecer a…" + estado ofrecida (retirar/ofrecer a otra); `Solicitudes` sección "Ofertas para ti". A7: `ofrecida` no dispara overbooking (el trigger solo actúa en aceptada/completada). · **Verificado EN VIVO**: flujo DB ofrecer→rechazar→re-ofrecer→aceptar (clienta NO puede aceptar, 400) + **E2E por la UI** con Playwright (admin ofrece MF-001082 → "Oferta enviada" → masajista "Ofertas para ti" → acepta → `aceptada`), 0 errores consola, tsc 0 + build OK. Pendiente Bloque B (disponibilidad real, incl. 12.8) y C (excepciones).
- 2026-07-03 · **FASE 12 (8 de 10 tareas: 12.1–12.7 + 12.9)** · Diagnóstico multi-agente + implementación en la rama buena (main ya fusionado): 12.1 campana navega por rol (`Header.tsx`); 12.2 acciones de estado del admin (asignar/completar/reasignar/cancelar con motivo → `cancelacion_motivo`+`cancelado_por`) + 12.4 tarjetas móvil + drawer detalle (`GestionReservas.tsx`, `updateReserva` propaga campos, `types.ts`); 12.3 BUG invitar masajista = CORS 5199 (`_shared/cors.ts` + permitir localhost; **redesplegadas** admin-actions/agente/create-checkout); 12.5 gasto real de clientas (suma `precio_total` completadas en `loadAllClientas`/`mapClienta`) + tarjetas móvil; 12.6 modales ya no se cierran al volver a la app (ignora TOKEN_REFRESHED del mismo user en `useAuth.tsx` + no resetea vista en `AppContext`); 12.7 crear servicio (quitado `tipo` obligatorio + error real); 12.9 rediseño Mi Calendario (mensual con disponibilidad verde+puntos, semanal por horas con datos reales, fecha LOCAL sin `toISOString`, botón Modificar horario, lista con Aceptar/Rechazar). · **tsc 0 + build OK + Playwright 375px: 0 errores consola, 0 overflow, gasto 55€ real visible**. Pendiente: **12.8** (→ Fase 11·B) y **12.10** (redeploy frontend a Vercel, requiere permiso).
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
- 2026-07-02 · **FASE 12 creada (revisión del usuario)** · el usuario probó la app (sobre todo en móvil) y reportó 11 correcciones; escritas como tareas 12.1–12.10 con archivos, pistas y criterios de verificación (notificaciones rotas ×3 roles, estado de reserva fácil, BUG invitar masajista, tarjetas móvil en Reservas/Clientas, BUG modales pierden estado al cambiar de app, BUG crear servicio, agente+picker con disponibilidad/especialidad → Fase 11·B, rediseño Mi Calendario). Handoff (`00_LEEME_PRIMERO.md`) actualizado: siguiente paso = Fase 12. · n/a (solo docs)
- 2026-07-02 · **Fase 8 · Importantes restantes (cierra Fase 8)** · **CORS:** nuevo helper compartido `supabase/functions/_shared/cors.ts` (allowlist: dominio de Vercel + previews `saas-madajesadomicilio*.vercel.app` + localhost); aplicado en `admin-actions`, `agente` y `create-checkout` (antes `"*"`, y `admin-actions` ni siquiera ponía headers CORS en las respuestas reales, solo en el preflight). **Contraseña mínima 6→8:** `Login.tsx` (registro) y `SetPassword.tsx` (invitación/reset) suben a `minLength={8}`; quitado el `minLength` del campo de login (no debe bloquear a quien ya tenga una contraseña más corta de antes); y subido `password_min_length` a 8 en la config de Auth del proyecto vía Management API (el `minLength` del HTML es cosmético, esto es lo que de verdad lo exige). **Onboarding con `alert()`:** en vez de vestir el `alert()`, se retiró el modal "Crear masajista" (contraseña temporal) de `GestionMasajistas.tsx` — quedó redundante desde que `GestionAccesos.tsx` ya invita por email sin contraseña compartida a mano; se limpiaron `createMasajista` (AppContext + types) y el botón/lógica de creación del modal (ahora solo edita). **`tsc` en CI:** creado `src/vite-env.d.ts` (arreglaba 3 de los 26 errores — los de `ImportMeta.env`); limpiados los 23 restantes (imports/variables sin usar en `GestionMasajistas`/`Historial`/`MiCalendario`/`Solicitudes`, tipado de `formData.tipo` en `GestionServicios`, y `useState<Direccion>` explícito en `MisDatos` para los 7 `TS7006`); nuevo `.github/workflows/ci.yml` (`tsc --noEmit` + `npm run build` en push/PR). · **`tsc --noEmit`: 0 errores. `npm run build`: OK. Verificado EN VIVO** (login admin real, `Masajistas` sin botón "Nueva Masajista" + nota apuntando a Accesos, `Accesos` renderiza el formulario de invitación, sin errores de consola).
- _(las siguientes entradas las añade quien trabaje)_
