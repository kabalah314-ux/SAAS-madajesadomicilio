# 🧪 GUÍA DE TESTING MANUAL EN NAVEGADOR

> **URL Base Production:** https://saas-madajesadomicilio.vercel.app  
> **URL Preview (feature branch):** https://saas-madajesadomicilio-cr9cifhny-kabalah314-uxs-projects.vercel.app  
> **Fecha:** 2026-05-12

---

## 🎯 ORDEN RECOMENDADO DE TESTING

```
1. Sistema base (Login, navegación, responsive)
2. Chat conversacional (funcionalidad estrella)
3. WhatsApp Integration (webhook + simulación)
4. Panel Admin (gestión de recursos)
5. Panel Masajista (disponibilidad, reservas)
6. Panel Cliente (reservas, valoraciones)
7. Flujos críticos (reserva completa, pagos)
8. Edge cases y manejo de errores
```

---

## 📦 PREPARACIÓN PREVIA

### Herramientas necesarias:
- ✅ Navegador Chrome/Edge (versión reciente)
- ✅ DevTools abierto (F12) para ver console y network
- ✅ Extensión React DevTools (opcional)
- ✅ Postman/Insomnia para probar webhooks
- ✅ Cuenta de WhatsApp Business (para pruebas reales)

### Credenciales de prueba:
```
Admin:
  Email: admin@massflow.app
  Password: [pendiente crear en Supabase]

Masajista:
  Email: masajista1@test.com
  Password: [pendiente crear]

Cliente:
  Email: cliente1@test.com
  Password: [pendiente crear]
```

---

## 1️⃣ SISTEMA BASE

### Test 1.1: Primera carga
**URL:** `/`

**Pasos:**
1. Abrir URL en navegador incógnito
2. Observar tiempo de carga (debe ser < 3s)
3. Verificar no hay errores en console
4. Verificar favicon carga correctamente

**✅ Resultado esperado:**
- Página de login carga correctamente
- Sin errores 404 en console
- Sin errores de CORS
- Tailwind CSS aplicado correctamente

---

### Test 1.2: Login - Admin
**URL:** `/`

**Pasos:**
1. Ingresar email: `admin@massflow.app`
2. Ingresar password
3. Click en "Iniciar sesión"
4. Observar redirección

**✅ Resultado esperado:**
- Redirección a `/admin/dashboard` o `/admin/chat`
- Token almacenado en localStorage (`supabase.auth.token`)
- Usuario cargado en React Context
- Sidebar visible con menú admin

**❌ Errores comunes:**
- `Invalid credentials` → verificar usuario existe en Supabase
- `CORS error` → verificar VITE_SUPABASE_URL configurado
- `Network error` → verificar conexión a Supabase

---

### Test 1.3: Login - Roles diferentes
**Pasos:**
1. Login como **Cliente** → debe redirigir a `/chat` o `/cliente/dashboard`
2. Login como **Masajista** → debe redirigir a `/masajista/reservas`
3. Login como **Admin** → debe redirigir a `/admin/chat`

**✅ Resultado esperado:**
- Cada rol ve su interfaz específica
- Sidebar muestra opciones según rol
- No puede acceder a rutas de otros roles (probar manualmente `/admin/chat` como cliente)

---

### Test 1.4: Responsive Design
**Pasos:**
1. Abrir DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Probar resoluciones:
   - Mobile: 375x667 (iPhone SE)
   - Tablet: 768x1024 (iPad)
   - Desktop: 1920x1080

**✅ Resultado esperado:**
- Mobile: Menú hamburguesa visible, sidebar colapsado
- Tablet: Layout adaptado, sin scroll horizontal
- Desktop: Sidebar fijo, todas las columnas visibles
- Texto legible en todas las resoluciones

---

### Test 1.5: Logout
**Pasos:**
1. Estando logueado, click en avatar/menú usuario
2. Click en "Cerrar sesión"
3. Verificar redirección a `/`
4. Intentar acceder manualmente a `/admin/chat`

