# 🗺️ ESTADO Y PLAN — Camino a MassFlow 100% funcional

> **Esta es la ÚNICA fuente de verdad del progreso.** Marca `[x]` al terminar cada tarea
> y apunta una línea en el **Diario** (al final). Trabaja las fases EN ORDEN.

**Leyenda de casillas:**
`[ ]` pendiente · `[x]` hecho y verificado · `[~]` empezado a medias · `[🔒]` bloqueado (necesita algo del usuario, ver Fase 0)

**Progreso global:** Fase 0 ✅ · Fase 1 ✅ · Fase 2 ✅ · Fase 3 ✅ · Fase 4 ✅ · Fase 5 🟦 (código listo, falta activar con tu cuenta Stripe) · Fase 6 ✅ · Fase 7 ✅ (solo queda repaso responsive móvil)
> Edge Functions desplegadas: `admin-actions`, `expire-reservas`. `create-checkout` y `stripe-webhook` escritas (sin desplegar, esperan claves Stripe). Cron `expire-reservas-cada-15min` activo. Proyecto `lzvbfmphtrhvrjjnvqtt`.
> **Estado:** app FUNCIONAL end-to-end y verificada EN VIVO. Lo único que falta para cobrar online es **activar Stripe** ([`05_STRIPE.md`](05_STRIPE.md)); todo lo demás opera sin él.
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
- [~] **7.4** Responsive: la maqueta usa grids/flex responsive de Tailwind; **pendiente un repaso fino** en móvil real (único pendiente menor del proyecto).
- [x] **7.5** **Verificación end-to-end EN VIVO** completada: flujo nuclear (clienta→masajista→admin→notificación) + las 10 tareas de Fase 4 verificadas contra la BD real con RLS. Scripts en el scratchpad de la sesión.

---

## FASE 8 — Camino a VENDIBLE (auditoría 2026-06-30) 🔴

> Detalle completo en **[`06_VENDIBLE.md`](06_VENDIBLE.md)**. Una auditoría de readiness encontró que, aunque la app funciona, faltan **8 bloqueantes** para cobrar a un cliente (~4-6 días). Lo más urgente: **3 agujeros de seguridad RLS explotables HOY**.

- [ ] **B1** Verificación masajistas (admin ve/aprueba docs + `is_verified` por Edge Function) + trigger anti-auto-verificación
- [ ] **B2** RLS `reservas` con `WITH CHECK` + trigger (congelar importes/identidad para no-admin) + calcular importes en BD
- [ ] **B3** Fuga PII entre clientas: añadir `is_masajista()` a la política `clientes_select`
- [ ] **B4** La masajista carga y ve datos de contacto del cliente
- [ ] **B5** Notificar solicitudes abiertas (auto-asignación) a masajistas
- [ ] **B6** Capa legal RGPD (consentimiento datos de salud + Términos/Privacidad)
- [ ] **B7** Notificaciones por email transaccional (el bloqueante más caro)
- [ ] **B8** Navegación móvil (Sidebar → drawer + hamburguesa)
- [ ] Importantes: claim atómico de solicitudes, errores no silenciosos, overbooking, etc. (ver `06_VENDIBLE.md`)

> **Para SaaS replicable (no piloto):** multi-tenant + modelo de planes = semanas aparte.

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
- _(las siguientes entradas las añade quien trabaje)_
