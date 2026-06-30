# 🏁 ¿Vendible ya? — Auditoría de production/commercial readiness (2026-06-30)

> Auditoría de 7 agentes (funcionalidad, seguridad, robustez, UX, comercial/legal, operaciones) + verificación directa del código. Esto es el **roadmap para poder cobrar a un cliente**.

## Veredicto
- ❌ **NO vendible hoy** a clientes reales tal cual.
- ✅ **Vendible como instalación a medida para UN negocio piloto** tras cerrar ~8 bloqueantes (**~4–6 días**), con cobro manual/efectivo.
- 🚫 **NO vendible como SaaS replicable** sin rediseño **multi-tenant** + modelo de planes (semanas).

La app funciona en el "camino feliz" (verificado en vivo), pero el recorrido completo tiene agujeros de seguridad, flujos rotos y cumplimiento legal.

---

## 🔴 BLOQUEANTES (impiden cobrar hoy)

| # | Bloqueante | Evidencia | Esfuerzo |
|---|-----------|-----------|----------|
| **B1** | **Verificación de masajistas rota + auto-verificación.** Admin no ve/aprueba documentos (`loadAllMasajistas` no trae `documentos`, `mapMasajista` devuelve `[]`); "Verificar" nunca pone `is_verified=true`. Y la RLS `masajistas_update_own` no restringe columnas → **una masajista puede auto-verificarse** (`update is_verified=true, rating=5`). | `AppContext.tsx:336,780`, `rls.sql:68-71` | S–M |
| **B2** | **RLS `reservas` sin `WITH CHECK`** → una clienta puede cambiar `precio_total`, `comision`, `pago_masajista`, marcar `completada` o reasignar la reserva. Mueve dinero. | `rls.sql:134-140` | M |
| **B3** | **Fuga de PII entre clientas:** la política `clientes_select_...` (rama EXISTS) no comprueba que el solicitante sea masajista → leer dirección/notas internas de otras clientas. | `rls.sql:80-90` | S |
| **B4** | **La masajista no ve a quién/dónde ir:** `clientas` no se carga en su sesión → nombre/teléfono en blanco en calendario y solicitudes. | `AppContext.tsx:81-84` | M |
| **B5** | **Reservas con asignación automática no notifican a nadie** (el trigger solo notifica si nace con masajista). La masajista solo se entera si refresca a mano. | `logic.sql:77-82` | M |
| **B6** | **RGPD — datos de salud sin base legal:** se piden alergias/lesiones/embarazo (categoría especial Art. 9) sin consentimiento explícito; **no hay** Términos/Privacidad/cookies. | formularios + grep vacío | M |
| **B7** | **Cero notificaciones por email/WhatsApp:** la clienta nunca recibe confirmación fuera de la app. Inviable para servicio a domicilio. | sin Resend/SMTP/Twilio | L |
| **B8** | **No hay navegación móvil:** Sidebar `w-64` fijo, sin hamburguesa → inusable en móvil (y clientas/masajistas usan el teléfono). | `Sidebar` | M |

**Stripe NO es bloqueante para un piloto** si se cobra en efectivo/manual (activarlo es S; ver `05_STRIPE.md`).

---

## 🟠 IMPORTANTES (primeras semanas)
- **Doble aceptación de solicitud** (race condition, sin claim atómico) → `update ... .eq('estado','pendiente').is('masajista_id',null).select()` y comprobar 1 fila. **M**
- **Escrituras que fallan en silencio:** `updateReserva/updateClienta/updateMasajista/createValoracion` ignoran `{error}` y varios handlers no hacen `await`/`try-catch` → la UI dice "guardado" aunque falle. **S**
- **Sin validación de inputs en servidor:** precio/comisión los fija el cliente; `precio_maximo_eur` nunca se aplica → mover cálculo a BD (trigger). **M**
- **Overbooking:** no se cruza disponibilidad ni reservas existentes; slots fijos 09-21. **M**
- **Asignar masajista no la notifica**; **cancelaciones notifican a quien no es** (`cancelado_por` nunca se rellena). **S**
- **Solicitudes sin filtro de zona/especialidad** (toda masajista ve todas). **M**
- **CORS `*`** en Edge Functions; subir contraseña mínima 6→8-10. **S**
- **`tsc` fuera del build:** 26 errores (falta `vite-env.d.ts`) → añadir `tsc --noEmit` a CI. **S**
- **Tablas admin sin versión móvil**; placeholders rotos (`via.placeholder.com` caído, `src=""`). **S–M**
- **Sin "olvidé mi contraseña"**; onboarding de masajista por contraseña copiada de un `alert()`. **M**
- **Activar Stripe** (cobro online). **S**

## 🟢 NICE-TO-HAVE
"Repetir" precargando la reserva; `total_sesiones` cuenta valoraciones (no sesiones); ciclos ignoran `configuracion.ciclo_pago`; `prompt()/alert()` nativos; `aria-label` accesibilidad; landing/marketing; README obsoleto.

---

## ⚖️ Aviso legal (serio) — RGPD datos de salud
Los campos de **alergias/lesiones/presión/embarazo** son **categoría especial (Art. 9 RGPD)**, como un historial clínico. Hoy se guardan en texto plano sin consentimiento. Antes del go-live: **consentimiento explícito separado** (Art. 9.2.a) con fecha/versión, poder omitir el campo (minimización), Política de Privacidad que lo cubra, y **revisión por asesoría legal**. B3 agrava esto (la PII puede filtrarse a otra usuaria).

---

## 🗺️ Camino mínimo a "vendible" (piloto, 1 cliente, cobro manual) — ~4-6 días
1. **Cerrar los 3 agujeros RLS** (B1 trigger anti-auto-verificación, B2 `WITH CHECK`+trigger reservas, B3 `is_masajista()`) + mover cálculo de importes a BD. **M**
2. **Arreglar verificación admin** (join `documentos`, `is_verified` vía Edge Function). **S**
3. **Masajista ve datos del cliente** (B4). **M**
4. **Notificar solicitudes abiertas** (B5) + notificar al asignar. **M**
5. **Navegación móvil** (drawer + hamburguesa) (B8). **M**
6. **Email transaccional** (confirmación/asignación/recordatorio) (B7). **L** ← el más caro
7. **Capa legal** (consentimiento salud + Términos/Privacidad + checkbox registro) (B6). **M**
8. **Errores no silenciosos** + claim atómico de solicitudes. **S+M**

### Piloto vs escalar
- **Piloto / 1 negocio:** la lista de arriba basta (mono-tenant no estorba).
- **SaaS replicable:** además **multi-tenant** (`tenant_id` + RLS por tenant) y **modelo de planes/suscripción** (hoy solo hay comisión por reserva). Proyecto de **semanas**.
