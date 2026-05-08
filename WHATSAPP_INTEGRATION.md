# 📱 MassFlow - Integración WhatsApp

**Estado**: 🔴 Pendiente de implementación  
**Última actualización**: 2026-05-08  
**Responsable**: Claude + Oscar

---

## 🎯 Objetivo General

Crear un sistema de atención al cliente por WhatsApp que se integre completamente con la base de datos de MassFlow (Supabase), permitiendo a clientes:
1. Reservar citas de masaje
2. Cancelar reservas
3. Consultar disponibilidad
4. Ver precios y servicios
5. Verificar si llega a su zona
6. Consultar estado de reserva

**Resultado esperado**: Las reservas hechas por WhatsApp aparecen automáticamente en el panel de admin y en el del masajista asignado.

---

## 📚 STACK TECNOLÓGICO

| Componente | Tecnología | Propósito |
|-----------|-----------|----------|
| Frontend/Backend | Next.js (Vercel) | API routes + interfaz |
| Base de datos | Supabase (PostgreSQL) | Datos persistentes |
| Orquestación | n8n | Flujos de conversación |
| IA/NLP | Claude Haiku (Anthropic API) | Clasificar intenciones |
| Mensajería | WhatsApp Business Cloud API (Meta) | Canal de comunicación |
| Deploy | Vercel | Hosting de Next.js |

---

## 🏗️ ARQUITECTURA DEL SISTEMA

```
┌─────────────────┐
│   Cliente       │
│ (WhatsApp)      │
└────────┬────────┘
         │ 1. Escribe mensaje
         │
         ▼
┌────────────────────────────────────────┐
│  WhatsApp Cloud API (Meta)             │
│  Webhook POST /api/whatsapp/webhook    │
└────────┬───────────────────────────────┘
         │ 2. Reenvía webhook
         │
         ▼
┌────────────────────────────────────────┐
│  Next.js Backend (Vercel)              │
│  - Verifica firma de Meta              │
│  - Responde 200 OK inmediatamente      │
│  - Reenvía a n8n de forma asíncrona    │
└────────┬───────────────────────────────┘
         │ 3. POST a n8n webhook
         │
         ▼
┌────────────────────────────────────────┐
│  n8n (Orquestación)                    │
│  - Router principal                    │
│  - Flujos específicos (reservar, etc)  │
│  - Llamadas a Claude Haiku             │
└────────┬───────────────────────────────┘
         │ 4. Lee/escribe datos
         │ 5. Clasifica intención
         │ 6. Ejecuta flujo
         │
         ▼
┌────────────────────────────────────────┐
│  Supabase (PostgreSQL)                 │
│  - clientes, masajistas                │
│  - disponibilidad, citas               │
│  - conversaciones_whatsapp (estado)    │
└────────┬───────────────────────────────┘
         │ 7. Consulta/guarda datos
         │
         ▼
┌────────────────────────────────────────┐
│  Claude Haiku (Anthropic)              │
│  Clasifica: RESERVAR_CITA, CANCELAR... │
└────────────────────────────────────────┘
         │ 8. n8n construye respuesta
         │ 9. Envía por WhatsApp Cloud API
         │
         ▼
┌────────────────────────────────────────┐
│  Cliente recibe respuesta               │
└────────────────────────────────────────┘
```

---

## 💡 INTENCIONES A DETECTAR

El sistema debe clasificar cada mensaje en UNA de estas categorías:

