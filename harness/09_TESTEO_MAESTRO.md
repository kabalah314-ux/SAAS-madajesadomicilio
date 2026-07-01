# 🧪 09 · GUÍA MAESTRA DE TESTEO DE LA APP

> **Qué es:** el catálogo de **todas las rutas** que puede tomar un cliente/acción desde
> que entra, y por cada una **qué tiene que cambiar en las 3 secciones** (admin ·
> masajista · clienta) para que "fluya como debe", y **si lo cumple**.
>
> **No basta con que una acción "funcione" en su pantalla:** hay que seguir el HILO de
> punta a punta. Ej.: reservo masaje para un día/hora → tiene que crearse la reserva con
> importes correctos, **salir notificación al admin**, quedar **pendiente de asignar**,
> poder **asignarse a una masajista**, que la masajista **confirme**, que la clienta se
> entere, y cerrarse (completar → valorar → pago). Cada eslabón es una casilla que se verifica.

---

## 1. Metodología — el LOOP

Por cada **flujo/hilo real** se recorre este ciclo:

```
   ┌────────────────────────────────────────────────────────────────┐
   │ 1. DETECCIÓN   recorrer el flujo COMPLETO (las 3 secciones),    │
   │                anotar cada fallo, SIN arreglar nada.            │
   │ 2. HALLAZGOS   cerrar la lista de bugs del flujo (con evidencia)│
   │ 3. CORRECCIÓN  resolver los bugs UNO POR UNO (cuando esté claro)│
   │ 4. VALIDACIÓN  repetir el flujo ENTERO de nuevo                 │
   │ 5. ¿pasa?  SÍ → siguiente hilo/caso · NO → repetir el loop      │
   └────────────────────────────────────────────────────────────────┘
```

**Reglas del loop:**
- En **DETECCIÓN no se toca código.** Se deja correr el flujo hasta el final anotando todo.
- Un flujo **solo "pasa"** cuando **TODAS** las casillas de su matriz de impacto cumplen.
- Los bugs se corrigen **uno por uno** y luego se **re-valida el flujo entero** (no solo el bug).
- Estado de cada flujo: `⬜ sin probar` · `🔴 detección: con bugs` · `🟠 en corrección` · `🟢 validado`.
- Estado de cada bug: `abierto` → `en corrección` → `resuelto` → `validado`.

**Cómo se lee una matriz de impacto:** filas = las secciones/eslabones que deben cambiar;
columna "Debe cumplir" = el criterio; columna "Estado" = `✅/❌/⬜` + nota de evidencia.

---

## 2. Entorno y runner

- **Proyecto Supabase** `lzvbfmphtrhvrjjnvqtt`. La IA verifica con **Management API** (ve todo)
  y **impersona roles con RLS** (`set local role authenticated` + claims) para comprobar
  "qué ve" cada sección de verdad. Llama a la Edge Function `agente` real con JWT de admin.
- **Datos base** (la BD debe volver aquí tras cada test):
  - Servicios: Relajante 60 (55€), Descontracturante 60 (65€), Deportivo 60 (70€),
    Pareja 90 (140€), Drenaje 75 (80€). Comisión **25%** (config).
  - Masajista **Laura** (verificada, activa; esp. Relajante/Deportivo/Descontracturante;
    zonas Madrid/Madrid Centro/Salamanca). Cliente **Ana López** (tel `+34611222333`).
  - Reservas base MF-001000/001/002 (Ana↔Laura).
- **Runner:** `harness/tests/` (Python, committeado). Helper `sbhelp.py` (`q`, `q_as`,
  `admin_jwt`, `agente`). Un script por flujo: ejecuta el hilo cruzando las 3 secciones,
  imprime **PASS/FAIL por casilla** y **limpia** lo que crea.
- **No determinismo del LLM:** se verifica **resultado** (estado en BD + herramientas que
  llamó, leídas de `agente_mensajes.metadata`), no el texto exacto. Si el agente se atasca,
  eso es un FAIL con su transcripción.

---

## 3. Catálogo de flujos

> Leyenda secciones: **E**=Entrada (clienta/agente) · **S**=Sistema/BD · **A**=Admin ·
> **M**=Masajista · **C**=vuelta a la Clienta · **Z**=Cierre.

### BLOQUE A — Agente conversacional

#### FA2 · ⭐ Reserva de contacto NUEVO (el ejemplo: "masaje relajante para mañana") — 🟢 VALIDADO 12/12
Disparador: número desconocido pide un relajante, pregunta precio, y reserva día/hora dando nombre+dirección.
Runner: `harness/tests/test_FA2_reserva_contacto_nuevo.py`. **Detección: 11/12** (B-01) → **corregido B-01+B-02** → **re-validación: 12/12 ✅**.