**✅ Resultado esperado:**
- Session limpiada de Supabase
- localStorage limpio
- Redirección a login al intentar acceder rutas protegidas

---

## 2️⃣ CHAT CONVERSACIONAL ⭐ (Funcionalidad Estrella)

### Test 2.1: Flujo completo de reserva conversacional
**URL:** `/chat` (como cliente) o `/admin/chat` (simulación admin)

**Escenario:** Cliente nuevo quiere reservar masaje

**Pasos:**
1. Escribir: "Hola, quiero reservar un masaje"
2. Bot debe preguntar: "¿Qué tipo de masaje te gustaría?"
3. Responder: "Relajante"
4. Bot pregunta: "¿Para cuándo?"
5. Responder: "Mañana a las 18:00"
6. Bot pregunta: "¿En qué zona?"
7. Responder: "Madrid centro, calle Alcalá 100"
8. Bot pregunta: "¿Alguna preferencia especial?"
9. Responder: "No, gracias"
10. Bot muestra resumen y pregunta confirmación

**✅ Resultado esperado:**
- Conversación fluida, sin repetir preguntas
- Contexto mantenido entre mensajes
- Validaciones en tiempo real (fecha futura, dirección válida)
- Resumen final incluye todos los datos capturados
- Estado guardado en `conversaciones_whatsapp` (ver DB)

**❌ Errores comunes:**
- Bot repite pregunta → problema en `clasificador-multitenant.ts`
- Bot no entiende respuesta → clasificación errónea, usar heurística fallback
- Contexto perdido → revisar `datos_temporales` en DB

---

### Test 2.2: Micro-preguntas progresivas
**Escenario:** Validar que el bot pregunta UNA cosa a la vez

**Pasos:**
1. Escribir: "Quiero masaje"
2. Bot pregunta solo sobre TIPO
3. Responder: "Descontracturante"
4. Bot pregunta solo sobre FECHA/HORA
5. Responder: "Pasado mañana"
6. Bot pregunta solo sobre HORA específica
7. Responder: "Por la tarde"
8. Bot pregunta: "¿A qué hora exactamente? Ej: 16:00, 18:00"

**✅ Resultado esperado:**
- Máximo 1 pregunta por mensaje
- Preguntas específicas, no genéricas
- Ejemplos en lenguaje natural
- Sin abrumar al usuario

---

### Test 2.3: Manejo de respuestas ambiguas
**Pasos:**
1. Escribir: "Hola"
2. Bot responde con saludo + opciones claras
3. Escribir: "xyz123 asdfg" (texto sin sentido)
4. Bot responde: "No entendí, ¿podrías reformular?"
5. Máximo 3 intentos, luego escala a humano

**✅ Resultado esperado:**
- `NO_ENTENDIDO` clasificado correctamente
- Contador `intentos_no_entendido` incrementa
- Después de 3 intentos: "Te conectaré con un asesor"
- Estado cambia a `escalado_humano`

---

### Test 2.4: Cancelación mid-flow
**Pasos:**
1. Iniciar flujo de reserva
2. A mitad (después de preguntar tipo), escribir: "Cancelar"
3. Bot debe confirmar: "¿Seguro quieres cancelar?"
4. Responder: "Sí"
5. Bot resetea conversación

**✅ Resultado esperado:**
- Estado cambia a `inicial`
- `datos_temporales` limpiados
- Mensaje de despedida amable

---

### Test 2.5: Consultas informativas (sin reserva)
**Pasos:**
1. Escribir: "¿Cuánto cuesta un masaje relajante?"
2. Bot responde con precio (desde tabla `servicios`)
3. Escribir: "¿Trabajáis en Majadahonda?"
4. Bot consulta zonas de cobertura
5. Escribir: "Gracias, adiós"
6. Bot responde sin forzar reserva

**✅ Resultado esperado:**
- Intenciones `CONSULTAR_PRECIOS`, `CONSULTAR_ZONA` clasificadas
- Respuestas desde base de datos real
- No fuerza flujo de reserva innecesariamente