| Intención | Descripción | Ejemplo |
|-----------|------------|---------|
| `RESERVAR_CITA` | Quiere agendar un masaje | "Quiero una cita para mañana" |
| `CANCELAR_CITA` | Desea cancelar una reserva | "Cancela mi cita de hoy" |
| `CONSULTAR_DISPONIBILIDAD` | Pregunta sobre horarios libres | "¿Tienen disponible viernes?" |
| `CONSULTAR_PRECIOS` | Pregunta cuánto cuesta | "¿Cuánto cuesta el masaje?" |
| `CONSULTAR_SERVICIOS` | Pregunta tipos de masaje | "¿Qué tipos de masaje tienen?" |
| `CONSULTAR_ZONA` | Pregunta si llegan a su zona | "¿Llegan a Chamberí?" |
| `ESTADO_RESERVA` | Pregunta estado de su cita | "¿Cuál es el estado de mi reserva?" |
| `SALUDO` | Saludos iniciales | "Hola", "Buenos días" |
| `NO_ENTENDIDO` | Mensaje ambiguo o fuera de contexto | Después de 2 intentos fallidos → escala a humano |

---

## 📊 MODELO DE DATOS EN SUPABASE

### Tablas Existentes (ya creadas)
- `profiles`, `masajistas`, `clientes`, `servicios`, `reservas`, etc.

### Tablas Nuevas a Crear

#### 1. `disponibilidad` (actualizar/expandir)
```sql
CREATE TABLE disponibilidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masajista_id UUID NOT NULL REFERENCES masajistas(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  disponible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(masajista_id, fecha, hora_inicio)
);
```