| # | Sección | Debe cumplir | Estado |
|---|---------|--------------|--------|
| E1 | Entrada | El agente da el **precio real** (55€) con `info_negocio`, sin inventar | ✅ |
| E2 | Entrada | Pide datos **poco a poco** (nombre, luego dirección) y **confirma** antes de reservar | ✅ |
| S1 | Sistema | Se crea **1 `contacto`** (nombre/tel/dirección/barrio) con `origen` del canal | ✅ |
| S2 | Sistema | Se crea **1 `reserva`**: `servicio` correcto, `contacto_id` set, `cliente_id` NULL (CHECK exactamente uno) | ✅ |
| S3 | Sistema | **Importes desde BD**: `precio_total`=55, `comision_monto`=13.75, `pago_masajista`=41.25 (trigger, no el cliente) | ✅ |
| S4 | Sistema | Estado `pendiente` y **`masajista_id` NULL** (pendiente de asignar) | ✅ |
| S5 | Sistema | **Notificación al ADMIN** de nueva reserva | ❌ **B-01** |
| S6 | Sistema | Notificación a **masajistas verificadas/activas** (Laura la recibe) | ✅ |
| S7 | Sistema | Conversación guardada: `resultado='reserva'`, `reserva_id` set, transcripción + herramientas en `agente_mensajes` | ✅ |
| M1 | Masajista | La reserva **aparece como solicitud abierta** para Laura (encaja esp. Relajante + zona) | ✅ |
| A1 | Admin | La reserva **aparece en el panel** como *pendiente de asignar* | ✅ |
| C1 | Cliente | El agente devuelve **código real** de la reserva y confirma | ✅ (tras deploy B-02: dice "El código de tu reserva es MF-…") |

#### FA3 · Reserva de CLIENTE REGISTRADO (reconocido por teléfono)
Disparador: llama Ana (tel `+34611222333`, registrada) y pide una reserva.

| # | Sección | Debe cumplir | Estado |
|---|---------|--------------|--------|
| E1 | Entrada | El agente **la saluda por su nombre** (reconoce el teléfono → `cliente_id`) | ⬜ |
| S1 | Sistema | Reserva con **`cliente_id`=Ana** y `contacto_id` NULL; NO crea contacto duplicado | ⬜ |
| S2 | Sistema | Importes correctos + estado pendiente/sin asignar | ⬜ |
| S3 | Sistema | Notificación **in-app al cliente** disponible (tiene `cliente_id`) | ⬜ |
| A1 | Admin | Aparece en panel | ⬜ |

#### FA4 · Reserva de CONTACTO EXISTENTE (reconocido por teléfono)
Disparador: un teléfono que ya es un `contacto` vuelve a pedir. Debe **reconocerlo** (no crear otro contacto).

| # | Sección | Debe cumplir | Estado |
|---|---------|--------------|--------|
| E1 | Entrada | Reconoce el contacto por teléfono (saluda por su nombre) | ⬜ |
| S1 | Sistema | Reserva usa el **contacto existente** (no crea uno nuevo) | ⬜ |

#### FA5 · Reserva por CADA masaje del catálogo (5 servicios)
Un sub-test por servicio: el precio y la duración de la reserva creada deben coincidir con `servicios`.

| Servicio | Precio esperado | Duración | Estado |
|----------|-----------------|----------|--------|
| Relajante 60 | 55€ (pm 41.25) | 60 | ⬜ |
| Descontracturante 60 | 65€ (pm 48.75) | 60 | ⬜ |
| Deportivo 60 | 70€ (pm 52.50) | 60 | ⬜ |
| Pareja 90 | 140€ (pm 105.00) | 90 | ⬜ |
| Drenaje 75 | 80€ (pm 60.00) | 75 | ⬜ |

#### FA1 · Información sin reserva
Preguntas de servicios/precios, zonas, horarios, cancelación → usa `info_negocio`, **no inventa**, `resultado` ≠ reserva.

#### FA6 · Consultar mi cita
Cliente con reserva pregunta "¿cuándo es mi cita?" → `consultar_mi_reserva` devuelve su próxima; sin cita → lo dice.

#### FA7 · Recado · FA8 · Transferir
Pide algo que no resuelve → `tomar_recado` crea **notificación al admin** (`resultado='recado'`). / Pide humano → `transferir` (`resultado='transferida'`).

#### FA9 · Casos límite
Servicio inexistente (no inventa precio) · datos incompletos (los pide, no revienta) · hueco ya ocupado / overbooking · menciona **datos de salud** (RGPD: pide consentimiento, no guarda a ciegas).

---

### BLOQUE B — Rutas clásicas (app)

#### FB1 · Clienta reserva desde la app (NuevaReserva)
Reserva eligiendo masajista y sin elegir. Mismas casillas S1–S6/A1/M1 que FA2 pero desde la UI de la clienta.

#### FB2 · Masajista acepta una solicitud abierta (claim atómico)
| # | Debe cumplir | Estado |
|---|--------------|--------|
| M1 | Laura ve la solicitud abierta y la acepta → pasa a `aceptada` con `masajista_id`=Laura | ⬜ |
| S1 | **Claim atómico**: si dos aceptan a la vez, solo una gana (la 2ª "ya la tomó otra") | ⬜ |
| C1 | La clienta recibe **notificación "reserva aceptada"** | ⬜ |
| M2 | Tras aceptar, la masajista **ve nombre/teléfono** del cliente | ⬜ |

#### FB3 · Admin asigna masajista a una pendiente
Admin coge una `pendiente` sin asignar y le pone masajista → queda asignada; la masajista la ve.

#### FB4 · Masajista rechaza / cancela · FB5 · Clienta cancela
Rechazo/cancelación cambian estado y **notifican a la otra parte** correctamente (ruteo del trigger).

#### FB6 · Completar → valorar → rating
Masajista marca `completada` → la clienta **valora** → `rating_promedio`/`total_sesiones` de la masajista **recalculan** (a pesar del freeze de B1).

#### FB7 · Ciclo de pago (Admin → Transferencias)
"Cerrar ciclo" (`admin-actions close_ciclo`) genera ciclo + transferencias por masajista con los `pago_masajista` correctos.

#### FB8 · Expiración automática
`expire-reservas` expira una `pendiente` vencida y **notifica al cliente**.

---

## 4. 🐞 Registro de bugs (consolidado)