---

### Test 2.6: Lead capture persistente
**Escenario:** Usuario abandona conversación sin completar reserva

**Pasos:**
1. Iniciar reserva, dar nombre y teléfono
2. Cerrar navegador SIN completar
3. Ir a Supabase → tabla `leads`
4. Verificar lead guardado con datos parciales

**✅ Resultado esperado:**
- Lead creado con `status: 'incompleto'`
- Datos capturados hasta el momento guardados en `datos_capturados`
- `fecha_ultimo_mensaje` actualizada
- Admin puede ver en panel `/admin/chat` pestaña "Leads"

---

## 3️⃣ WHATSAPP INTEGRATION

### Test 3.1: Webhook - Verificación inicial
**URL:** `/api/whatsapp/webhook` (GET)

**Usando Postman/cURL:**
```bash
curl -X GET "https://saas-madajesadomicilio.vercel.app/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=TU_VERIFY_TOKEN&hub.challenge=CHALLENGE_STRING"
```

**✅ Resultado esperado:**
- Respuesta 200 con `CHALLENGE_STRING` en body
- Si token incorrecto: 403 Forbidden

---

### Test 3.2: Webhook - Recepción de mensaje
**URL:** `/api/whatsapp/webhook` (POST)

**Payload de prueba:**
```bash
curl -X POST https://saas-madajesadomicilio.vercel.app/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "34612345678",
            "id": "wamid.test123",
            "timestamp": "1683900000",
            "text": { "body": "Hola, quiero un masaje" },
            "type": "text"
          }],
          "metadata": {
            "phone_number_id": "123456789",
            "display_phone_number": "34600000000"
          }
        }
      }]
    }]
  }'
```

**✅ Resultado esperado:**
1. Respuesta 200 OK
2. Verificar en Supabase:
   - Tabla `conversaciones_whatsapp`: nueva fila con `telefono_cliente: +34612345678`
   - `estado_flujo: 'capturando_datos'`
   - `intencion_actual: 'RESERVAR_CITA'`
3. Verificar en logs Vercel (si hay acceso):
   - Log: "Mensaje clasificado como RESERVAR_CITA"

---

### Test 3.3: Webhook - Manejo de errores
**Pasos:**
1. Enviar webhook con payload malformado (sin `messages`)
2. Enviar webhook con `type: "image"` (no soportado aún)
3. Enviar webhook sin campo `from`

**✅ Resultado esperado:**
- Respuesta 200 (no rompe el webhook)
- Logs internos con error descriptivo
- No crashea el sistema

---

### Test 3.4: Envío de respuesta a WhatsApp
**Nota:** Requiere credenciales reales de WhatsApp Business API

**Pasos:**
1. Tener conversación activa en DB
2. Llamar endpoint `/api/whatsapp/send` (POST)
3. Payload:
```json
{
  "to": "34612345678",
  "message": "Hola, ¿en qué puedo ayudarte?",
  "empresa_id": "uuid-empresa"
}
```

**✅ Resultado esperado:**
- Respuesta 200 con `message_id` de WhatsApp
- Mensaje recibido en teléfono real
- Log en Supabase `mensajes_enviados` (si existe tabla)

---

## 4️⃣ PANEL ADMIN

### Test 4.1: Dashboard - KPIs
**URL:** `/admin/dashboard`

**Pasos:**
1. Login como admin
2. Verificar cards de métricas cargan:
   - Reservas del mes
   - Ingresos del mes
   - Masajistas activos
   - Clientes activos
3. Verificar gráfico de tendencias carga

**✅ Resultado esperado:**
- Datos desde vista `v_admin_kpis` en Supabase
- Números actualizados en tiempo real
- Sin "Loading..." infinito

---

### Test 4.2: Gestión de Masajistas
**URL:** `/admin/masajistas`

**Pasos:**
1. Ver lista de masajistas
2. Filtrar por estado: "Pendientes verificación"
3. Click en masajista específico → abrir modal
4. Ver documentos subidos (DNI, Seguro RC)
5. Verificar documentos → cambiar estado a "Verificado"
6. Descargar PDF desde Storage

