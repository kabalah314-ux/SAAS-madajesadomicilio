# 🚀 DEPLOY A VERCEL - Guía Completa

## 📋 Pre-requisitos

- ✅ Cuenta Vercel (crear en [vercel.com](https://vercel.com))
- ✅ GitHub conectado a Vercel
- ✅ Repositorio pusheado (`feature/whatsapp-integration`)
- ✅ Variables de entorno listas (ver `.env.example`)

---

## 🎯 PASO 1: Conectar Repositorio

### 1.1 Login en Vercel

```bash
# Instalar Vercel CLI (opcional, para deploy desde terminal)
npm install -g vercel

# Login
vercel login
```

### 1.2 Importar Proyecto desde GitHub

1. Ir a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Seleccionar **"Import Git Repository"**
4. Buscar: `kabalah314-ux/SAAS-madajesadomicilio`
5. Click **"Import"**

---

## 🎯 PASO 2: Configurar Proyecto

### 2.1 Framework Preset

- **Framework:** Next.js (auto-detectado)
- **Root Directory:** `.` (raíz del repo)
- **Build Command:** `npm run build`
- **Output Directory:** `dist` (o `.next` si es Next.js puro)
- **Install Command:** `npm install`

### 2.2 Environment Variables

Click **"Environment Variables"** y agregar:

#### Variables Obligatorias

```env
# Perplexity API (para chat conversacional)
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Variables Opcionales (para features adicionales)

```env
# Supabase (persistencia futura)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (pagos)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# WhatsApp Business
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_VERIFY_TOKEN=tu_token_secreto_123
```

**⚠️ Importante:**
- Agregar variables en **Production**, **Preview** y **Development**
- No commitear `.env` con valores reales
- Usar `.env.example` como referencia

---

## 🎯 PASO 3: Deploy

### 3.1 Deploy Inicial

Click **"Deploy"**

Vercel automáticamente:
1. ✅ Clona el repo
2. ✅ Ejecuta `npm install`
3. ✅ Ejecuta `npm run build`
4. ✅ Despliega a CDN global

**Tiempo estimado:** 2-5 minutos

### 3.2 Verificar Logs

Durante el build, monitorear:
- ✅ **Building:** Sin errores de TypeScript
- ✅ **Compiling:** Sin warnings críticos
- ✅ **Uploading:** Assets cargados correctamente

Si falla:
- Ver logs completos en panel
- Verificar variables de entorno
- Revisar `vercel.json` y `package.json`

---

## 🎯 PASO 4: Configuración Post-Deploy

### 4.1 Obtener URL

Vercel asigna URL automáticamente:
- **Production:** `https://tu-proyecto.vercel.app`
- **Preview:** `https://tu-proyecto-git-feature-whatsapp.vercel.app`

### 4.2 Dominio Personalizado (Opcional)

1. Settings → Domains
2. Click **"Add Domain"**
3. Ingresar: `massflow.com` (o tu dominio)
4. Configurar DNS según instrucciones:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
5. Esperar propagación (5-60 min)

### 4.3 SSL/TLS

- ✅ Auto-provisionado por Vercel (Let's Encrypt)
- ✅ Forzar HTTPS (default)
- ✅ HSTS habilitado

---

## 🎯 PASO 5: Configurar Webhooks Externos

### 5.1 WhatsApp Business (Meta)

1. Ir a [developers.facebook.com](https://developers.facebook.com)
2. Seleccionar app WhatsApp
3. **WhatsApp** → **Configuration**
4. **Webhook URL:** `https://tu-proyecto.vercel.app/api/whatsapp/webhook`
5. **Verify Token:** (el mismo que pusiste en `WHATSAPP_VERIFY_TOKEN`)
6. **Subscribe to:** `messages`
7. Click **"Verify and Save"**

**Verificar:**
- ✅ Estado: ✅ Verified
- ✅ Enviar mensaje de prueba → revisar logs Vercel

### 5.2 Stripe Webhooks (Opcional)

1. Dashboard Stripe → **Developers** → **Webhooks**
2. **Add endpoint:** `https://tu-proyecto.vercel.app/api/stripe/webhook`
3. **Eventos:**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copiar **Signing Secret**
5. Agregar en Vercel Environment Variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

---

## 🎯 PASO 6: Testing en Producción

### 6.1 Smoke Test

```bash
# Health check
curl https://tu-proyecto.vercel.app/api/health

# Chat endpoint
curl -X POST https://tu-proyecto.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"mensaje": "Hola", "session_id": "test_prod"}'
```

**Esperar:**
- ✅ Status 200
- ✅ Response JSON válido

### 6.2 Chat UI

1. Abrir: `https://tu-proyecto.vercel.app`
2. Login como **clienta**
3. Click botón flotante chat
4. Enviar: "Hola"
5. **Verificar:** Lía responde

### 6.3 Lighthouse Audit

1. DevTools → Lighthouse
2. Run audit
3. **Objetivo:** Performance > 85

---

## 🎯 PASO 7: CI/CD Automático

Vercel ya tiene CI/CD configurado automáticamente:

### 7.1 Deploy en cada Push

**Configuración actual:**
- ✅ Push a `main` → Deploy a **Production**
- ✅ Push a `feature/*` → Deploy a **Preview**
- ✅ Pull Request → Deploy preview + comment con URL

### 7.2 Protecciones (Opcional)

**Settings → Git:**
- ☐ **Ignored Build Step:** Activar para no deployar en ciertos paths
- ☐ **Production Branch:** Cambiar si quieres otra branch como prod

---

## 🎯 PASO 8: Monitoreo y Logs

### 8.1 Vercel Analytics

**Settings → Analytics:**
- ✅ **Web Analytics:** Activar (gratis)
- ✅ **Speed Insights:** Activar

### 8.2 Logs en Tiempo Real

**Deployments → [tu deploy] → Functions:**
- Ver logs de API routes
- Filtrar por endpoint
- Buscar errores

### 8.3 Alertas (Opcional)

**Integrations → Slack/Discord:**
- Notificaciones de deploy
- Alertas de errores

---

## 🐛 TROUBLESHOOTING

### Problema: Build Falla

**Error:** `Module not found: Can't resolve...`

**Solución:**
```bash
# Local
rm -rf node_modules package-lock.json
npm install
npm run build

# Si funciona local, en Vercel:
# Settings → General → Node.js Version → 18.x
```

---

### Problema: Variables de Entorno No Funcionan

**Error:** `undefined` en `process.env.PERPLEXITY_API_KEY`

**Solución:**
1. Vercel Dashboard → Settings → Environment Variables
2. Verificar que variables estén en **Production** y **Preview**
3. Re-deploy (no basta guardar, hay que re-deployar)

---

### Problema: 404 en Rutas

**Error:** `/chat-v2` da 404

**Solución:**
Verificar `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

### Problema: Webhook WhatsApp Falla Verificación

**Error:** Meta no verifica webhook

**Solución:**
1. Logs Vercel → buscar request GET desde Meta
2. Verificar que `WHATSAPP_VERIFY_TOKEN` coincida
3. Endpoint debe responder con `hub.challenge`

---

### Problema: Performance Bajo

**Lighthouse Score < 70**

**Solución:**
1. **Optimizar imágenes:**
   ```bash
   npm install sharp
   # Convertir a WebP
   ```
2. **Code splitting:**
   ```typescript
   const ChatAsistente = lazy(() => import('./ChatAsistente'))
   ```
3. **Cache headers** en `vercel.json`:
   ```json
   {
     "headers": [{
       "source": "/static/(.*)",
       "headers": [{"key": "Cache-Control", "value": "max-age=31536000"}]
     }]
   }
   ```

---

## 📊 CHECKLIST POST-DEPLOY

- [ ] Build exitoso sin warnings
- [ ] Variables de entorno configuradas
- [ ] URL producción accesible
- [ ] Chat funciona (enviar mensaje de prueba)
- [ ] WhatsApp webhook verificado (si aplica)
- [ ] SSL/HTTPS activo
- [ ] Analytics habilitado
- [ ] Dominio personalizado configurado (si aplica)
- [ ] Lighthouse score > 85
- [ ] Logs monitoreados (sin errores 500)
- [ ] Tests de TESTING_CHECKLIST.md ejecutados

---

## 🎉 Deploy Completado

Tu app está live en: **https://tu-proyecto.vercel.app**

**Próximos pasos:**
1. Ejecutar [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) completo
2. Reportar bugs encontrados
3. Iterar y mejorar
4. Compartir URL con stakeholders

---

## 📚 Referencias

- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel CLI](https://vercel.com/docs/cli)

---

**Última actualización:** 2026-05-11  
**Autor:** Claude Sonnet 4.5