> `id · severidad(🔴alta/🟠media/🟡baja) · flujo · descripción · evidencia · estado`

| id | sev | flujo | descripción | estado |
|----|-----|-------|-------------|--------|
| B-01 | 🟠 | FA2/FB1 | **El admin NO recibe notificación** al crear una reserva nueva. `notify_reserva_event` (INSERT) solo notifica a la masajista asignada o, si está sin asignar, a las masajistas verificadas — **nunca al admin**. El usuario lo marcó como criterio ("que salga la notificación al admin"). **Evidencia (FA2 ronda 1):** notificaciones al admin para la reserva creada = 0. **Fix:** migración `..._17_notif_admin_reserva.sql` (el trigger inserta también notificación a cada `profiles.role='admin'` en el INSERT). | ✅ **resuelto y validado** (FA2 re-run S5=PASS, 12/12) |
| B-02 | 🟡 | FA2 | El agente **confirma la reserva pero no comunica el código** (p.ej. MF-001048) al cliente. Útil como referencia en WhatsApp/teléfono. **Fix:** regla añadida al system prompt de `agente/index.ts` para que incluya el código de `crear_reserva` en la confirmación. **Edge Function `agente` redesplegada.** | ✅ **resuelto y validado** (FA2 re-run C1=PASS, 12/12; el agente dice "El código de tu reserva es MF-001050") |

### Ronda 2 · Auditoría estática de los 16 flujos (workflow, 32 "confirmados" → TRIADOS)
> Un workflow read-only auditó todos los flujos y refutó candidatos. Muchos "confirmados" eran
> el MISMO falso positivo. Aquí va la **triada real** (verificada contra la BD viva donde aplica).

**✅ Resueltos este ciclo (verificados en vivo):**
| id | sev | descripción | estado |
|----|-----|-------------|--------|
| N1 | 🔴 | **Cancelar una reserva PENDIENTE sin asignar fallaba** (`user_id NULL` en notificación → viola NOT NULL → la clienta no podía cancelar). **Confirmado en vivo.** Fix: migración `..._19_notif_null_guard.sql` (solo notifica si hay destinatario). | ✅ resuelto y re-validado |
| DRIFT | 🟠 | **Deriva de esquema:** `agente_conversaciones.contacto_id` y `llm_messages` existían en vivo pero NO en migraciones → deploy limpio roto. Fix: migración `..._18_agente_cols_drift.sql` (idempotente). | ✅ resuelto |

**✅ Resueltos después (verificados en vivo):**
| id | sev | flujo | descripción | estado |
|----|-----|-------|-------------|--------|
| N2 | 🟠 | FB3 | El admin asigna con la misma `aceptarSolicitud`; se notificaba al cliente pero **NO a la masajista** recién asignada (y para contactos se saltaba el bloque). Fix: migración `..._20_notif_masajista_asignada.sql` — bloque independiente que avisa a la masajista si la asigna OTRO (admin/servicio), distinguiendo por `auth.uid()` para no duplicar en el claim propio. | ✅ resuelto y validado (admin-asigna avisa a masajista+cliente; claim propio no duplica) |
| A4 | — | FA5 | **"Masaje Pareja" desactivado** (`is_active=false`) para el piloto (decisión del usuario). El agente no lo ofrece ni deja reservarlo (`crear_reserva` filtra `is_active=true`). | ✅ hecho |
| B1 | — | FB7 | `close_ciclo` paga por reserva **completada** sin mirar `pago_estado`. **Decisión del usuario: se mantiene** ("pago por servicio completado"; el cobro es en efectivo/manual, sin pago online hoy). | ✅ decidido (sin cambio) |

**✅ Fixes del agente resueltos y validados en vivo (runner `test_agente_A1_A2_A3.py`):**
| id | sev | flujo | descripción | validación |
|----|-----|-------|-------------|-----------|
| A2 | 🟠 | FA4 | Teléfono sin normalizar + sin UNIQUE → contactos duplicados. Fix: normalización en `agente/index.ts` (quita espacios/guiones/paréntesis/puntos) + migración `..._21` (normaliza existentes + UNIQUE en `contactos.telefono`). | ✅ Marta reconocida con "+34 600 999 888" (otro formato), sin duplicado, saluda por nombre |
| A3 | 🟠 | FA9 | El agente no pedía consentimiento RGPD (Art. 9) para datos de salud. Fix: regla dura en el system prompt (no reservar ni anotar salud sin pedir consentimiento explícito primero). | ✅ 3/3: pide "¿me autorizas a anotar tu hernia…?" y NO guarda el dato en el mismo turno |
| A1 | 🟠 | FA9 | `consultar_huecos` devolvía horas FIJAS. Fix: cruza ocupación real (masajistas verificadas × reservas `aceptada/completada` que solapan). | ✅ excluye la hora ocupada por la única masajista, mantiene las libres |

**✅ Fixes de frontend resueltos y validados en vivo (preview MCP):**
| id | sev | flujo | descripción | validación |
|----|-----|-------|-------------|-----------|
| B2 | 🟡 | FB3 | En `GestionReservas`, si `barrio` es NULL y ciudad vacía la validación de zona se cortocircuitaba (`!zonaReserva`→cubre) y ocultaba el aviso. Fix: `zonaDesconocida` separado + aviso propio. | ✅ modal de asignar con reserva sin zona muestra "⚠️ La reserva no tiene zona…" (antes: ningún aviso) |
| B3 | 🟡 | FB7 | `mapTransferencia` ponía `importe_bruto = importe_neto` (ambos = `monto_eur`). Fix: `bruto` reconstruido con la comisión global (`neto / (1 - comisión)`), `neto` = `monto_eur`. | ✅ tabla de Transferencias: Bruto **55€** / Neto **41.25€** (antes ambos 41.25€) |
| B12 | 🟡 | FB7 | **Bonus** (confirmado en vivo mientras verificaba B3): la ventana de quincena comparaba `new Date(fecha)` (UTC) con límites locales → una transferencia con fin el día 15 quedaba **invisible** en el panel (ni actuales ni históricas) + el cierre de ciclo creaba fechas desplazadas un día. Fix: comparación por cadenas `YYYY-MM-DD` locales. | ✅ la transferencia (fin 15-jul) ahora aparece en el ciclo actual sin trucar fechas |