**✅ Resultado esperado:**
- Tabla `masajistas` cargada con join a `profiles`
- Filtros funcionales
- Modal muestra detalle completo
- Botones de acción ejecutan mutations
- Storage bucket `documentos` accesible (admin puede leer todo)

---

### Test 4.3: Chat Admin - Vista de conversaciones
**URL:** `/admin/chat`

**Pasos:**
1. Ver lista de conversaciones activas (panel izquierdo)
2. Ver conversaciones pendientes vs. en curso vs. completadas
3. Click en conversación → ver histórico completo
4. "Tomar control" de conversación (cambiar de bot a humano)
5. Escribir mensaje manual
6. Cerrar conversación

**✅ Resultado esperado:**
- Lista desde `conversaciones_whatsapp` ordenada por `updated_at DESC`
- Histórico desde tabla `mensajes` (si existe) o `datos_temporales`
- Estado cambia a `escalado_humano` al tomar control
- Mensajes manuales guardados con `is_from_bot: false`

---

### Test 4.4: Gestión de Servicios
**URL:** `/admin/servicios`

**Pasos:**
1. Ver lista de servicios
2. Click "Nuevo Servicio"
3. Crear servicio:
   - Nombre: "Masaje Piedras Calientes"
   - Duración: 90 min
   - Precio: 85€
   - Descripción: "Terapia con piedras volcánicas"
4. Guardar
5. Editar servicio existente (cambiar precio)
6. Desactivar servicio

**✅ Resultado esperado:**
- Formulario validado (precio > 0, duración > 0)
- INSERT en tabla `servicios`
- Servicio aparece inmediatamente en lista
- Servicio desactivado NO aparece en chat conversacional

---

### Test 4.5: Configuración Global
**URL:** `/admin/configuracion`

**Pasos:**
1. Ver configuración actual:
   - Comisión plataforma: 25%
   - Precio máximo: 200€
   - Horas cancelación: 24h
2. Cambiar comisión a 20%
3. Guardar
4. Verificar cambio reflejado en nuevas reservas

**✅ Resultado esperado:**
- Datos desde tabla `configuracion`
- UPDATE ejecutado correctamente
- Validaciones (comisión entre 0-100%)
- Notificación success al guardar

---

## 5️⃣ PANEL MASAJISTA

### Test 5.1: Disponibilidad Semanal
**URL:** `/masajista/disponibilidad`

**Pasos:**
1. Login como masajista
2. Ver calendario semanal
3. Marcar disponibilidad:
   - Lunes 09:00 - 13:00
   - Lunes 16:00 - 20:00
   - Miércoles 10:00 - 14:00
4. Guardar
5. Verificar bloques creados en tabla `disponibilidad`

**✅ Resultado esperado:**
- INSERT múltiple en `disponibilidad`
- Bloques visibles en calendario
- No permite overlaps (09:00-13:00 y 10:00-14:00 en mismo día)

---

### Test 5.2: Reservas Pendientes
**URL:** `/masajista/reservas`

**Pasos:**
1. Ver lista de solicitudes pendientes
2. Click en reserva → ver detalle:
   - Servicio solicitado
   - Fecha/hora
   - Dirección cliente
   - Precio (con comisión)
3. Aceptar reserva
4. Verificar cambio de estado a "aceptada"
5. Verificar notificación enviada a cliente

**✅ Resultado esperado:**
- RLS permite solo reservas donde `masajista_id = auth.uid()`
- UPDATE cambia `estado: 'aceptada'`
- Trigger `notify_reserva_event` crea notificación
- Tabla `notificaciones`: nueva fila para `cliente_id`

---

### Test 5.3: Rechazar Reserva
**Pasos:**
1. Click "Rechazar" en reserva pendiente
2. Escribir motivo: "No tengo disponibilidad ese día"
3. Confirmar
4. Verificar estado cambia a "rechazada"
5. Cliente recibe notificación

