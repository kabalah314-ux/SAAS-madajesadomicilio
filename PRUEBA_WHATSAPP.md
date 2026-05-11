# 🧪 Guía de Prueba WhatsApp

## 📋 Checklist Previo

Antes de empezar, verifica que tienes:

- [ ] `.env.local` con ANTHROPIC_API_KEY
- [ ] Base de datos Supabase configurada y ejecutándose
- [ ] Node.js >=20 instalado
- [ ] npm install ejecutado

---

## ✅ OPCIÓN 1: Prueba Local Rápida (SIN API de Meta)

### Paso 1: Iniciar servidor Next.js

Terminal 1:
```bash
npm run dev
```

Deberías ver:
```
▲ Next.js 16.2.6
- Local:        http://localhost:3000
- Environments: .env.local
```

### Paso 2: Ejecutar tests automatizados

Terminal 2:
```bash
npm run test:whatsapp
```

Esto envía 5 mensajes simulados:

```
🚀 Iniciando tests de WhatsApp...
📍 Webhook URL: http://localhost:3000/api/whatsapp/webhook

🧪 Test 1: Cliente saluda
📨 Mensaje: "Hola, quiero hacer una cita"
✓ Mensaje enviado correctamente (200)

🧪 Test 2: Cliente pregunta precio
📨 Mensaje: "Cuánto cuesta un masaje relajante?"
✓ Mensaje enviado correctamente (200)

... (3 tests más)

✅ Tests completados
```

### Paso 3: Verificar logs en Terminal 1

En la terminal donde corre `npm run dev` deberías ver:

```
🧠 Intención detectada: RESERVAR_CITA (confianza: 0.95)
✓ Mensaje procesado correctamente
📨 Mensaje recibido de 34666555444: "Hola, quiero hacer una cita"
```

### Paso 4: Verificar base de datos

En Supabase Dashboard → SQL Editor:

```sql
-- Ver conversaciones creadas
SELECT id, numero_whatsapp, estado_flujo FROM public.conversaciones_whatsapp 
ORDER BY created_at DESC LIMIT 1;
```

Deberías ver:
```
id                     | numero_whatsapp | estado_flujo
abc123...              | 34666555444     | RESERVAR_CITA
```

```sql
-- Ver mensajes guardados
SELECT id, tipo, contenido, intencion_detectada, confianza 
FROM public.mensajes_whatsapp 
ORDER BY created_at DESC LIMIT 5;
```

Deberías ver 5 registros con intenciones:
- RESERVAR_CITA
- CONSULTAR_PRECIOS
- CONSULTAR_DISPONIBILIDAD
- CANCELAR_CITA
- NO_ENTENDIDO

---

## ✅ OPCIÓN 2: Prueba Real (CON API de Meta)

### Paso 1: Registrarse en Meta for Developers

1. Ir a https://developers.facebook.com
2. Create app → Business type "Personal use"
3. Nombre: `MassFlow Test`
4. Create app

### Paso 2: Agregar Producto WhatsApp

1. Dashboard → My Apps → Seleccionar tu app
2. Add Product → Buscar "WhatsApp"
3. Set up → Next
4. WhatsApp Cloud API → Continue
5. Choose how to set up → Testing mode (free)

### Paso 3: Obtener Credenciales

#### 3.1 Obtener Access Token

1. Settings → User access tokens
2. Generate token
3. Permisos: `whatsapp_business_messaging`
4. Copy token (formato: `EAABsxxxxxx...`)
5. Guardar en `.env.local`:

```env
WHATSAPP_ACCESS_TOKEN=EAABsxxxxxx
```

#### 3.2 Obtener Phone Number ID

1. WhatsApp Setup → Getting started
2. "Start with a test number"
3. Elegir país (España)
4. Se asigna automáticamente
5. Copy **Business Phone Number ID** (formato: `123456789`)
6. Guardar en `.env.local`:

```env
WHATSAPP_PHONE_NUMBER_ID=123456789
```

### Paso 4: Registrar Webhook

En Meta Dashboard:

1. Settings → Webhook configuration
2. **Callback URL:**
   - En desarrollo local: NO FUNCIONA (Meta no puede alcanzar localhost)
   - Solución: usar ngrok para exponer localhost:
   
```bash
npm install -g ngrok

# En otra terminal:
ngrok http 3000
# Obtienes: https://abcd1234.ngrok.io
```

