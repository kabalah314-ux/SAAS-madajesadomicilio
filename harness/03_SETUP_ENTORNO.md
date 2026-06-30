# ⚙️ SETUP DEL ENTORNO — poner el backend en marcha

> **Camino elegido: Supabase en la NUBE.** Tú creas el proyecto (5 min) y la IA hace el resto.
> Marca el progreso en la **Fase 0** de [`01_ESTADO_Y_PLAN.md`](01_ESTADO_Y_PLAN.md).

---

## 🤝 División de tareas

| Lo haces TÚ (una vez) | Lo hace la IA |
|------------------------|---------------|
| 1. Crear el proyecto Supabase | 4. Poner las claves en `.env` |
| 2. Pegar `setup_supabase.sql` y darle *Run* | 5. Arrancar la app y crear usuarios de prueba |
| 3. Pegarle a la IA la **URL** y la **anon key** | 6. Verificar que los flujos funcionan |

---

## PASO 1 — Crear el proyecto (TÚ) · ~3 min

1. Entra en [supabase.com](https://supabase.com) e inicia sesión (ya tienes cuenta).
2. **New project**.
   - **Name:** `massflow` (o lo que quieras).
   - **Database Password:** pon una y **guárdala** (la necesitarás si algún día usas la CLI; para este flujo no me la pases).
   - **Region:** elige una de Europa (p.ej. *West EU (Ireland)* o *Central EU (Frankfurt)*).
   - **Plan:** Free.
   > ⚠️ El plan Free permite **2 proyectos por organización**. Si ya tienes 2, crea una **organización nueva** (gratis) desde el selector de arriba y mete el proyecto ahí.
3. Espera ~2 minutos a que termine de aprovisionar (verás "Setting up project...").

## PASO 2 — Crear las tablas (TÚ) · 1 clic

1. En el proyecto, menú lateral → **SQL Editor** → **New query**.
2. Abre el archivo **[`harness/setup_supabase.sql`](setup_supabase.sql)** de este repo, copia TODO su contenido y pégalo.
3. Dale a **Run** (▶). Debería decir *Success. No rows returned*.
   > Ese archivo junta las 6 migraciones (tablas + seguridad RLS + triggers + storage + datos de ejemplo + endurecimiento de seguridad). Es idempotente: si lo corres dos veces no rompe nada.

## PASO 3 — Permitir login inmediato para pruebas (TÚ) · 30 seg

1. Menú lateral → **Authentication** → **Providers** (o **Sign In / Providers**) → **Email**.
2. **Desactiva "Confirm email"** (Confirmar email) y guarda.
   > Así podremos registrarnos y entrar al instante sin verificar correo. **Antes de lanzar a producción, vuelve a activarlo** (ver `02` y la Fase 1.4 del plan).

## PASO 4 — Darme las claves (TÚ) · 30 seg

1. Menú lateral → **Project Settings** → **API**.
2. Copia y **pégame en el chat** estos dos valores:
   - **Project URL** → `https://XXXX.supabase.co`
   - **Project API keys → `anon` `public`** → una cadena larga que empieza por `eyJ...`
   > Estas dos son **seguras de compartir** (la anon key está pensada para ir en el código del frontend). **NO** me pases la `service_role` key ni la contraseña de la BD.

---

## A partir de aquí lo hago YO (la IA)

5. Escribo tu `.env` con la URL + anon key.
6. `npm run dev`, registro un usuario de prueba de cada rol y te promuevo uno a **admin** con una línea SQL (te la paso para que la pegues, o la corro por CLI).
7. Recorro los flujos (clienta reserva → masajista ve la solicitud y acepta → admin lo ve) y te confirmo qué funciona, marcando la Fase 0 y verificando las Fases 1-3.

---

## Más adelante (cuando toque)

- **Edge Functions** (Fase 4.7/4.10 y 6): `supabase link --project-ref <ref>` y `supabase functions deploy admin-actions expire-reservas`. Lo haremos cuando lleguemos a esas tareas.
- **Stripe** (Fase 5): crear cuenta Stripe en modo test y añadir `VITE_STRIPE_PUBLISHABLE_KEY` al `.env` + secretos en Supabase. Detalle en su momento.
- **Producción:** reactivar "Confirm email", revisar políticas, y desplegar el frontend en Vercel (ver `DEPLOYMENT.md`).

---

## Checklist Fase 0

- [ ] Proyecto Supabase creado (Free)
- [ ] `setup_supabase.sql` ejecutado (Success)
- [ ] "Confirm email" desactivado (para pruebas)
- [ ] URL + anon key pegadas a la IA
- [ ] (lo hace la IA) `.env` escrito y app arrancando con datos reales