**✅ Resultado esperado:**
- Campo `rechazo_motivo` poblado
- Notificación con tipo `reserva_rechazada`
- Masajista NO recibe penalización (futura funcionalidad)

---

### Test 5.4: Completar Sesión
**Pasos:**
1. Tener reserva en estado "aceptada"
2. Pasar fecha/hora de la cita
3. Click "Marcar como completada"
4. Verificar estado cambia a "completada"
5. Verificar `pago_estado` sigue en "pendiente" (hasta recibir pago Stripe)

**✅ Resultado esperado:**
- `completada_en` = timestamp actual
- Trigger recalcula `total_sesiones` del masajista
- Cliente puede ahora valorar (botón "Valorar" aparece)

---

### Test 5.5: Historial de Pagos
**URL:** `/masajista/pagos`

**Pasos:**
1. Ver lista de transferencias recibidas
2. Ver ciclos de pago cerrados
3. Ver monto pendiente de transferir

**✅ Resultado esperado:**
- Datos desde vista `v_pagos_pendientes_masajista`
- Tabla `transferencias` con estado "confirmada"
- Monto pendiente = suma de `pago_masajista` donde reserva completada pero NO transferida

---

## 6️⃣ PANEL CLIENTE

### Test 6.1: Nueva Reserva Manual
**URL:** `/cliente/nueva-reserva`

**Pasos:**
1. Seleccionar servicio: "Masaje Descontracturante"
2. Seleccionar fecha: mañana
3. Seleccionar hora: 18:00
4. Ingresar dirección: "Calle Mayor 50, Madrid"
5. Notas: "Tengo lesión en hombro derecho"
6. Click "Solicitar Reserva"

**✅ Resultado esperado:**
- INSERT en tabla `reservas`
- Comisión calculada automáticamente (25% configurado)
- `estado: 'pendiente'`
- Masajista disponible asignado (o NULL si es solicitud abierta)

---

### Test 6.2: Mis Reservas
**URL:** `/cliente/reservas`

**Pasos:**
1. Ver tabs: Pendientes / Confirmadas / Completadas / Canceladas
2. Click en reserva → ver detalle
3. Ver botón "Cancelar" solo en pendientes/confirmadas (24h antes)
4. Cancelar reserva con motivo

**✅ Resultado esperado:**
- RLS filtra solo `cliente_id = auth.uid()`
- Tabs filtran por estado correctamente
- Botón "Cancelar" deshabilitado si < 24h
- UPDATE cambia estado + guarda `cancelacion_motivo`

---

### Test 6.3: Valorar Servicio
**Pasos:**
1. Tener reserva en estado "completada"
2. Click "Valorar"
3. Seleccionar estrellas: 5/5
4. Comentario: "Excelente profesional, muy recomendable"
5. Enviar

**✅ Resultado esperado:**
- INSERT en tabla `valoraciones`
- Trigger `recalc_rating_masajista` actualiza `rating_promedio`
- Valoración visible en perfil público del masajista
- Cliente NO puede valorar dos veces la misma reserva

---

### Test 6.4: Pago con Stripe
**Pasos:**
1. Tener reserva en estado "aceptada"
2. Click "Pagar ahora"
3. Cargar Stripe Elements (tarjeta)
4. Usar tarjeta de prueba: `4242 4242 4242 4242`, cualquier CVV/fecha futura
5. Confirmar pago

**✅ Resultado esperado:**
1. Frontend llama `/api/payments/create-intent` (Edge Function)
2. Recibe `client_secret`
3. Stripe Elements confirma pago
4. Webhook `/api/whatsapp/webhook` (Stripe) recibe `payment_intent.succeeded`
5. Tabla `pagos_stripe`: estado "pagado"
6. Tabla `reservas`: `pago_estado: 'pagado'`

**❌ Errores comunes:**
- `CORS error` → verificar Stripe publishable key correcta
- `Webhook 403` → verificar signing secret configurado
- Pago exitoso pero estado NO actualiza → revisar webhook handler

---