**🟠 Decisión de negocio pendiente:**
| id | flujo | decisión |
|----|-------|----------|
| N5 | FA3 | ¿Notificar al **cliente registrado** de su propia creación de reserva (in-app)? (hoy solo se le notifica al aceptarse). Opcional, baja prioridad. |

**⚪ Backlog menor / edge (anotados, baja prioridad):** trigger sin rama `expirada` (la Edge Function ya notifica), `close_ciclo` no maneja el unique `(fecha_inicio,fecha_fin)` explícitamente, `hora_fin` sin control de overflow >24h, timezone en `consultar_mi_reserva` cerca del cambio de día, lista admin sin recarga tras asignar, cancelar 'confirmada' sin método en AppContext, restringir cancelación a reservas futuras. _(B12 — timezone en la ventana de transferencias — se sacó del backlog y se ARREGLÓ, ver arriba.)_

**❌ Falsos positivos descartados (verificado en vivo):** ~14 hallazgos afirmaban que `contacto_id`/`llm_messages` no existen en `agente_conversaciones` — **sí existen** (los auditores solo miraron la migración `_15`; FA2 funciona en vivo). El fondo real (deriva de esquema) se atendió con la migración `_18`. También: "race condition en el claim" — ya hay **claim atómico** implementado (FA2/FB2), no aplica.

_(los siguientes se añaden durante la DETECCIÓN)_

---

### Ronda 3 · Regresión E2E fresca (flujos clásicos) — runner `test_regresion_clasicos.py`
Re-verificados contra el código ACTUAL (tras migraciones `_17`–`_21`). Impersonando cada rol con RLS. **16/16 ✅.**
- **FB1** Clienta reserva: importes por trigger (55/13.75/41.25), pendiente sin asignar, **notif admin+masajista**, la masajista la ve. ✅
- **FB2** Masajista acepta (claim atómico): queda aceptada+asignada, clienta notificada, 2º claim no cambia nada, la masajista ve el nombre del cliente. ✅
- **FB6** Completar→valorar→rating: marca completada, la clienta valora, **rating recalcula** a 5.0 (el freeze B1 no bloquea). ✅
- **FB4** Rechazo/cancelación: la masajista cancela una aceptada → clienta notificada. ✅
- **FB8** Expiración: `expire-reservas` expira las pendientes vencidas (por `created_at`+timeout) y notifica al cliente. **Bug latente cazado y arreglado:** si un **contacto** (cliente_id NULL) caía en el lote, el insert de notificaciones petaba y rompía TODO el aviso; fix: filtrar `cliente_id` no nulo (los contactos se avisan por WhatsApp). Función redesplegada. ✅

### Ronda 3 · Regresión E2E fresca (flujos del agente) — runner `test_regresion_agente.py`
Contra la Edge Function `agente` real (con A1/A2/A3 desplegados). **9/9 ✅.**
- **FA3** Reserva cliente registrado: reconoce a Ana por su teléfono (la saluda por nombre) y crea la reserva con `cliente_id` (no contacto). ✅
- **FA5** Reserva por cada masaje: deportivo 70€/60min, descontracturante 65€/60min, drenaje 80€/75min — servicio, precio y duración correctos. ✅
- **FA6** Consultar mi cita: `consultar_mi_reserva` devuelve la próxima cita del que llama. ✅
- **FA7** Recado: `tomar_recado` crea notificación al admin (`resultado=recado`). ✅
- **FA8** Transferir: `resultado=transferida`. ✅
- **FA1** Info: usa `info_negocio`, da precios reales (55€), no inventa, no queda como reserva. ✅

### Mejora post-testeo · Email de "solicitud recibida" al cliente + plantilla más cuidada (2026-07-02)
El usuario detectó que, al enviar una solicitud, **el cliente no recibía ningún aviso** (ni in-app ni
email) — solo se notificaba a la masajista y al admin. Además pidió que el email no fuera "cutre".
- **Migración `..._22_solicitud_recibida_cliente.sql`:** el trigger `notify_reserva_event` ahora, en
  INSERT, también notifica al cliente ("Hemos recibido tu solicitud…") con un payload rico
  (servicio/fecha/hora/dirección/precio/código). Se enriqueció el payload de TODAS las notificaciones
  de reserva (nueva/asignada/aceptada/rechazada/cancelada) con esos mismos campos.
- **`send-email/index.ts` rediseñado:** plantilla nueva con icono según el tipo de evento, tarjeta de
  detalles (tabla label/valor) construida desde el payload, y botón CTA "Ver en MassFlow". Antes era
  un único bloque de texto plano.
- **Verificado en vivo:** `test_email_solicitud.py` 4/4 (notificación creada con payload completo +
  **email real entregado por Resend**, `sent:true` con ID de mensaje). QA visual con Playwright
  (`pw_email_preview.cjs`, réplica exacta de la plantilla) confirma el diseño: cabecera de marca,
  icono, tarjeta de detalles legible, CTA. Edge Functions `send-email` redesplegada.