3. Callback URL: `https://abcd1234.ngrok.io/api/whatsapp/webhook`
4. Verify token: `massflow_verify_token_2026`
5. Subscribe to webhook:
   - ✅ messages
   - ✅ message_status
6. Verify and save

### Paso 5: Probar con WhatsApp Real

1. Descarga WhatsApp en tu teléfono
2. Meta Dashboard → WhatsApp Setup → Your test message
3. Envía un mensaje de prueba desde tu teléfono
4. ¡Deberías recibir respuesta automática!

---

## 📊 Qué Esperar

### Intención: RESERVAR_CITA

**Cliente envía:**
```
Hola, quiero hacer una cita
```

**Bot responde:**
```
¡Perfecto! Te ayudaré a reservar. 

Nuestros servicios son:
1. Masaje Relajante (60 min) - €55
2. Masaje Descontracturante (60 min) - €65
3. Masaje Deportivo (60 min) - €70

¿Cuál prefieres?
```

**Cliente envía:**
```
El relajante
```

**Bot responde:**
```
Excelente, masaje relajante.

¿Qué día prefieres?
```

(Continúa por 5 pasos...)

### Intención: CONSULTAR_PRECIOS

**Cliente envía:**
```
Cuánto cuesta?
```

**Bot responde:**
```
Nuestros precios:
- Masaje Relajante 60 min: €55
- Masaje Descontracturante 60 min: €65
- Masaje Deportivo 60 min: €70
- Masaje Pareja 90 min: €140
- Drenaje Linfático 75 min: €80
```

### Intención: NO_ENTENDIDO (Escalación)

**Cliente envía 3 mensajes incomprensibles:**
```
asdfghjkl
12345
xxxxx
```

**Bot responde:**
```
Disculpa, no estoy entendiendo bien.
Por favor contacta con soporte: soporte@massflow.app
```

---

## 🐛 Troubleshooting

### Problema: "Error de conexión" en test

**Causa:** Next.js no está corriendo

**Solución:**
```bash
npm run dev
```

### Problema: "Invalid signature"

**Causa:** `.env.local` no tiene WHATSAPP_ACCESS_TOKEN correcto

**Solución:**
1. Verificar en Meta Dashboard
2. Copiar nuevamente
3. Reiniciar: `npm run dev`

### Problema: Test ejecuta pero no ve cambios en BD

**Causa:** Supabase no está corriendo

**Solución:**
```bash
supabase start  # En otra terminal
```

### Problema: IA no clasifica ("Usando heurística")

**Causa:** ANTHROPIC_API_KEY incorrecto o sin saldo

**Solución:**
1. Ir a https://console.anthropic.com
2. Verificar que tienes saldo
3. Copiar API key correctamente
4. Actualizar `.env.local`
5. Reiniciar: `npm run dev`

### Problema: Meta dice "Webhook verification failed"

**Causa:** Verify token incorrecto o URL inaccesible

**Solución:**
1. Verify token debe ser: `massflow_verify_token_2026`
2. URL debe ser HTTPS (no HTTP)
3. Usar ngrok para localhost:
   ```bash
   ngrok http 3000
   ```

---

## 📈 Métricas de Éxito

**Prueba local correcta si ves:**

- ✅ 5 mensajes procesados
- ✅ 5 intenciones clasificadas correctamente
- ✅ 0 errores en logs
- ✅ BD tiene 5 registros en `mensajes_whatsapp`
- ✅ Tiempo de respuesta <1 segundo por mensaje

**Prueba real correcta si:**

- ✅ Envías mensaje desde WhatsApp
- ✅ Bot responde automáticamente
- ✅ Respuesta es coherente con tu mensaje
- ✅ Mensaje aparece en BD
- ✅ Intención se clasificó correctamente

---

## 🎯 Próximo Paso: Completar Flujo

Una vez verificado que WhatsApp funciona:

1. [ ] Implementar formulario de pago (Stripe)
2. [ ] Crear dashboard de admin
3. [ ] Agregar SMS como alternativa
4. [ ] Ir a producción (Vercel)

---

## 📚 Referencias

- [Webhook test script](scripts/test-whatsapp.ts)
- [Webhook handler](app/api/whatsapp/webhook/route.ts)
- [Flujos de conversación](src/lib/whatsapp/flujos.ts)
- [Clasificador IA](src/lib/whatsapp/clasificador.ts)
- [Setup completo](WHATSAPP_SETUP.md)

---

**Última actualización:** 2026-05-08  
**Estado:** Ready to test