## 7️⃣ FLUJOS CRÍTICOS END-TO-END

### Test 7.1: Reserva completa (Cliente → Masajista → Pago → Valoración)

**Actores:** Cliente + Masajista + Stripe

**Pasos:**
1. **Cliente:** Crear reserva vía chat conversacional
2. **Sistema:** Asignar masajista disponible
3. **Masajista:** Recibir notificación, aceptar reserva
4. **Cliente:** Recibir confirmación, pagar con Stripe
5. **Sistema:** Webhook actualiza pago
6. **Masajista:** Completar sesión
7. **Cliente:** Valorar servicio

**✅ Resultado esperado:**
- Estado evoluciona: `pendiente` → `aceptada` → `completada`
- Pago: `pendiente` → `pagado`
- Valoración insertada, rating actualizado
- 4 notificaciones creadas (solicitud, aceptación, pago, valoración)

**⏱️ Tiempo estimado:** 10-15 min

---

### Test 7.2: WhatsApp → Reserva → Pago Real

**Requisitos:** WhatsApp Business API configurado

**Pasos:**
1. Enviar mensaje de WhatsApp real desde teléfono móvil
2. Bot responde automáticamente
3. Completar flujo conversacional vía WhatsApp
4. Recibir link de pago en WhatsApp
5. Pagar desde móvil
6. Recibir confirmación en WhatsApp

**✅ Resultado esperado:**
- Webhook recibe mensaje
- Conversación procesada con IA (Perplexity/OpenAI)
- Respuestas enviadas a WhatsApp
- Link de pago generado con Stripe
- Pago confirmado vía webhook

---

## 8️⃣ MULTI-TENANT

### Test 8.1: Aislamiento de datos entre empresas
**Requisitos:** 2 empresas diferentes configuradas en `empresas` table

**Pasos:**
1. Crear reserva con `empresa_id: empresa-A`
2. Login como admin de empresa-B
3. Intentar ver reserva de empresa-A
4. Verificar RLS bloquea acceso

**✅ Resultado esperado:**
- Query devuelve 0 filas
- No error visible en UI
- Log de seguridad (si implementado)

---

### Test 8.2: Cambio de proveedor de IA
**URL:** `/admin/configuracion/ia`

**Pasos:**
1. Ver proveedor actual: Perplexity
2. Cambiar a OpenAI
3. Ingresar API key de OpenAI
4. Guardar
5. Probar chat → debe usar OpenAI
6. Verificar tabla `uso_ia_registro` registra provider correcto

**✅ Resultado esperado:**
- UPDATE en `empresas`: `ai_provider: 'openai'`
- Siguiente clasificación usa OpenAI
- Facturación registrada correctamente
- Fallback a heurística si API key inválida

---

## 9️⃣ EDGE CASES Y ERRORES

### Test 9.1: Concurrencia - Doble reserva mismo horario
**Pasos:**
1. Cliente-A crea reserva: Masajista-X, mañana 18:00
2. Antes de que Masajista-X acepte...
3. Cliente-B crea reserva: Masajista-X, mañana 18:00
4. Masajista-X acepta ambas

**✅ Resultado esperado:**
- Segunda reserva rechazada automáticamente (constraint DB)
- O: Masajista solo puede aceptar una (botón deshabilitado)
- Cliente-B recibe notificación de no disponibilidad

---

### Test 9.2: Expiración de solicitudes
**Pasos:**
1. Crear reserva pendiente
2. Esperar 60 minutos sin que masajista responda
3. Verificar estado cambia a "expirada" (cron job o webhook)

**✅ Resultado esperado:**
- Campo `expira_en` = timestamp + 60min
- Cron ejecuta función que UPDATE estados expirados
- Cliente recibe notificación

---

### Test 9.3: Reembolso Stripe
**Pasos:**
1. Tener reserva pagada
2. Admin o sistema cancela reserva (> 24h antes)
3. Llamar Stripe refund API
4. Webhook recibe `charge.refunded`
5. Verificar estado actualiza

