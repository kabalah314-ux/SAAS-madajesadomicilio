# 💳 ACTIVAR PAGOS CON STRIPE (Fase 5)

> El **código ya está hecho** (Edge Functions + botón "Pagar online" + webhook). Está
> **desactivado** hasta que configures Stripe: sin `VITE_STRIPE_PUBLISHABLE_KEY` no se ve
> el botón y la app funciona igual (reserva sin cobro). Estos pasos lo encienden.

## Qué hay ya programado
- `supabase/functions/create-checkout/` → crea una sesión de **Stripe Checkout** (página de pago alojada por Stripe) para una reserva.
- `supabase/functions/stripe-webhook/` → cuando el pago se completa, marca la reserva `pago_estado='pagado'` y registra en `pagos_stripe`.
- Frontend: botón **"Pagar online"** en *Mis Reservas* (clienta), visible solo si hay clave de Stripe. Función `crearCheckoutReserva` en `AppContext`.

## Pasos para activarlo (los hace el usuario)

1. **Crear cuenta Stripe** en [stripe.com](https://stripe.com) y entrar en **modo test** (toggle arriba).
2. **Claves** (Developers → API keys):
   - Copia la **Publishable key** (`pk_test_...`) → va en el `.env` del frontend:
     ```
     VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
     ```
   - Copia la **Secret key** (`sk_test_...`) → se guarda como secreto en Supabase (NO en el frontend).
3. **Guardar secretos en Supabase** (la IA puede hacerlo con el access token, o tú por CLI):
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_... --project-ref lzvbfmphtrhvrjjnvqtt
   ```
4. **Desplegar las funciones de pago**:
   ```bash
   supabase functions deploy create-checkout --project-ref lzvbfmphtrhvrjjnvqtt
   supabase functions deploy stripe-webhook  --project-ref lzvbfmphtrhvrjjnvqtt --no-verify-jwt
   ```
5. **Configurar el webhook** en Stripe (Developers → Webhooks → Add endpoint):
   - URL: `https://lzvbfmphtrhvrjjnvqtt.supabase.co/functions/v1/stripe-webhook`
   - Evento: `checkout.session.completed`
   - Copia el **Signing secret** (`whsec_...`) y guárdalo:
     ```bash
     supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref lzvbfmphtrhvrjjnvqtt
     ```
6. **Reinicia** `npm run dev`. Ya aparece "Pagar online" en las reservas confirmadas.

## Probar (modo test)
- Tarjeta de prueba de Stripe: `4242 4242 4242 4242`, fecha futura, CVC cualquiera.
- Tras pagar, Stripe redirige de vuelta y el webhook marca la reserva como pagada.

## Notas
- Pago **clienta→plataforma** cubierto. El pago **plataforma→masajista** (Stripe Connect) es una v2; de momento las transferencias a masajistas se gestionan manualmente desde Admin → Transferencias.
- Mientras no actives Stripe, todo lo demás funciona; el cobro online simplemente no aparece.
