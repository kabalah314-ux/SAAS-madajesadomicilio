# 🤖 08 · Agente conversacional — PLAN DE DISEÑO (leer antes de iterar)

> Este documento es el **plan acordado** del agente. No se pica código hasta que
> esto esté claro. Cuando construyamos, iremos marcando el checklist del final.

## 0. Visión y fases

Un **agente conversacional** que atiende a los clientes del negocio, **resuelve todo**
(reservar, consultar su cita, dar info, tomar recado/transferir) y **guarda TODO lo
que se habla** para que el admin lo consulte y para hacer análisis del negocio.

Fases (construimos en este orden):
1. **FASE A — Núcleo + texto/test (AHORA):** almacenamiento, cerebro (LLM vía OpenRouter),
   herramientas contra Supabase, identidad por teléfono con alta progresiva de cliente,
   y sección **"Agente"** en el panel admin con "Probar agente" (chat de prueba).
2. **FASE B — Canales reales:** conectar **WhatsApp** (número + webhook) y **teléfono**
   (voz-IA tipo Vapi/Retell). Ambos alimentan la MISMA Edge Function `agente` cambiando
   solo el `canal`.
3. **FASE C — Análisis:** sobre los datos guardados (temas, resultado, tasa de reserva)
   → qué pregunta la gente, qué funciona, para entender el negocio.

## 1. Arquitectura por capas

```
Cliente (texto test / WhatsApp / teléfono)
        │  {canal, telefono, mensaje, conversation_id?}
        ▼
Edge Function  agente   ──►  OpenRouter (LLM barato, OpenAI-compatible) con TOOLS
        │                         │  decide qué herramienta usar
        │  ◄───────────────────────┘
        ├─ ejecuta TOOLS contra Supabase (reutiliza lógica ya testeada)
        ├─ IDENTIDAD: busca cliente por teléfono; si no, recoge datos poco a poco
        └─ GUARDA cada turno en agente_conversaciones / agente_mensajes
        ▼
Panel admin · sección "Agente"  (lista de conversaciones + transcripción + probar)
```

## 2. Modelo de datos (YA CREADO — migración `..._15_agente.sql`)

- **`agente_conversaciones`**: `id, canal('telefono'|'whatsapp'|'test'), telefono,
  cliente_id, estado('activa'|'finalizada'), resultado('reserva'|'consulta'|'info'|
  'recado'|'transferida'|'sin_resolver'), resumen, reserva_id, temas[], num_mensajes,
  created_at, ended_at`.
- **`agente_mensajes`**: `id, conversacion_id, rol('cliente'|'agente'|'sistema'),
  contenido, metadata(jsonb: herramienta+args+resultado), created_at`. Trigger que
  mantiene `num_mensajes`.
- **RLS:** solo **admin** lee/gestiona; las Edge Functions escriben con `service_role`.
- **Datos del lead** (cliente aún sin registrar): se guardan en
  `agente_conversaciones` (telefono) y en `metadata` de los mensajes (nombre, dirección
  que va dando), hasta poder crear/enlazar el cliente.

## 3. Identidad del cliente (caller ID + alta progresiva) 🔑

Regla que pediste: **por número**, y si no lo conoce, pide el nombre y va guardando
datos **sin agobiar**.

- Al empezar, con el `telefono` (caller ID):
  - **Si coincide** con `profiles.phone` de una clienta → la **reconoce**: saluda por su
    nombre, usa su dirección habitual, enlaza `cliente_id`.
  - **Si no coincide** → cliente nuevo. El agente NO pide todos los datos de golpe:
    solo lo necesario para lo que el cliente quiere, de forma natural. Ej.: para reservar
    necesita **nombre + dirección/barrio**; los va pidiendo en el flujo y los guarda.
- Los datos recogidos se acumulan en la conversación (nombre, dirección, etc.).

### ✅ DECISIÓN (2026-07-01): clientes registrados vs. perfiles internos (contactos)
El usuario decidió **NO obligar a registrarse**. Diferenciamos dos tipos:
- **Cliente registrado**: tiene cuenta (auth + `profiles` + `clientes`), usa la app en su
  móvil. Como hasta ahora.