> **✅ TODA LA GUÍA EN VERDE:** FA1–FA9 y FB1–FB8 verificados en vivo contra el código actual. FA2 12/12, clásicos 16/16, agente 9/9. Bugs cazados y arreglados en las 3 rondas. Frontend desplegado a Vercel y verificado en producción.

### FC1 — Foto de perfil en las 3 categorías (2026-07-02) · 🟢 CONSTRUIDO Y VALIDADO
Hoy `uploadAvatar` (AppContext, sube a Storage bucket `avatars` + guarda `profiles.avatar_url`) **solo
está enganchado en la masajista** (`MiPerfil.tsx`, verificado en vivo en sesiones anteriores). Falta
en clienta y admin. Tarea en `01_ESTADO_Y_PLAN.md` · Fase 10.1.

| # | Sección | Debe cumplir | Estado |
|---|---------|--------------|--------|
| P1 | Masajista | Sube foto desde `MiPerfil`, se guarda y persiste | ✅ (ya hecho, verificado en sesión anterior) |
| P2 | Clienta | Puede subir/cambiar su foto de perfil desde `MisDatos` | ✅ tarjeta "Foto de perfil" en Datos Personales |
| P3 | Admin | Puede subir/cambiar su foto de perfil | ✅ tarjeta "Mi Perfil" añadida al principio de `Configuracion.tsx` (el admin no tenía página propia; se decidió integrarla ahí en vez de crear una vista nueva) |
| P4 | Transversal | El avatar subido se ve reflejado en `Header.tsx` (barra superior) para los 3 roles | ✅ **ya estaba cableado** (`currentUser.foto` se mapea de `profiles.avatar_url` en la carga de sesión para cualquier rol, `Header.tsx:147` ya lo pintaba) — solo faltaba que hubiera algo que subir |

**Cómo se construyó:** `uploadAvatar` (AppContext, ya existía y es genérico) se enganchó en `MisDatos.tsx`
(clienta) y `Configuracion.tsx` (admin) con el mismo patrón visual que ya usaba la masajista (círculo +
botón cámara). Sin migraciones ni cambios de backend — la única pieza que faltaba era la UI de subida.
**Verificado en vivo (local Y producción)** con Playwright (`pw_avatar.cjs`): sube una imagen real como
clienta y como admin, aparece al instante en la propia página Y en el Header, y **persiste tras
recargar** la página entera.

### FC2 — Chat con el agente DESDE la cuenta de la clienta (2026-07-02) · 🟢 CONSTRUIDO Y VALIDADO 16/16
Hoy el agente (`supabase/functions/agente`) solo es invocable por **admin** (JWT) o por **webhook secret**
(canales `whatsapp`/`telefono`, aún sin conectar) — una clienta logueada recibiría **401**. Y las tablas
`agente_conversaciones`/`agente_mensajes` solo las lee el admin por RLS (`is_admin()`). El objetivo:
la clienta, **desde su propia cuenta**, puede abrir un chat, preguntar lo que quiera, y **pedir una cita
por IA** (en vez de/además del formulario manual de "Nueva Reserva").

**Diseño (antes de picar código):**
- **Nuevo canal `'app'`** (columna `canal` es texto libre, sin CHECK — no hace falta migración para
  añadir el valor) para diferenciarlo de `test`/`whatsapp`/`telefono` en analítica.
- **Autorización del Edge Function ampliada:** admite también el **JWT de la propia clienta**
  (`role='cliente'`). Cuando el que llama es una clienta autenticada, el `cliente_id` de la
  conversación se resuelve **del JWT verificado** (`user.id`), NUNCA del teléfono que mande el body
  — así una clienta no puede hacerse pasar por otra ni crear una reserva a nombre de otra persona.
- **Sin tocar RLS de `agente_*`:** el chat de la clienta NO lee esas tablas directamente (seguirían
  bloqueadas para su rol); el historial se mantiene en **estado local de React** turno a turno, usando
  el `reply` que ya devuelve el Edge Function (mismo patrón que "Probar agente" del admin, pero sin
  releer la tabla).
- **UI nueva:** vista "Asistente" (o similar) en el menú de la clienta (`Sidebar.tsx`), componente de
  chat reusando el patrón visual de `admin/Agente.tsx` (burbujas cliente/agente).
- **La reserva creada por el chat debe comportarse EXACTAMENTE igual** que cualquier otra (importes
  por trigger, notificación al admin+masajista+la propia clienta ["Hemos recibido tu solicitud"],
  visible en "Mis Reservas") — reusa toda la lógica de `crear_reserva` ya probada en FA3/FA5.

| # | Sección | Debe cumplir | Estado |
|---|---------|--------------|--------|
| Q1 | Clienta | Ve una opción de chat en su menú y puede abrirlo | ✅ nueva vista "Asistente" en Sidebar + tarjeta de acceso en Inicio |
| Q2 | Clienta | Puede preguntar (servicios, precios, zonas) y el agente responde con datos reales (`info_negocio`) | ✅ responde precios reales (55€ etc.), no inventa |
| Q3 | Clienta | Puede pedir cita por chat; la reserva queda con **su `cliente_id` real** (nunca por teléfono/spoofable) | ✅ `cliente_id` resuelto del JWT; teléfono del body se ignora por completo |
| Q4 | Sistema | La reserva creada por chat dispara TODO el hilo normal: importes BD, notif admin+masajista+ella misma, visible en Mis Reservas | ✅ importes 55/13.75/41.25, 3 notificaciones, aparece al instante en Mis Reservas (se expuso `loadReservasCliente` y se refresca tras cada turno) |
| Q5 | Seguridad | Una clienta **no puede** invocar el agente en nombre de otra (el `cliente_id` se resuelve del JWT, se ignora cualquier id/teléfono que mande en el body) | ✅ **verificado con ataque real**: Ana no pudo secuestrar el `conversation_id` de otra clienta (se le crea una conversación nueva propia; la ajena queda intacta) |
| Q6 | Seguridad | Un rol que no sea `cliente` (p.ej. `masajista`) no puede usar el canal `app` para colarse | ✅ una masajista recibe 401 al intentarlo |