#### 2. `conversaciones_whatsapp` (NUEVA - Crítica)
```sql
CREATE TABLE conversaciones_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  numero_whatsapp TEXT NOT NULL UNIQUE,
  estado_flujo TEXT NOT NULL DEFAULT 'INICIO', -- INICIO, RESERVAR_PASO_1, RESERVAR_PASO_2, etc.
  paso_actual INT NOT NULL DEFAULT 0,
  datos_temporales JSONB NOT NULL DEFAULT '{}', -- {tipo_masaje, fecha, hora, direccion, etc}
  intentos_no_entendido INT NOT NULL DEFAULT 0,
  requiere_humano BOOLEAN NOT NULL DEFAULT false,
  humano_asignado UUID REFERENCES profiles(id),
  ultima_interaccion TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 3. `mensajes_whatsapp` (NUEVA - Logging)
```sql
CREATE TABLE mensajes_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id UUID NOT NULL REFERENCES conversaciones_whatsapp(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrante', 'saliente')), -- entrante=del cliente, saliente=del bot
  contenido TEXT NOT NULL,
  intencion_detectada TEXT, -- La categoría detectada por Haiku
  confianza DECIMAL(3,2), -- 0.0 a 1.0
  error_processing TEXT, -- Si hubo error, guardar aquí
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 4. `configuracion_whatsapp` (NUEVA - Settings)
```sql
CREATE TABLE configuracion_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT NOT NULL UNIQUE,
  valor JSONB NOT NULL,
  descripcion TEXT,
  admin_id UUID NOT NULL REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Insertará: precios_response, servicios_response, zonas_cobertura, mensaje_bienvenida, etc.
```

---

## 🗣️ FLUJO CONVERSACIONAL DE RESERVA (El más complejo)

### Paso a Paso:
```
Cliente: "Quiero una cita"
Bot: "¡Hola! ¿Qué tipo de masaje te interesa? 
     1. Relajante ($55)
     2. Descontracturante ($60)
     3. Deportivo ($70)
     4. Prenatal ($58)"

Cliente: "Relajante"
Bot: "¿Para qué fecha? Responde en formato DD/MM/YYYY (ej: 15/05/2026)"

Cliente: "15/05"
Bot: "¿A qué hora? Responde en formato HH:MM (ej: 14:00)"

Cliente: "14:00"
Bot: "¿Cuál es la dirección de tu domicilio?"

Cliente: "Calle Alcalá 123, Madrid"
[Bot consulta Supabase]
Bot: "✓ Encontramos disponibilidad. Laura está disponible a las 14:00.
     Confirma con 'SI' para agendar o 'NO' para cancelar"

Cliente: "SI"
[Bot crea cita en Supabase + notifica masajista]
Bot: "¡Cita confirmada! 📅
     📍 Calle Alcalá 123
     👩‍⚕️ Masajista: Laura
     ⏰ 15/05/2026 - 14:00
     💰 $55
     Tu código de reserva: MF-2026-00152"
```

### Máquina de Estados:
```
INICIO
  ↓
RESERVAR_PASO_1: Pregunta tipo (estado_flujo guardado en BD)
  ↓
RESERVAR_PASO_2: Pregunta fecha
  ↓
RESERVAR_PASO_3: Pregunta hora
  ↓
RESERVAR_PASO_4: Pregunta dirección
  ↓
RESERVAR_PASO_5: Consulta disponibilidad en Supabase
  ├─ Si NO hay disponibilidad → ofrecer alternativas
  └─ Si SÍ hay → ir a RESERVAR_PASO_6
  ↓
RESERVAR_PASO_6: Pedir confirmación (SI/NO)
  ├─ SI → crear en tabla `citas` + notificar masajista
  └─ NO → volver a INICIO
  ↓
COMPLETADO
```

---

## 🔌 SERVIDOR WEBHOOK (Next.js API Routes)

### Endpoints a crear:

1. **GET `/api/whatsapp/webhook`**
   - Verifica `hub.verify_token` contra `WEBHOOK_VERIFY_TOKEN`
   - Responde con `hub.challenge` (handshake de Meta)

2. **POST `/api/whatsapp/webhook`**
   - Recibe webhook de Meta
   - Valida firma: `X-Hub-Signature-256` contra `WHATSAPP_ACCESS_TOKEN`
   - Responde `200 OK` INMEDIATAMENTE (crítico: <5 segundos)
   - Reenvía a n8n de forma asíncrona (non-blocking)
   - Loguea en tabla `mensajes_whatsapp`

3. **POST `/api/whatsapp/send`**
   - Endpoint interno para que n8n envíe mensajes
   - Autenticación: bearer token interno
   - Llama a WhatsApp Cloud API
   - Reintentos: máximo 3 con backoff exponencial
   - Rate limiting: máximo 80 mensajes/min (límite de Meta)

---

## 🤖 FLUJOS EN N8N

### Flujos a Crear (6 workflows):

#### 1️⃣ `whatsapp-router` (Principal)
- **Entrada**: Webhook POST desde `/api/whatsapp/webhook`
- **Lógica**:
  1. Extrae número WhatsApp y mensaje
  2. Busca o crea entrada en `conversaciones_whatsapp`
  3. Obtiene estado actual del flujo
  4. Llama a Claude Haiku para clasificar intención
  5. SWITCH según intención:
     - RESERVAR_CITA → llama `flow-reservar-cita`
     - CANCELAR_CITA → llama `flow-cancelar-cita`
     - CONSULTAR_DISPONIBILIDAD → llama `flow-consultar-disponibilidad`
     - CONSULTAR_PRECIOS → llama `flow-respuestas-estaticas`
     - CONSULTAR_SERVICIOS → llama `flow-respuestas-estaticas`
     - CONSULTAR_ZONA → llama `flow-respuestas-estaticas`
     - ESTADO_RESERVA → busca en Supabase
     - SALUDO → respuesta canned
     - NO_ENTENDIDO → maneja fallback

#### 2️⃣ `flow-reservar-cita` (Multi-paso)
- **Entrada**: intención=RESERVAR_CITA + estado_flujo actual
- **Lógica**:
  1. Revisa `paso_actual` en conversaciones_whatsapp
  2. Switch por paso:
     - Paso 1: Pregunta tipo de masaje
     - Paso 2: Pregunta fecha
     - Paso 3: Pregunta hora
     - Paso 4: Pregunta dirección
  3. Valida entrada (formato fecha/hora, dirección no vacía, etc)
  4. Guarda en `datos_temporales`
  5. Incrementa `paso_actual`
  6. En paso final: consulta Supabase `disponibilidad`, crea cita, notifica masajista

#### 3️⃣ `flow-cancelar-cita`
- **Entrada**: intención=CANCELAR_CITA + cliente_id
- **Lógica**:
  1. Consulta Supabase: SELECT * FROM citas WHERE cliente_id = ? AND estado != 'cancelada'
  2. Si 0 resultados: responde "No tienes citas para cancelar"
  3. Si 1+ resultados:
     - Si 1 sola: pregunta "¿Confirmas cancelación?"
     - Si varias: enumera (1. Cita con Laura - 15/05 | 2. Cita con Sofía - 20/05) y pide elegir
  4. Actualiza tabla `citas`: estado='cancelada'
  5. Notifica masajista: "Tu cita con [cliente] fue cancelada"

#### 4️⃣ `flow-consultar-disponibilidad`
- **Entrada**: intención=CONSULTAR_DISPONIBILIDAD + fecha/rango (si cliente lo especificó)
- **Lógica**:
  1. Si cliente no especificó fecha: pregunta
  2. Consulta Supabase: SELECT * FROM disponibilidad WHERE fecha = ? AND disponible = true
  3. Si hay slots: enumera (14:00 - Laura | 15:00 - Sofía | etc.)
  4. Si no hay: ofrece fechas alternativas

#### 5️⃣ `flow-respuestas-estaticas`
- **Entrada**: intención=CONSULTAR_PRECIOS/SERVICIOS/ZONA
- **Lógica**:
  1. Consulta tabla `configuracion_whatsapp`
  2. Responde con valores configurables en el admin
  3. Ejemplo: precios_response = "Nuestros servicios: 🌸 Relajante $55, 💪 Descontracturante $60, ⚡ Deportivo $70..."

#### 6️⃣ `flow-fallback` (NO_ENTENDIDO + escalado a humano)
- **Entrada**: intención=NO_ENTENDIDO
- **Lógica**:
  1. Incrementa `intentos_no_entendido` en conversaciones_whatsapp
  2. Si intentos < 2: responde "Disculpa, no entendí. ¿Podrías reformular?" + ofrece opciones
  3. Si intentos >= 2:
     - Marca `requiere_humano=true`
     - Asigna agente disponible (desde tabla de agentes/admin)
     - Notifica al admin: "Nueva conversación requiere atención: [cliente name]"
     - Responde al cliente: "Un asesor se pondrá en contacto pronto"

---

## 🎯 PROMPT PARA CLAUDE HAIKU (Clasificador)

**Este es el prompt exacto que debe usar n8n al llamar a Claude Haiku API:**

```
Eres el clasificador de intenciones de MassFlow, un negocio de masajes a domicilio.
Dado el mensaje del cliente y el contexto, clasifica la intención en UNA de estas categorías exactas:
RESERVAR_CITA, CANCELAR_CITA, CONSULTAR_DISPONIBILIDAD, CONSULTAR_PRECIOS, CONSULTAR_SERVICIOS, CONSULTAR_ZONA, ESTADO_RESERVA, SALUDO, NO_ENTENDIDO

---
Estado actual del flujo: {estado_flujo_actual}
Paso actual: {paso_actual}
Datos temporales: {datos_temporales}
Últimos 3 mensajes: {historial_reciente}
---

Mensaje del cliente: "{mensaje}"

IMPORTANTE: 
- Si el cliente está en RESERVAR_PASO_2 y responde una fecha, clasifica como RESERVAR_CITA (no como NO_ENTENDIDO)
- Si dice "sí" o "si" después de una confirmación, es parte del mismo flujo
- Responde ÚNICAMENTE con la categoría, sin explicación, sin punto, sin comillas
```

---

## 🔐 VARIABLES DE ENTORNO NECESARIAS

Agregar a `.env.local` y a Vercel:

```env
# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WEBHOOK_VERIFY_TOKEN=your_random_verify_token

# Supabase
SUPABASE_URL=https://nqewibtmewemlqaxriko.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# n8n
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/whatsapp
N8N_AUTH_TOKEN=your_n8n_token

# Anthropic (Claude Haiku)
ANTHROPIC_API_KEY=your_anthropic_key

# Verificación interna
INTERNAL_API_KEY=random_key_for_internal_endpoints
```

---

## ⚠️ REGLAS CRÍTICAS (Para no fallar)

1. **Respuesta rápida a Meta**: Responder `200 OK` en <5 segundos ANTES de procesar
2. **Estado persistente**: Guardar SIEMPRE en `conversaciones_whatsapp`, nunca en memoria
3. **Solo Meta official**: WhatsApp Cloud API oficial, nunca `whatsapp-web.js`
4. **Resetear estado**: Si cliente no responde en 30 min, resetear `estado_flujo` a INICIO
5. **Escalado a humano**: Tras 2 NO_ENTENDIDO, marcar `requiere_humano=true` y avisar admin
6. **Validaciones**: Validar fechas (no pasadas), horas (formato 24h), direcciones (no vacías)
7. **Logging robusto**: Todos los errores en tabla `mensajes_whatsapp` + logs de aplicación
8. **Reintentos**: WhatsApp send con máximo 3 intentos + backoff exponencial
9. **Rate limiting**: Máximo 80 msgs/min (límite de Meta Free tier)
10. **Firmas válidas**: SIEMPRE validar `X-Hub-Signature-256` antes de procesar

---

## 📝 LISTA DE COMPONENTES A GENERAR

**En orden de implementación:**

- [ ] **FASE 1: Backend Base**
  - [ ] Paso 1: Crear API Routes de Next.js (webhook GET/POST + send)
  - [ ] Paso 2: Crear schema SQL de Supabase (nuevas tablas)
  - [ ] Paso 3: Configurar RLS policies

- [ ] **FASE 2: Lógica**
  - [ ] Paso 4: Módulo de gestión de estado (TypeScript)
  - [ ] Paso 5: Módulo de envío de mensajes WhatsApp
  - [ ] Paso 6: Módulo de integración con Anthropic API

- [ ] **FASE 3: Orquestación**
  - [ ] Paso 7: Crear 6 workflows en n8n (exportar JSON)
  - [ ] Paso 8: Configurar webhooks en n8n

- [ ] **FASE 4: Admin UI**
  - [ ] Paso 9: Componente React para ver conversaciones WhatsApp
  - [ ] Paso 10: Componente para responder manualmente (chat humano)
  - [ ] Paso 11: Configuración de plantillas (precios, servicios, zonas)

- [ ] **FASE 5: Testing & Go Live**
  - [ ] Paso 12: Testing end-to-end (local + staging)
  - [ ] Paso 13: Crear cuenta WhatsApp Business
  - [ ] Paso 14: Configurar webhooks en Meta
  - [ ] Paso 15: Deployment a producción

---

## 🚀 PRÓXIMOS PASOS

**Cuando empieces, iremos así:**

1. Leer esta guía completamente
2. Crear PR en GitHub con rama `feature/whatsapp`
3. Implementar **Paso 1** (API Routes)
4. Implementar **Paso 2** (SQL Schema)
5. Implementar **Paso 3** (RLS)
6. Implementar **Paso 4** (Estado management)
7. Implementar **Paso 5** (Envío mensajes)
8. Implementar **Paso 6** (Claude Haiku)
9. Crear workflows n8n
10. Crear UI admin
11. Testing completo
12. Merging a main y deployment

**Cada paso será un commit separado + branch para fácil review.**

---

## 📞 Referencias

- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [n8n Documentation](https://docs.n8n.io)
- [Anthropic Claude API](https://docs.anthropic.com)
- [Supabase PostgreSQL](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

---

**Guía creada**: 2026-05-08  
**Estado**: 🟡 PENDIENTE IMPLEMENTACIÓN  
**Próxima acción**: Confirmar que entiendes todo y comenzamos con Paso 1