- **Contacto (perfil interno)**: persona que solo quiere un masaje y **no entra a la app**.
  Se gestiona internamente. Va en una tabla nueva **`contactos`** (nombre, teléfono,
  dirección, preferencias…) **desacoplada de auth** (sin email/login).

**Implicación en el modelo:** `reservas` pasa a poder referenciar **o** un `cliente_id`
**o** un `contacto_id` (exactamente uno). Ajustes mínimos y probados:
- `reservas.cliente_id` → nullable; nuevo `reservas.contacto_id` (nullable) + CHECK de "exactamente uno".
- `notify_reserva_event`: solo notifica in-app/email al `cliente_id` cuando existe (a los
  contactos se les avisará por WhatsApp/teléfono vía el agente).
- El resto de la lógica (importes en BD, anti-overbooking, RLS de masajista/admin) sigue
  igual porque usa `masajista_id`/`servicio_id` y la dirección va en la propia reserva.
- Si un contacto se registra luego en la app, se **enlaza** (`contactos.cliente_id`).

El agente: reconoce clientes/contactos por teléfono; si es nuevo, crea un **contacto**
recogiendo datos poco a poco.

## 4. Herramientas del agente (tools que el LLM puede llamar)

Todas se ejecutan en la Edge Function contra Supabase, reutilizando la lógica ya testeada
(importes en BD, anti-overbooking, notificaciones/email):

| Tool | Qué hace |
|------|----------|
| `info_negocio(tema)` | Servicios+precios, zonas de cobertura, horarios, política de cancelación. |
| `consultar_huecos(fecha, servicio?)` | Huecos libres ese día (cruzando reservas existentes). |
| `crear_reserva(servicio, fecha, hora, direccion, barrio, notas?)` | Crea la reserva (para cliente reconocido; para nuevo, según decisión §3). |
| `consultar_mi_reserva()` | Próxima cita del que llama (por su teléfono). |
| `guardar_datos_cliente(nombre?, direccion?, barrio?, …)` | Acumula datos del cliente nuevo (sin agobiar). |
| `tomar_recado(motivo)` | Crea notificación al admin con el recado. |
| `transferir(motivo)` | Señal de transferir a humano (número del negocio) — útil en voz. |

## 5. Cerebro: LLM vía **OpenRouter**

- **Por qué OpenRouter:** API **compatible con OpenAI**, permite probar **modelos baratos**
  y cambiar de modelo sin tocar código. Endpoint `POST https://openrouter.ai/api/v1/chat/completions`,
  header `Authorization: Bearer $OPENROUTER_API_KEY`.
- **Modelo:** configurable (secreto `OPENROUTER_MODEL`), empezamos con uno **barato con
  soporte de tool-calling** (p. ej. `openai/gpt-4o-mini`, `google/gemini-2.0-flash` o
  `deepseek/deepseek-chat` — se elige al activar).
- **Secretos (Supabase):** `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`. **Degradación elegante:**
  sin clave, la Edge Function responde un aviso ("agente no configurado") y NO rompe la app.
- **Guion (system prompt):** agente de un negocio de masajes a domicilio, en **español**,
  educado y breve (pensado para voz), que usa las tools, no inventa precios/huecos, confirma
  antes de reservar, y recoge datos de nuevos clientes sin agobiar.

## 6. Panel admin · sección "Agente"

- **Nueva entrada en el menú admin: "Agente".**
- **Lista de conversaciones:** fecha, canal, teléfono/cliente, resultado (badge), resumen,
  nº mensajes. Filtros por resultado/canal/fecha.
- **Detalle:** transcripción completa (cliente/agente/sistema) + herramientas usadas +
  reserva creada (si la hay).
- **"Probar agente":** un chat de prueba (canal='test') para hablar con el agente desde el
  panel y ver cómo queda la conversación guardada. Así probamos FASE A sin teléfono.