**Cómo se construyó:**
- **Backend (`agente/index.ts`):** la autorización ahora también acepta el JWT de un usuario `role='cliente'` (antes solo admin/webhook secret). Cuando quien llama es una clienta autenticada: `canal` se fuerza a `'app'`, el `telefono` del body se descarta, y el `cliente_id` de la conversación es **siempre** `user.id` del JWT verificado — nunca dato que mande el cliente. **Anti-IDOR:** si se pasa un `conversation_id` que no pertenece a esa clienta (ajeno, de un contacto, o inventado), se descarta y se abre una conversación nueva en vez de leerla/continuarla.
- **Frontend:** nueva vista `src/components/clienta/Asistente.tsx` (chat con estado local, sin leer las tablas `agente_*` — siguen bloqueadas por RLS a `is_admin()`, sin tocarlas). Menú + tarjeta de acceso en Inicio.
- **Runner:** `harness/tests/test_asistente_cliente.py` (16/16, incluye los 2 intentos de ataque) + `harness/tests/pw_asistente.cjs` (Playwright: login→chat→pregunta→reserva→aparece en Mis Reservas, verificado en local Y en producción).
- **Sin migraciones** (canal `'app'` es texto libre, sin CHECK; RLS de `agente_*` sin tocar).

**Mejora post-lanzamiento · el contexto no se pierde al cerrar la ventana (2026-07-02):** el usuario
detectó que al recargar/cerrar la pestaña, el chat volvía a empezar de cero (el agente en el servidor
SÍ recordaba todo — `llm_messages` en `agente_conversaciones` — pero la interfaz nunca lo volvía a
pedir; `convId`/`msgs` solo vivían en memoria de React). **Fix:** migración `..._23` añade 2 políticas
RLS **de solo lectura, aditivas** (`agente_conv_select_own_cliente`, `agente_msg_select_own_cliente`):
una clienta puede leer sus PROPIAS conversaciones/mensajes (nunca los de otra; las políticas de
escritura y las del admin no se tocan). `Asistente.tsx` ahora, al montar, recupera su última
conversación + mensajes del servidor y los pinta antes de dejar escribir; botón "Nueva conversación"
para empezar de cero cuando quiera.
- **Falso positivo cazado durante la verificación:** un primer test de RLS pareció mostrar que Ana
  veía la conversación de otra clienta — resultó ser un artefacto del arnés de pruebas (la API de
  Management, en un batch multi-sentencia, a veces devuelve el resultado de una sentencia anterior
  cuando la última SELECT da 0 filas). Confirmado con petición HTTP cruda + un patrón de SELECT amplio
  + filtro en Python: la RLS es correcta (Ana ve solo sus 2 conversaciones, nunca las de otra).
- **Verificado en vivo (local Y producción) con Playwright:** enviar mensaje → **recargar la página
  entera** (simula cerrar/reabrir la ventana) → el mensaje y la respuesta real del agente siguen ahí;
  "Nueva conversación" vuelve al saludo inicial. `pw_asistente_persistencia.cjs`.

### Pendiente de construir · FC3 — Reparto con consentimiento + disponibilidad real (2026-07-02, pedido por el usuario)
**Problema detectado por el usuario:** (1) hoy el admin, al "Asignar", manda la reserva directa a `aceptada`
**sin preguntar a la masajista**; debería *proponérsela* y que la masajista decida. (2) La disponibilidad
que la masajista configura en su panel **no se usa en ningún sitio**: la clienta ve horas fijas 9-21, el
agente no la cruza, y el admin puede asignar a cualquiera esté o no disponible.

**Estado actual del código (verificado):**
- Admin "Asignar" → `aceptarSolicitud(reserva, masajista)` → `estado='aceptada'` directo (sin consentimiento).
- Pool abierto: la masajista ve las `pendiente` sin asignar en "Solicitudes" y acepta/rechaza (aquí sí hay consentimiento).
- `disponibilidad` (tabla: masajista_id, dia_semana 0-6, hora_inicio, hora_fin, is_active). Laura tiene: lunes 9-14 y 16-20. **No se consulta en ningún flujo.**
- `NuevaReserva.tsx`: horas HARDCODED 9-21 (comentario: "simplificado - en producción consultaría disponibilidad real").
- `consultar_huecos` (agente): cruza ocupación pero NO disponibilidad.
- Enum `reserva_estado`: pendiente/aceptada/rechazada/completada/cancelada/expirada (no hay 'ofrecida').

**✅ Decisiones del usuario (2026-07-02):**
1. **Coexisten** el pool abierto Y la oferta dirigida del admin.
2. Si la masajista **rechaza** una oferta del admin → la reserva **vuelve a `pendiente` sin asignar** y se avisa al admin para que la re-ofrezca (o la deje en el pool).
3. **Estricto:** una masajista sin disponibilidad configurada se trata como **NO disponible** (no genera huecos). ⚠️ *Implicación para el piloto: cada masajista real DEBE configurar su disponibilidad o no le entrarán reservas; hay que avisarla claramente y dar al admin una vista de quién no la tiene.*

