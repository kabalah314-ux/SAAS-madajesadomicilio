# 📱 Configuración de WhatsApp - MassFlow

## ✅ Lo que YA está listo

1. ✅ **Base de datos**: Migración SQL creada (`0006_whatsapp_schema.sql`)
2. ✅ **Backend completo**: Todos los módulos de lógica conversacional
3. ✅ **API Routes**: Webhooks de WhatsApp listos
4. ✅ **Clasificador IA**: Integración con Claude Haiku
5. ✅ **Flujos**: Reservar, cancelar, consultar precios, etc.

---

## 🚀 Pasos para activar WhatsApp

### PASO 1: Aplicar migración SQL

```bash
# Si tienes Supabase CLI configurado:
supabase db push

# O manualmente:
# 1. Ir a Supabase Dashboard → SQL Editor
# 2. Copiar contenido de supabase/migrations/0006_whatsapp_schema.sql
# 3. Ejecutar
```

### PASO 2: Crear cuenta WhatsApp Business

1. Ir a https://developers.facebook.com/
2. Crear una app de tipo "Business"
3. Agregar producto "WhatsApp"
4. Seguir el wizard para:
   - Verificar tu número de teléfono
   - Obtener un número de prueba (o usar tu número)
   - Conseguir el **Phone Number ID** y **Access Token**

### PASO 3: Configurar variables de entorno

Crear `.env.local` (o actualizar el existente):

```env
# Supabase (ya lo tienes)
NEXT_PUBLIC_SUPABASE_URL=https://nqewibtmewemlqaxriko.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key

# Supabase Service Role (para backend)
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id_de_meta
WHATSAPP_ACCESS_TOKEN=tu_access_token_de_meta
WEBHOOK_VERIFY_TOKEN=massflow_verify_token_2026

# Anthropic API (para Claude Haiku)
ANTHROPIC_API_KEY=tu_anthropic_api_key

# Internal (no cambiar)
INTERNAL_API_KEY=massflow_internal_2026
```

**Dónde conseguir cada una:**

- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard → Settings → API → service_role key
- `WHATSAPP_PHONE_NUMBER_ID`: Meta Developer Console → WhatsApp → API Setup
- `WHATSAPP_ACCESS_TOKEN`: Meta Developer Console → WhatsApp → API Setup → Temporary token (luego permanente)
- `ANTHROPIC_API_KEY`: https://console.anthropic.com/ → API Keys

### PASO 4: Deploy a Vercel (o local con ngrok)

#### Opción A: Local con ngrok (para testing)

```bash
# 1. Instalar ngrok
npm install -g ngrok

# 2. Iniciar Next.js
npm run dev

# 3. En otra terminal, exponer puerto 3000
ngrok http 3000

# 4. Copiar la URL de ngrok (ej: https://abc123.ngrok.io)
```

#### Opción B: Deploy a Vercel (producción)

```bash
# 1. Push a GitHub
git add .
git commit -m "feat: WhatsApp integration complete"
git push origin feature/whatsapp-integration

# 2. Ir a Vercel → Import project → Seleccionar repo

# 3. Agregar variables de entorno en Vercel Dashboard
```

### PASO 5: Configurar webhook en Meta

1. Ir a Meta Developer Console → WhatsApp → Configuration
2. Click en "Edit" en Webhook
3. Agregar URL del webhook:
   - **URL**: `https://tu-dominio.vercel.app/api/whatsapp/webhook`
   - **Verify Token**: `massflow_verify_token_2026` (debe coincidir con .env)
4. Suscribirse a eventos:
   - ✅ `messages`
5. Click en "Verify and Save"

### PASO 6: Probar el sistema

Envía un mensaje de WhatsApp al número que configuraste:

```
Hola
```

Deberías recibir:

```
¡Hola! 👋 Bienvenido a MassFlow. ¿En qué puedo ayudarte?

1️⃣ Reservar una cita
2️⃣ Consultar precios
3️⃣ Ver servicios
4️⃣ Cancelar una cita
5️⃣ Consultar disponibilidad
```

---

## 🧪 Escenarios de prueba

### Test 1: Reservar cita completa