## 7. Privacidad / RGPD (a tener en cuenta)
- Grabar/transcribir conversaciones = **datos personales**. En llamada/WhatsApp hay que
  **avisar** ("esta conversación puede registrarse para gestionar tu reserva y mejorar el
  servicio"). Encaja con la capa legal de B6.
- Si el cliente menciona **datos de salud** por voz, siguen siendo **categoría especial**
  (Art. 9) → el guion debe pedir consentimiento explícito antes de guardarlos.

## 8. Flujo de ejemplo (reserva de cliente nuevo)
```
Agente: Hola, soy el asistente de [negocio]. ¿En qué te ayudo?
Cliente: Quería un masaje relajante para mañana por la tarde.
Agente: [info_negocio + consultar_huecos] Claro. El relajante de 60 min son 55€.
        Mañana tengo hueco a las 17:00 o 18:30. ¿Cuál te viene mejor?
Cliente: A las 18:30.
Agente: Perfecto. ¿Me dices tu nombre y la dirección donde vamos?   ← recoge datos sin agobiar
Cliente: Ana, calle Mayor 3, barrio Centro.
Agente: [guardar_datos_cliente + crear_reserva] Reservado, Ana ✅ Relajante mañana 18:30
        en Calle Mayor 3. Te llegará confirmación. ¿Algo más?
```
Todo esto queda guardado: transcripción + resultado='reserva' + reserva_id + temas=['relajante','reserva'].

## 9. Plan de implementación (checklist — se marca al construir)
- [x] **A0** Tablas `agente_conversaciones` + `agente_mensajes` (migración `..._15`).
- [x] **A1** DECIDIDO (§3): clientes registrados vs `contactos` (perfiles internos sin auth, migración `..._16`). OpenRouter key recibida; modelo `openai/gpt-4o-mini` por defecto.
- [x] **A2** Edge Function `agente` desplegada: conversación + logging + identidad por teléfono (cliente registrado / contacto / nuevo). Auth: webhook secret O JWT admin.
- [x] **A3** Tools implementadas y ejecutando contra Supabase: info_negocio, consultar_huecos, guardar_datos_cliente, crear_reserva, consultar_mi_reserva, tomar_recado, transferir.
- [x] **A4** OpenRouter integrado (secretos `OPENROUTER_API_KEY`/`OPENROUTER_MODEL`) + system prompt en español; degradación sin clave.
- [x] **A5** Sección admin "Agente" (lista de conversaciones + transcripción con herramientas + "Probar agente" chat). En el menú admin.
- [x] **A6** Prueba E2E verificada: cliente nuevo por texto → agente pide nombre → crea contacto "Marta" → crea reserva MF-001046 (importes correctos) → todo guardado y visible en el panel. También probado el chat "Probar agente" en vivo desde la web desplegada.

**✅ FASE A COMPLETA Y VERIFICADA (2026-07-01).**
- [ ] **B** Conectar WhatsApp + teléfono (canales) — documento aparte cuando lleguemos.
- [x] **C · v1 COMPLETA Y VERIFICADA EN VIVO (2026-07-01):** panel de **Análisis** dentro de la sección admin "Agente" (pestañas Conversaciones | Análisis). Componente `src/components/admin/AgenteAnalisis.tsx`, todo calculado en el cliente desde `agente_conversaciones` (sin migraciones ni dependencias nuevas). Métricas: KPIs (nº conversaciones + media de mensajes, **tasa de reserva**, % sin resolver, clientes nuevos vs conocidos), distribución **por resultado** y **por canal** (barras), **temas más frecuentes** (chips desde `temas[]`), **actividad por día** (mini-barras), recados/transferencias; selector de período 7d/30d/todo; empty state. Verificado en vivo (preview MCP, admin): 2 convs, tasa 50%, 4 secciones OK, sin overflow. Build OK. _(FASE C se ampliará con más analítica cuando entren conversaciones reales por WhatsApp/teléfono.)_

## 10. Lo que necesito de ti para activar
- **Cuenta OpenRouter** + `OPENROUTER_API_KEY` (y elegir modelo barato).
- Decisión de §3 (cliente nuevo por teléfono).
- Más adelante (FASE B): número de WhatsApp y plataforma de voz + número de teléfono.