#### Bloque A — Oferta con consentimiento (admin propone → masajista acepta)
- **A1. DB:** añadir estado **`ofrecida`** al enum `reserva_estado` (migración aparte — `ALTER TYPE ADD VALUE` no se puede usar en la misma transacción que lo consuma).
- **A2. DB `reservas_guard_update`:** permitir transiciones: admin/service `pendiente↔ofrecida`; la masajista OFERTADA `ofrecida→aceptada` o `ofrecida→pendiente` (rechazar la oferta = devolverla al pool sin asignar, guardando motivo; NO usar `rechazada` que es terminal).
- **A3. Trigger `notify_reserva_event`:** al ofrecer → avisar a la masajista ("Te han ofrecido la reserva X"); al aceptar → cliente+admin (ya existe); al rechazar/devolver → avisar al admin ("X rechazó la oferta, vuelve a estar libre").
- **A4. AppContext:** `ofrecerReserva(reservaId, masajistaId)` (admin) + `aceptarOferta`/`rechazarOferta` (masajista). El claim del pool abierto (`aceptarSolicitud`) se mantiene.
- **A5. UI admin (`GestionReservas`):** "Asignar" pasa a **"Ofrecer a…"** (crea oferta, no confirma); mostrar estado `ofrecida` = "esperando respuesta de X".
- **A6. UI masajista (`Solicitudes`):** sección **"Ofertas para ti"** (ofrecida + masajista_id=yo) con Aceptar/Rechazar, separada del pool abierto.
- **A7.** `ofrecida` NO bloquea overbooking (no es confirmada); al aceptar, el trigger anti-overbooking ya protege.

#### Bloque B — Disponibilidad real manda
- **B1. Helper:** "¿masajista M disponible en fecha F / hora H / duración D?" = tiene slot activo para el weekday de F que cubra [H, H+D] **y** no solapa reserva activa. **Estricto:** sin slots → no disponible.
- **B2. `consultar_huecos` (agente):** cruzar con `disponibilidad` (además de ocupación). Redeploy.
- **B3. `NuevaReserva` (clienta):** sustituir las horas fijas por horas con **al menos una masajista disponible** (reactivo a la fecha elegida).
- **B4. Picker del admin (`GestionReservas`):** al ofrecer, mostrar solo masajistas realmente disponibles ese día/hora (o marcar las no disponibles).
- **B5. Pool abierto (`Solicitudes`):** las solicitudes abiertas que ve una masajista deben encajar con SU disponibilidad (además de zona/especialidad, que ya se filtra).
- **B6. (Opcional, fase 2) Backstop en BD:** trigger que impida confirmar/ofrecer fuera de la disponibilidad (robustez de servidor, como el de overbooking).
- **B7. UX:** avisar a la masajista sin disponibilidad ("no recibirás reservas"); vista admin de quién no la tiene.

#### Bloque C — Excepciones de disponibilidad por fecha concreta (2026-07-02, pedido por el usuario)
El horario semanal (Bloque B) es la BASE recurrente ("todos los jueves 13-20"). Encima van excepciones
puntuales por fecha, de dos tipos:
- **Bloqueo:** la masajista marca una **fecha concreta** como no disponible (vacaciones/día libre), aunque
  su horario semanal diga que ese día trabaja. Puede ser día completo o una franja.
- **Extra:** añade disponibilidad en una **fecha concreta** que NO es su día habitual.
- **C1. DB:** tabla nueva `disponibilidad_excepciones` (masajista_id, `fecha` date, `tipo` 'bloqueo'|'extra', `hora_inicio` nullable = día completo, `hora_fin`, `motivo`). RLS: la masajista gestiona las suyas; admin lee.
- **C2. Helper de disponibilidad (extiende B1):** para fecha F / hora H, el orden es: (1) ¿hay bloqueo de F que cubra H? → NO disponible. (2) ¿hay 'extra' de F que cubra [H,H+D]? → disponible. (3) si no, cae al horario **semanal** (dia_semana). (4) y en todos los casos, no solapar reserva activa. Como B1 es la ÚNICA fuente de verdad, esto se propaga solo a huecos del cliente/agente/picker admin.
- **C3. UI (`Disponibilidad.tsx`):** sección "Excepciones por fecha" con un selector de fecha → "Bloquear este día" (completo o franja) / "Añadir disponibilidad extra". Listar las excepciones próximas.

#### Matriz de impacto (qué verificar al construir)
| # | Sección | Debe cumplir |
|---|---------|--------------|
| R1 | Clienta | Al elegir día/hora, **solo salen horas con alguna masajista disponible** (disponibilidad + libre); si nadie disponible, se le dice |
| R2 | Admin | "Ofrecer a" solo lista masajistas disponibles ese día/hora; la reserva pasa a `ofrecida`, NO a `aceptada` |
| R3 | Masajista | Recibe la oferta (aviso + en "Ofertas para ti"); **Aceptar** → confirmada; **Rechazar** → vuelve al admin |
| R4 | Sistema | Al aceptar: `aceptada`, notifica cliente+admin, aparece en Mis Reservas; al rechazar: `pendiente` sin asignar, avisa admin |
| R5 | Seguridad | Una masajista **no puede aceptar/rechazar una oferta dirigida a OTRA** (solo la suya) |
| R6 | Seguridad | No se puede confirmar una reserva fuera de la disponibilidad de la masajista (idealmente backstop en BD) |
| R7 | Agente | `consultar_huecos` respeta disponibilidad; el agente no ofrece una hora sin masajista disponible |
| R8 | Excepciones | Un **bloqueo** de fecha concreta oculta esa masajista aunque su semanal diga que trabaja; un **extra** la hace disponible un día que no es el suyo habitual |

