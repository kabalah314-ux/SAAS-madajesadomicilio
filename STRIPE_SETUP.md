# 💳 Stripe Setup para Pagos

## 🎯 Qué incluye

- ✅ Pagos de clientes (reservas)
- ✅ Comisión automática (25% por defecto)
- ✅ Pagos a masajistas (Stripe Connect)
- ✅ Webhooks para sincronizar estado

---

## 1️⃣ Crear Cuenta Stripe

1. Ir a https://stripe.com
2. Sign up → Business type: "Platform or marketplace"
3. Verificar email
4. Dashboard → Get your API keys

```
Publishable key (pk_test_...): Copiar a NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
Secret key (sk_test_...): Copiar a STRIPE_SECRET_KEY
```

---

## 2️⃣ Configurar Supabase Edge Functions

### 2.1 Guardar secrets en Supabase

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx (verás esto después)
supabase secrets set STRIPE_RETURN_URL=https://tuapp.com (en producción)
```

### 2.2 Deploy de funciones

```bash
supabase functions deploy create-payment-intent
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy stripe-connect-onboarding
supabase functions deploy process-masajista-payouts
```

Verificar que están deployed:
```bash
supabase functions list
```

---

## 3️⃣ Configurar Webhook en Stripe

### 3.1 Obtener URL de tu función

En Supabase Dashboard → Edge Functions → stripe-webhook → Copy URL

Debería ser algo como:
```
https://nqewibtmewemlqaxriko.supabase.co/functions/v1/stripe-webhook
```

### 3.2 Agregar webhook a Stripe

1. Dashboard Stripe → Developers → Webhooks
2. "Add endpoint"
3. Pegar URL de arriba
4. Events: Seleccionar:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Add endpoint
6. Copiar **Signing secret** (comienza con `whsec_`)
7. Ejecutar:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

---

## 4️⃣ Probar en Local

### 4.1 Terminal 1: Stripe CLI

```bash
# Instalar Stripe CLI: https://stripe.com/docs/stripe-cli

stripe login
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
```

Verás un mensaje como:
```
> Ready! Your webhook signing secret is: whsec_test_xxx
```

Copiar ese `whsec_test_xxx` y actualizar `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_test_xxx
```

### 4.2 Terminal 2: Supabase

```bash
supabase start
```

### 4.3 Terminal 3: Next.js

```bash
npm run dev
```

### 4.4 Crear una reserva de prueba

1. Frontend: Login como cliente
2. Crear una reserva normal
3. Ir a checkout → ver que aparece "Pay with card" de Stripe
4. Usar tarjeta de prueba:
   - Número: `4242 4242 4242 4242`
   - Exp: `12/25`
   - CVC: `123`
5. Complete payment

### 4.5 Verificar en Stripe Dashboard

- Dashboard Stripe → Payments → debería aparecer tu pago de €55.00
- En la BD: tabla `pagos_stripe` debería tener estado "pagado"
- Notificaciones del cliente: debería recibir notificación

---

## 5️⃣ Flujo de Pago (Arquitectura)

```
Cliente crea reserva
    ↓
Frontend: llamar a createPaymentIntent(reservaId)
    ↓
Edge Function create-payment-intent:
  - Obtiene datos de la reserva
  - Crea Stripe PaymentIntent
  - Guarda en tabla pagos_stripe
    ↓
Frontend: muestra formulario Stripe (tarjeta)
    ↓
Cliente ingresa tarjeta
    ↓
Stripe procesa pago
    ↓
Stripe envía webhook a stripe-webhook
    ↓
Edge Function stripe-webhook:
  - Verifica firma
  - Actualiza pagos_stripe a "pagado"
  - Actualiza reserva.pago_estado = "pagado"
  - Crea notificación para cliente
    ↓
Cliente ve reserva como "pagada" ✅
```

---

## 6️⃣ Pagos a Masajistas (Stripe Connect)

### 6.1 Masajista debe onboardearse

```typescript
// En tu componente de masajista
const { onboarding_url } = await iniciarOnboardingStripeConnect()
window.location.href = onboarding_url  // Redirige a Stripe
```

Masajista llena formulario en Stripe y vuelve a tu app.

### 6.2 Cada mes: procesar ciclo de pagos

```typescript
// Admin panel
await procesarPagosDelCiclo(cicloId)
```

Esto:
1. Busca todas las reservas completadas y pagadas del ciclo
2. Agrupa por masajista
3. Crea Stripe Transfer a cada masajista (€ - comisión)
4. Registra en tabla `transferencias`
5. Notifica a masajistas

---

## 7️⃣ Comisiones (Configuración)

Por defecto: 25%

```
Cliente paga:         €100
Comisión (25%):       €25
Masajista recibe:     €75
```

Para cambiar, editar en `src/services/payments.service.ts`:

```typescript
// Cambiar en crearPaymentIntent
const comision_pct = 30  // Cambiar de 25 a 30
```

O guardar en tabla `configuracion` para que sea editable desde admin.

---

## 8️⃣ Variables de Entorno

| Variable | Dónde | Valor |
|----------|-------|-------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `.env.local` | `pk_test_...` o `pk_live_...` |
| `STRIPE_SECRET_KEY` | Supabase secrets | `sk_test_...` o `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Supabase secrets | `whsec_...` |
| `STRIPE_RETURN_URL` | Supabase secrets | URL de tu app para onboarding Connect |

---

## 9️⃣ Pasar a Producción

### 9.1 Obtener claves live

En Stripe Dashboard:
- Cambiar modo (esquina superior)
- "Live" en lugar de "Test"
- Copiar nuevas keys

### 9.2 Actualizar variables

```bash
# En Supabase
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_live_xxx

# En .env.local (para deploy a Vercel)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### 9.3 Re-configurar webhook en Stripe

Nuevamente con URL de producción:
```
https://tuapp.com/stripe-webhook
```

### 9.4 Verificar

1. Crear reserva de prueba
2. Hacer pago con tarjeta real
3. Verificar en Stripe Dashboard que aparezca
4. Verificar en BD que estado sea "pagado"

---

## 🔟 Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| "payment_intent 400" | API key incorrecta | Verificar `STRIPE_SECRET_KEY` en secrets |
| "Webhook signature verification failed" | Secret webhook incorrecto | Copiar correcto de Stripe Dashboard |
| Webhook no llega | Función no deployada | `supabase functions deploy stripe-webhook` |
| Masajista no puede onboardearse | URL incompleta | Verificar `STRIPE_RETURN_URL` |
| Payment aparece en Stripe pero no en BD | Webhook falla | Ver logs en `supabase functions logs stripe-webhook` |
| Tarjeta rechazada | Tarjeta de prueba incorrecta | Usar `4242 4242 4242 4242` |

---

## 📚 Referencias

- [Stripe Payments](https://stripe.com/docs/payments)
- [Stripe Connect](https://stripe.com/docs/connect)
- [Webhooks](https://stripe.com/docs/webhooks)
- [Tarjetas de prueba](https://stripe.com/docs/testing)

---

**Última actualización:** 2026-05-08  
**Estado:** Ready to use