```
Usuario: Quiero una cita
Bot: ¿Qué tipo de masaje...?
Usuario: 1
Bot: ¿Para qué fecha...?
Usuario: 15/05/2026
Bot: ¿A qué hora...?
Usuario: 14:00
Bot: ¿Cuál es tu dirección...?
Usuario: Calle Gran Vía 28, Madrid 28013
Bot: Resumen... ¿Confirmas? SI o NO
Usuario: SI
Bot: ¡Reserva confirmada! Código: MF-...
```

### Test 2: Consultar precios

```
Usuario: Cuánto cuesta?
Bot: 💰 Nuestros precios:
     🌸 Masaje Relajante 60min - 55€
     ...
```

### Test 3: Cancelar cita

```
Usuario: Cancelar mi cita
Bot: Tus reservas activas: 1. ...
Usuario: 1
Bot: ¿Confirmas cancelación? SI o NO
Usuario: SI
Bot: ✅ Reserva cancelada
```

---

## 🔍 Debugging

### Ver logs en tiempo real

```bash
# Local
npm run dev
# Ver console.log en terminal

# Vercel
vercel logs --follow
```

### Revisar base de datos

```sql
-- Ver todas las conversaciones
SELECT * FROM conversaciones_whatsapp ORDER BY created_at DESC;

-- Ver mensajes de una conversación
SELECT * FROM mensajes_whatsapp WHERE conversacion_id = 'uuid...' ORDER BY created_at;

-- Ver reservas creadas vía WhatsApp
SELECT * FROM reservas WHERE cliente_id IN (
  SELECT cliente_id FROM conversaciones_whatsapp
) ORDER BY created_at DESC;
```

### Problemas comunes

**Error: "Webhook verification failed"**
- Verifica que `WEBHOOK_VERIFY_TOKEN` coincida en .env y en Meta

**Error: "Invalid signature"**
- Verifica que `WHATSAPP_ACCESS_TOKEN` sea correcto

**Bot no responde:**
- Revisa logs en Vercel/terminal
- Verifica que `ANTHROPIC_API_KEY` sea válida
- Verifica que `SUPABASE_SERVICE_ROLE_KEY` sea correcta

**Reserva no se crea:**
- Verifica que existan servicios en tabla `servicios`
- Revisa logs de Supabase (Dashboard → Logs)

---

## 📊 Monitoreo

### Dashboard admin (futuro)

Ir a `/admin/whatsapp` (pendiente de crear UI) para ver:

- Conversaciones activas
- Mensajes en tiempo real
- Reservas creadas vía WhatsApp
- Conversaciones que requieren atención humana

---

## 🔒 Seguridad

✅ **Implementado:**
- Validación de firma de Meta (X-Hub-Signature-256)
- Service role key solo en backend (nunca en frontend)
- Rate limiting en funciones
- RLS policies en Supabase

⚠️ **Recomendaciones:**
- Rotar `WEBHOOK_VERIFY_TOKEN` periódicamente
- Monitorear uso de API de Anthropic (costos)
- Revisar logs de errores diariamente

---

## 💰 Costos estimados

- **Meta WhatsApp**: Gratuito hasta 1000 conversaciones/mes
- **Anthropic Claude Haiku**: ~$0.25 por cada 1M tokens input (~2500 mensajes)
- **Supabase**: Free tier (hasta 500 MB DB + 2 GB bandwidth)
- **Vercel**: Free tier (100 GB bandwidth)

**Total estimado**: ~$0-5/mes para < 1000 conversaciones

---

## 🎯 Próximas mejoras (opcional)

- [ ] UI de admin para ver conversaciones en vivo
- [ ] Soporte para imágenes (cliente envía foto de zona)
- [ ] Recordatorios automáticos 24h antes de la cita
- [ ] Integración con Stripe para pagos por WhatsApp
- [ ] Analytics: tasa de conversión, tiempos de respuesta
- [ ] Multi-idioma (inglés, catalán)

---

## ✅ Checklist de go-live

- [ ] Migración SQL aplicada en Supabase
- [ ] Variables de entorno configuradas
- [ ] Webhook verificado en Meta
- [ ] Test completo de reserva
- [ ] Test de cancelación
- [ ] Test de consultas (precios, servicios)
- [ ] Logs de errores configurados
- [ ] Número de WhatsApp Business verificado
- [ ] Documentación interna compartida con el equipo

---

**Última actualización**: 2026-05-08  
**Estado**: ✅ Sistema completo y listo para activar
