# 🏁 ¿Vendible ya? — Auditoría de production/commercial readiness (2026-06-30)

> Auditoría de 7 agentes (funcionalidad, seguridad, robustez, UX, comercial/legal, operaciones) + verificación directa del código. Esto es el **roadmap para poder cobrar a un cliente**.

## Veredicto

> **ACTUALIZACIÓN 2026-06-30:** los 8 bloqueantes están **resueltos a nivel de producto** (B1–B6 y B8 hechos y verificados en vivo; B7 con el código listo). Para encender el piloto en un negocio real solo queda lo que **depende del negocio**, no del código:
> 1. **Activar el email** (B7) con una cuenta Resend — guía `07_EMAIL.md` (~15 min).
> 2. **Revisar/rellenar los textos legales** (B6) con los datos del negocio y asesoría — `src/legal.ts`.
> 3. (Opcional) **Activar Stripe** si se quiere cobro online — `05_STRIPE.md`; si no, cobro manual/efectivo.
>
> Quedan "importantes" de robustez de segunda capa (overbooking, filtro de zona en solicitudes, CORS, `tsc` en CI) que conviene cerrar en las primeras semanas pero **no impiden el piloto**.

Veredicto original (histórico):
- ❌ **NO vendible hoy** a clientes reales tal cual.
- ✅ **Vendible como instalación a medida para UN negocio piloto** tras cerrar ~8 bloqueantes (**~4–6 días**), con cobro manual/efectivo.
- 🚫 **NO vendible como SaaS replicable** sin rediseño **multi-tenant** + modelo de planes (semanas).

La app funciona en el "camino feliz" (verificado en vivo), pero el recorrido completo tiene agujeros de seguridad, flujos rotos y cumplimiento legal.

---

## 🔴 BLOQUEANTES (impiden cobrar hoy)

| # | Bloqueante | Evidencia | Esfuerzo |
|---|-----------|-----------|----------|
| ~~**B1**~~ | ✅ **CERRADO** (verificado EN VIVO + build). Auto-verificación bloqueada (trigger `masajistas_freeze_sensitive`, `..._08_security_rls.sql`) **y** verificación admin operativa: `loadAllMasajistas`/`mapMasajista` traen `documentos`, el admin los abre (URL firmada), aprueba documentos y verifica a la masajista (`is_verified=true`) desde `GestionMasajistas` con `verificarMasajista`. Update directo de admin (el trigger ya protege a no-admin → no hizo falta Edge Function). | ~~`AppContext.tsx:336,780`~~ | ✅ |
| ~~**B2**~~ | ✅ **CERRADO** (`..._08_security_rls.sql`, verificado EN VIVO). `WITH CHECK` en `reservas_update_participants` + trigger `reservas_guard_update` (congela importes/identidad y limita estados para no-admin) + `reservas_calc_importes` calcula importes en BD. La clienta ya no mueve dinero ni marca `completada`. | ~~`rls.sql:134-140`~~ | ✅ |
| ~~**B3**~~ | ✅ **CERRADO** (`..._08_security_rls.sql`, verificado EN VIVO). Añadido `is_masajista()` a la rama EXISTS de `clientes_select`. | ~~`rls.sql:80-90`~~ | ✅ |
| ~~**B4**~~ | ✅ **CERRADO** (verificado EN VIVO + build). La masajista ve nombre/teléfono del cliente en sus reservas asignadas: policy `profiles_select_assigned_masajista` (`..._09`) + embed `clientes(profiles(...))` en `loadReservasMasajista`; `MiCalendario`/`Historial` usan `reserva.cliente_nombre`/`cliente_telefono`. Solicitudes abiertas no muestran contacto (privacidad). | ~~`AppContext.tsx:81-84`~~ | ✅ |
| ~~**B5**~~ | ✅ **CERRADO** (verificado EN VIVO). Trigger `notify_reserva_event` (`..._09`) ahora notifica a las masajistas verificadas/activas cuando entra una solicitud sin asignar. | ~~`logic.sql:77-82`~~ | ✅ |
| ~~**B6**~~ | ✅ **CERRADO (técnico)** (verificado EN VIVO + build). Aceptación de Términos/Privacidad obligatoria en el registro (fecha+versión en `profiles`) + consentimiento explícito de datos de salud (Art. 9) en MisDatos (fecha+versión en `clientes`). Textos en `src/legal.ts`. ⚠️ **Pendiente NO técnico:** el negocio debe rellenar sus datos y **revisar los textos con asesoría legal**. | ~~formularios~~ | ✅ (texto: revisión legal) |
| ~~**B7**~~ | 🟦 **CÓDIGO LISTO.** Edge Function `send-email` (Resend, degradación) + guía `07_EMAIL.md`. Se activa con cuenta Resend del negocio (clave + deploy + Database Webhook sobre `notificaciones`). No desplegado (sin cuenta). | `functions/send-email` | S (activar) |
| ~~**B8**~~ | ✅ **CERRADO** (verificado EN VIVO en móvil 375px). Sidebar = columna fija en escritorio + drawer deslizante con hamburguesa en móvil (`Header`/`Sidebar`/`App.tsx`). | ~~`Sidebar`~~ | ✅ |

