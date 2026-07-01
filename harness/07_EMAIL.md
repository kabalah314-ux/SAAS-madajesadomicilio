# 📧 07 · Activar email transaccional (Resend) — B7

> Igual que Stripe: el **código ya está escrito** (`supabase/functions/send-email`).
> Sin clave Resend la app funciona igual (no se envía nada). Esta guía la activa.
> El email se dispara automáticamente cuando se crea una **notificación** in-app
> (reserva confirmada, aceptada, rechazada, cancelada, nueva solicitud…), así que
> reutiliza la lógica de notificaciones que ya existe.

## Qué consigues
La clienta y la masajista reciben un email cuando pasa algo relevante con su
reserva, sin que tengan que estar dentro de la app. Imprescindible para un
servicio a domicilio real.

## Pasos (≈15 min)

### 1. Crear cuenta Resend y dominio
1. Crea una cuenta en https://resend.com (gratis hasta cierto volumen).
2. **API Keys → Create API Key** → copia la clave (`re_...`).
3. (Recomendado) **Domains → Add Domain**: añade tu dominio y los registros DNS
   que te indica. Mientras tanto puedes probar con el remitente `onboarding@resend.dev`.

### 2. Cargar los secretos en Supabase
Desde la carpeta del proyecto (con el CLI logueado al proyecto `lzvbfmphtrhvrjjnvqtt`):
```bash
supabase secrets set RESEND_API_KEY=re_tu_clave
supabase secrets set EMAIL_FROM="MassFlow <hola@tu-dominio.com>"   # o onboarding@resend.dev para probar
```

### 3. Desplegar la función
```bash
supabase functions deploy send-email
```
(Si no usas Docker, despliega vía API/token igual que `admin-actions` — ver Diario de Fase 4.)

### 4. Conectar las notificaciones al email (Database Webhook)
En **Supabase Studio → Database → Webhooks → Create a new hook**:
- **Table:** `notificaciones`
- **Events:** `INSERT`
- **Type:** Supabase Edge Functions → `send-email`
- Método `POST`. (Supabase manda `{ type, table, record }`; la función ya lo entiende.)

Guarda. A partir de ahí, **cada notificación nueva manda un email** al usuario.

### 5. Probar
- Haz una reserva de prueba (clienta) → la masajista debería recibir email de "Nueva solicitud".
- Acepta como masajista → la clienta recibe "Reserva confirmada".
- Revisa **Resend → Logs** para ver entregas/errores.

## 🏢 Al instalar en el negocio piloto: verificar su dominio (5 min + espera DNS)

El email ya funciona, pero hoy solo entrega a la cuenta Resend. Para que llegue a
clientas y masajistas del negocio, usa **el dominio del negocio**:

1. **Resend → Domains → Add Domain:** escribe el dominio del negocio (p. ej. `masajes-madrid.com`).
2. Resend muestra unos registros **DNS (DKIM/SPF y a veces DMARC)**. Entra en el
   panel del **registrador del negocio** (donde compraron el dominio: GoDaddy,
   IONOS, Namecheap, Cloudflare…) y **añade esos registros** (tipo TXT/CNAME tal cual).
3. Vuelve a Resend y pulsa **Verify**. La propagación DNS tarda de minutos a unas horas.
4. Cuando el dominio aparezca **Verified**, cambia el remitente a uno de ese dominio:
   ```bash
   supabase secrets set EMAIL_FROM="MassFlow <reservas@masajes-madrid.com>"
   ```
   (o desde **Supabase → Project Settings → Edge Functions → Secrets**, editando `EMAIL_FROM`).
   No hace falta re-desplegar la función: lee el secreto en cada ejecución.
5. Manda una reserva de prueba a un email externo y confirma que llega.

A partir de ahí, los emails salen como `@masajes-madrid.com` y llegan a cualquiera.

## Notas
- **Degradación:** si quitas `RESEND_API_KEY`, la función responde 200 sin enviar; la app sigue igual.
- **No bloquea:** si Resend falla, la función responde 200 y registra el error; el flujo de la app no se rompe.
- **Llamada directa:** la función también acepta `{ to, subject, html }` por si quieres enviar emails a medida desde otra parte.
- **Antispam:** verifica tu dominio en Resend (SPF/DKIM) antes de enviar a clientes reales, o caerá en spam.

## Estado (2026-06-30) — ACTIVADO EN MODO PRUEBA
- [x] Función `send-email` escrita y **desplegada** (`--no-verify-jwt`, protegida por `WEBHOOK_SECRET`).
- [x] Secretos cargados: `RESEND_API_KEY`, `EMAIL_FROM` (=`onboarding@resend.dev`), `WEBHOOK_SECRET`.
- [x] **Trigger `trg_notif_send_email`** en `notificaciones` (INSERT) → llama a la función vía pg_net. (No hizo falta el Database Webhook de Studio; el trigger hace lo mismo.)
- [x] Verificado E2E: trigger→función→Resend; email real entregado.
- [ ] **Para producción:** verificar un dominio en **resend.com/domains** y cambiar `EMAIL_FROM` a `MassFlow <algo@tu-dominio.com>` (`supabase secrets set EMAIL_FROM=...`). Mientras no, Resend SOLO entrega a `recordingmythings@gmail.com` (el email de la cuenta Resend).

> Nota: el envío **no bloquea** la app y los fallos de Resend no rompen el flujo (la función responde 200 y se registra el error en `net._http_response`).