## 5. 📓 Diario de rondas del loop (lo más nuevo arriba)

- 2026-07-01 · **Ronda 1 · DETECCIÓN · FA2** (reserva contacto nuevo por el agente) · 11/12 casillas ✅. Hilo completo cruzando entrada→sistema→masajista→admin verificado con RLS. Bugs: **B-01** (admin no notificado, 🟠) y **B-02** (código no comunicado al cliente, 🟡). Runner `test_FA2_reserva_contacto_nuevo.py`, limpia tras de sí. · detección hecha, sin tocar código.
- 2026-07-01 · **CORRECCIÓN · B-01** · migración `..._17_notif_admin_reserva.sql` (el trigger `notify_reserva_event` notifica también al admin en cada INSERT). Aplicada vía Management API. **Re-validación FA2: 12/12 ✅** (S5 notif admin ahora PASS). · resuelto y validado.
- 2026-07-01 · **CORRECCIÓN · B-02** · regla en el system prompt de `agente/index.ts` para que el agente diga el código; check C1 endurecido. **Edge Function `agente` redesplegada** (autorizada por el usuario, `npx supabase functions deploy agente --use-api`). **Re-validación FA2: 12/12 ✅** — el agente dice "El código de tu reserva es MF-001050". **FA2 🟢 VALIDADO (loop cerrado).** · resuelto y validado.
- 2026-07-01 · **Ronda 2 · Auditoría estática (workflow 62 agentes)** · barrido read-only de los 16 flujos restantes + refutación adversaria. 32 "confirmados" TRIADOS: ~14 falsos positivos (columnas del agente que sí existen en vivo), varios de negocio/edge. **2 arreglados en vivo:** **N1** (cancelar pendiente sin asignar fallaba por `user_id NULL` — confirmado y arreglado, migración `_19`) y **DRIFT** (columnas `contacto_id`/`llm_messages` vivas pero sin migración — migración `_18`). Reales pendientes: N2 (masajista no notificada al asignar), A1 (huecos fijos), A2 (teléfono sin normalizar/duplicados), A3 (RGPD salud en agente), B2 (barrio NULL salta validación zona), B3 (transferencia bruto=neto). Decisiones de negocio: A4 (Pareja 2 masajistas), B1 (close_ciclo sin pago_estado), N5 (notif creación al cliente). · detección+2 fixes verificados; resto pendiente de priorizar con el usuario.
- 2026-07-01 · **CORRECCIÓN · A4/N2/B1** · A4: servicio "Pareja" desactivado (decisión del usuario). N2: migración `..._20` (la masajista recibe aviso cuando OTRO la asigna; distingue el claim propio por `auth.uid()`; usa `tipo=reserva_nueva` + `payload.evento=asignada` porque el enum no tiene 'reserva_asignada'). B1: se mantiene "pago por servicio completado" (decisión). · **Verificado en vivo** (N2: admin-asigna avisa a masajista+cliente; claim propio no duplica).
- 2026-07-01 · **CORRECCIÓN · A1/A2/A3 (batch agente, 1 redeploy)** · A2: normalización de teléfono en `agente/index.ts` + migración `..._21` (normaliza + UNIQUE en `contactos.telefono`). A3: regla dura de consentimiento RGPD de datos de salud en el system prompt. A1: `consultar_huecos` cruza ocupación real (estados `aceptada/completada`; el enum NO tiene `en_curso` — bug cazado y corregido en la validación). Edge Function `agente` redesplegada. · **Verificado en vivo** (`test_agente_A1_A2_A3.py`): A2 reconoce contacto con otro formato sin duplicar; A1 excluye la hora ocupada; A3 3/3 pide consentimiento y no guarda salud sin permiso.
- 2026-07-01 · **DESPLIEGUE + Ronda 3 (regresión completa)** · Frontend desplegado a Vercel producción (`vercel --prod`, verificado en `saas-madajesadomicilio.vercel.app`: bruto/neto + Análisis). Regresión E2E fresca: **clásicos 16/16** (`test_regresion_clasicos.py`: FB1 reserva, FB2 claim, FB6 rating, FB4 cancelación, FB8 expiración) y **agente 9/9** (`test_regresion_agente.py`: FA3, FA5×3, FA6, FA7, FA8, FA1). **Bug latente arreglado en FB8:** `expire-reservas` rompía las notificaciones si un contacto (cliente_id NULL) caía en el lote → filtrado + redeploy. **Toda la guía en verde.** · verificado en vivo.
- 2026-07-01 · **CORRECCIÓN · B2/B3/B12 (frontend)** · B2: `GestionReservas` distingue "zona desconocida" (barrio+ciudad vacíos) y muestra aviso propio en vez de ocultarlo. B3: `mapTransferencia` reconstruye `importe_bruto` con la comisión global (antes bruto==neto). B12 (bonus): la ventana de quincena de Transferencias comparaba fechas con desfase de zona horaria (una transferencia con fin el 15 quedaba invisible); ahora compara cadenas `YYYY-MM-DD` locales. · **Verificado EN VIVO** (preview MCP): B2 aviso "sin zona" aparece; B3 tabla muestra Bruto 55€/Neto 41.25€; B12 la transferencia (fin 15-jul) aparece en el ciclo actual. Build OK.