**Stripe NO es bloqueante para un piloto** si se cobra en efectivo/manual (activarlo es S; ver `05_STRIPE.md`).

---

## 🟠 IMPORTANTES (primeras semanas)
- ~~**Doble aceptación de solicitud**~~ ✅ **HECHO** — `aceptarSolicitud` hace claim atómico (`.eq('estado','pendiente').is('masajista_id',null)` + comprueba 1 fila). Verificado.
- ~~**Escrituras que fallan en silencio**~~ ✅ **HECHO** — `updateReserva/updateClienta/updateMasajista/createValoracion/aceptarSolicitud` leen `{error}` y lanzan; handlers con try/catch.
- ~~**Sin validación de inputs en servidor**~~ ✅ **HECHO** (B2): importes y `precio_maximo_eur` se calculan/validan en BD (`reservas_calc_importes`).
- ~~**Overbooking**~~ ✅ **HECHO (núcleo)** — trigger `reservas_check_overbooking` impide solapamientos por masajista (verificado). _Pendiente menor: los slots del front siguen fijos 09-21 y no cruzan disponibilidad; el trigger ya evita el doble-booking real._
- **Asignar masajista no la notifica**; **cancelaciones notifican a quien no es** (`cancelado_por` nunca se rellena). **S**
- ~~**Solicitudes sin filtro de zona/especialidad**~~ ✅ **HECHO** — `loadReservasMasajista` filtra por especialidades + zonas; se persiste `barrio` en la reserva para el match de zona.
- **CORS `*`** en Edge Functions; subir contraseña mínima 6→8-10. **S**
- **`tsc` fuera del build:** 26 errores (falta `vite-env.d.ts`) → añadir `tsc --noEmit` a CI. **S**
- ~~**Tablas admin sin versión móvil**~~ ✅ **REVISADO** — repaso móvil completo (3 roles, ~15 vistas, overflow 0); las tablas admin scrollean horizontal. Quedan placeholders rotos (`via.placeholder.com`, `src=""`) como detalle estético. **S**
- ~~**Sin "olvidé mi contraseña"**~~ ✅ **HECHO** (enlace en login → `resetPasswordForEmail`); onboarding de masajista aún por contraseña copiada de un `alert()`. **M**
- **Activar Stripe** (cobro online). **S**

## 🟢 NICE-TO-HAVE
"Repetir" precargando la reserva; `total_sesiones` cuenta valoraciones (no sesiones); ciclos ignoran `configuracion.ciclo_pago`; `prompt()/alert()` nativos; `aria-label` accesibilidad; landing/marketing; README obsoleto.

---

## ⚖️ Aviso legal (serio) — RGPD datos de salud
Los campos de **alergias/lesiones/presión/embarazo** son **categoría especial (Art. 9 RGPD)**, como un historial clínico. Hoy se guardan en texto plano sin consentimiento. Antes del go-live: **consentimiento explícito separado** (Art. 9.2.a) con fecha/versión, poder omitir el campo (minimización), Política de Privacidad que lo cubra, y **revisión por asesoría legal**. B3 agrava esto (la PII puede filtrarse a otra usuaria).

---

## 🗺️ Camino mínimo a "vendible" (piloto, 1 cliente, cobro manual) — ~4-6 días
1. ✅ **HECHO** — **Cerrar los 3 agujeros RLS** (B1 trigger anti-auto-verificación, B2 `WITH CHECK`+trigger reservas, B3 `is_masajista()`) + mover cálculo de importes a BD. Migración `..._08_security_rls.sql`, verificado EN VIVO.
2. ✅ **HECHO** — **Arreglar verificación admin** (join `documentos`, aprobar docs, `is_verified` por update directo de admin). Verificado EN VIVO + build.
3. ✅ **HECHO** — **Masajista ve datos del cliente** (B4). Verificado EN VIVO.
4. ✅ **HECHO** (parcial) — **Notificar solicitudes abiertas** (B5). Verificado EN VIVO. _(Pendiente menor: notificar al asignar manualmente desde admin.)_
5. ✅ **HECHO** — **Navegación móvil** (drawer + hamburguesa) (B8). Verificado EN VIVO.
6. 🟦 **CÓDIGO LISTO** — **Email transaccional** (B7). Falta activar con cuenta Resend (`07_EMAIL.md`).
7. ✅ **HECHO (técnico)** — **Capa legal** (B6). Falta que el negocio rellene sus datos y revise los textos con asesoría legal.
8. ✅ **HECHO** — **Errores no silenciosos + claim atómico** de solicitudes. Verificado.

### Piloto vs escalar
- **Piloto / 1 negocio:** la lista de arriba basta (mono-tenant no estorba).
- **SaaS replicable:** además **multi-tenant** (`tenant_id` + RLS por tenant) y **modelo de planes/suscripción** (hoy solo hay comisión por reserva). Proyecto de **semanas**.