**✅ Resultado esperado:**
- `pago_estado: 'reembolsado'`
- Cliente recibe email de Stripe
- Tabla `pagos_stripe` con `raw_event` del refund

---

### Test 9.4: Manejo sin conexión Supabase
**Pasos:**
1. Cambiar `.env` a URL inválida: `VITE_SUPABASE_URL=https://fake.supabase.co`
2. Rebuild
3. Intentar login

**✅ Resultado esperado:**
- Error manejado gracefully
- Mensaje: "Error de conexión, intenta de nuevo"
- No crash de la app
- Logs en Sentry (si configurado)

---

### Test 9.5: XSS y SQL Injection
**Pasos:**
1. En chat, escribir: `<script>alert('XSS')</script>`
2. Verificar no ejecuta JavaScript
3. En búsqueda de masajistas, ingresar: `'; DROP TABLE masajistas; --`
4. Verificar query parametrizada previene inyección

**✅ Resultado esperado:**
- `<script>` renderizado como texto escapado
- Supabase RPC previene SQL injection
- Validación frontend + backend

---

## 🔥 PERFORMANCE TESTING

### Test 10.1: Lighthouse Score
**Pasos:**
1. Abrir DevTools → Lighthouse
2. Ejecutar audit en modo incógnito
3. Categorías: Performance, Accessibility, Best Practices, SEO

**✅ Resultado esperado:**
- Performance: > 80
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 80

---

### Test 10.2: Network Throttling
**Pasos:**
1. DevTools → Network → Slow 3G
2. Cargar página
3. Verificar spinners/skeletons durante carga
4. Verificar no se rompe UI

**✅ Resultado esperado:**
- Carga completa < 10s en 3G
- Loading states visibles
- Imágenes lazy-loaded

---

### Test 10.3: Carga de 100+ registros
**Pasos:**
1. Seed DB con 100 masajistas
2. Cargar `/admin/masajistas`
3. Verificar paginación funciona
4. Verificar scroll virtual (si implementado)

**✅ Resultado esperado:**
- Sin lag en UI
- Paginación: 20 items por página
- Búsqueda/filtros rápidos (< 500ms)

---

## 📋 CHECKLIST FINAL

Marca cada sección al completar:

```
[ ] 1. Sistema Base (5 tests)
[ ] 2. Chat Conversacional (6 tests) ⭐
[ ] 3. WhatsApp Integration (4 tests)
[ ] 4. Panel Admin (5 tests)
[ ] 5. Panel Masajista (5 tests)
[ ] 6. Panel Cliente (4 tests)
[ ] 7. Flujos Críticos E2E (2 tests)
[ ] 8. Multi-Tenant (2 tests)
[ ] 9. Edge Cases (5 tests)
[ ] 10. Performance (3 tests)
```

**Total:** 41 tests

---

## 🐛 REPORTE DE BUGS

### Plantilla para reportar:
```
**Test:** [Número y nombre del test]
**URL:** [URL donde ocurrió]
**Pasos para reproducir:**
1. ...
2. ...
3. ...

**Resultado esperado:** ...
**Resultado actual:** ...
**Captura de pantalla:** [adjuntar]
**Console errors:** [copiar errores de DevTools]
**Severidad:** [Crítico / Alto / Medio / Bajo]
```

---

## 📊 MÉTRICAS DE ÉXITO

### Criterios de aceptación:
- ✅ **90%+ tests pasados** → Ready for production
- ⚠️ **80-89% tests pasados** → Bugs menores, fix antes de launch
- ❌ **< 80% tests pasados** → Bugs críticos, NO lanzar

### Prioridad de fixes:
1. **P0 (Blocker):** Login falla, pagos no procesan, data loss
2. **P1 (Crítico):** Chat no responde, notificaciones no llegan
3. **P2 (Importante):** UX pobre, performance lento
4. **P3 (Nice-to-have):** UI glitches menores, typos

---

**Última actualización:** 2026-05-12  
**Creado por:** Claude AI  
**Versión:** 1.0
