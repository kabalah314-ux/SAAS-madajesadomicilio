# 🚀 LÉEME PRIMERO — Harness de MassFlow

> **Si acabas de abrir este proyecto (seas humano o IA), empieza por aquí.**
> Este `harness/` es el "centro de control" para llevar MassFlow a **100% funcional**
> sin perderse, aunque cambies de ordenador o pase tiempo entre sesiones.

---

## 🟢 ESTADO ACTUAL Y CÓMO CONTINUAR (actualizado 2026-07-01)

**Resumen:** la app está **funcional, testeada y desplegada**. Ya no está al 50% — el
grueso está hecho. Ahora mismo lo vivo es el **agente conversacional** (Fase 9).

### Qué está hecho
- **Fases 0–8 completas y verificadas** (seguridad/RLS, flujos de negocio, Stripe *código listo*,
  automatización, pulido, y camino a vendible: los 8 bloqueantes resueltos a nivel de producto).
- **Desplegado en Vercel:** **https://saas-madajesadomicilio.vercel.app** (env vars vía `.env.production`;
  reset de contraseña configurado en Supabase). Revisado en móvil (3 roles, sin desbordes).
- **Testeo exhaustivo:** 30 checks de datos (`scratchpad e2e_full.py` — se recrea si hace falta) +
  8 de integraciones (Edge Functions/Storage) + email real de extremo a extremo.
- **Fase 9 · Agente FASE A COMPLETA** (ver **[`08_AGENTE.md`](08_AGENTE.md)**): tablas de conversaciones +
  `contactos` (clientes internos sin login), Edge Function `agente` (OpenRouter + herramientas + logging +
  identidad por teléfono), y sección admin **"Agente"** (lista + transcripción + "Probar agente"). Probado en vivo.

### Lo siguiente (por dónde seguir)
- **Fase 9 · FASE B:** conectar el agente a **WhatsApp** y **teléfono (voz)** como canales que llaman a la
  misma Edge Function `agente` (cambiando `canal`). Y **FASE C:** análisis de datos sobre lo guardado.
- Detalle y checklist en **[`08_AGENTE.md`](08_AGENTE.md)**. Bloqueantes menores de vendibilidad en **[`06_VENDIBLE.md`](06_VENDIBLE.md)**.

### 🔑 Entorno en vivo (datos para trabajar)
- **Supabase:** proyecto `lzvbfmphtrhvrjjnvqtt` (cuenta `recordingmythings@gmail.com`).
  La IA administra por **Management API** (`POST https://api.supabase.com/v1/projects/<ref>/database/query`,
  header `User-Agent` obligatorio o Cloudflare da 403). Las Edge Functions se despliegan con la CLI:
  `SUPABASE_ACCESS_TOKEN=<token> supabase functions deploy <fn> --project-ref lzvbfmphtrhvrjjnvqtt --no-verify-jwt --use-api`.
- **Usuarios de prueba** (misma BD en local y desplegado): `admin@` / `masajista@` / `clienta@massflow.app`, contraseña `Test1234`.
- **Vercel:** proyecto `saas-madajesadomicilio` (team `kabalah314-uxs-projects`). `vercel --prod --yes` redespliega.
- **Edge Functions desplegadas:** `admin-actions`, `expire-reservas`, `send-email` (Resend), `agente` (OpenRouter). Cron `expire-reservas-cada-15min`.

### ⚠️ Lo que necesita la PRÓXIMA conversación (no persiste entre sesiones)
Estos valores viven en el *scratchpad de la sesión anterior* (se pierden) o son secretos:
- **Token de Supabase Management** (`sbp_...`): guardado en `C:\Users\oscar\AppData\Local\massflow\sb_token.txt`
  (fuera del repo). Léelo de ahí. Si da 401, el usuario da uno nuevo y se sobrescribe ese archivo (y revoca el viejo).
- **Clave de OpenRouter** (`sk-or-...`): ya está guardada como secreto en Supabase (`OPENROUTER_API_KEY`),
  así que la función `agente` **ya funciona desplegada**. Solo hace falta el valor otra vez si se quiere
  probar la función por HTTP directo (o probar desde el panel admin "Probar agente", que usa el JWT del admin).
- **Secretos de webhook** (`AGENTE_WEBHOOK_SECRET`, `WEBHOOK_SECRET` de email): están en Supabase; sus valores
  estaban en el scratchpad. Para llamar a las funciones por HTTP directo hará falta regenerarlos o pedir al usuario.
- Para **Fase B**: cuenta/nº de **WhatsApp** (Twilio/Meta) y **plataforma de voz** (Vapi/Retell) + nº de teléfono.

### Datos de prueba en la BD (se pueden borrar)
Conversación del agente de "Marta" + su contacto + reserva `MF-001046` (pendiente) + conversación test `+34600000000`.

---

## ¿Qué es MassFlow?

Un **SaaS de masajes a domicilio**. Tres roles:
- **Clienta** → reserva una sesión.
- **Masajista** → recibe la solicitud, la atiende y cobra.
- **Admin** → gestiona el negocio (catálogo, finanzas, pagos, verificación).

La plataforma se queda una **comisión**. Stack: **React + Vite + TypeScript + Tailwind + Supabase** (Postgres + Auth + Storage + Edge Functions). Se despliega en **Vercel**.

---

## El objetivo

Llevar la app de **~50% funcional** (UI casi terminada, pero muchos botones son "fachada" y faltan flujos clave) a **100% funcional y usable de verdad**.

---

## Cómo se usa este harness (en 4 pasos)

1. **Lee este archivo** (estás aquí).
2. **Abre [`01_ESTADO_Y_PLAN.md`](01_ESTADO_Y_PLAN.md)** → es la lista de tareas con casillas `[ ]`/`[x]`. Es la **única fuente de verdad** del progreso. Busca la primera tarea sin marcar.
3. **Lee [`02_COMO_TRABAJAR.md`](02_COMO_TRABAJAR.md)** → te dice exactamente cómo hacer una tarea, comprobarla y marcar la casilla.
4. Si la app no arranca o no tienes Supabase, ve a [`03_SETUP_ENTORNO.md`](03_SETUP_ENTORNO.md).

¿Dudas técnicas (esquema de BD, nombres raros, "por qué cliente vs clienta")? → [`04_REFERENCIA_TECNICA.md`](04_REFERENCIA_TECNICA.md).

---

## 📜 Reglas de oro (NO las rompas)

1. **El progreso vive en `01_ESTADO_Y_PLAN.md`.** Cuando termines una tarea, marca su casilla `[x]` y añade una línea en el "Diario" al final de ese archivo. No crees documentos nuevos tipo `FINAL_v2.md`.
2. **Verifica antes de marcar.** Una tarea está hecha solo si `npm run build` pasa sin errores Y (si es posible) lo has visto funcionar en la app. Ver [`02_COMO_TRABAJAR.md`](02_COMO_TRABAJAR.md).
3. **Una tarea cada vez, en orden.** Las fases están ordenadas a propósito (seguridad antes que pulido). No saltes a la Fase 5 si la 1 está sin terminar.
4. **No te creas los docs viejos.** Los archivos `PROYECTO_100_COMPLETO.md`, `RESUMEN_FINAL.md`, etc. dicen "100% completado" y es **mentira**. La verdad está en este harness.
5. **La capa de datos real es `src/AppContext.tsx`.** Ahí se cargan y guardan los datos en Supabase. NO uses `src/mockData.ts` (es código muerto). Ver [`04_REFERENCIA_TECNICA.md`](04_REFERENCIA_TECNICA.md).
6. **Cliente = clienta.** La base de datos usa `cliente`; la interfaz usa `clienta`. Se traducen en un solo punto. No lo "arregles" cambiándolo en mil sitios. Ver referencia técnica.
7. **Cambios pequeños y comprobables.** Edita, compila, comprueba, marca. Repite.

---

## Mapa rápido del repo

```
SAAS-madajesadomicilio/
├── harness/              ← ESTÁS AQUÍ (centro de control)
├── GUIA_MAESTRA.md       ← visión general del proyecto (entra después de este harness)
├── src/                  ← la app React
│   ├── AppContext.tsx    ← ⭐ capa de datos (Supabase). El archivo más importante.
│   ├── hooks/useAuth.tsx ← login/registro (Supabase Auth)
│   ├── types.ts          ← tipos del dominio
│   ├── components/       ← admin/ · masajista/ · clienta/
│   └── services/         ← (ojo: hoy es código muerto, ver plan)
├── supabase/
│   ├── migrations/       ← esquema SQL real (la BD de verdad)
│   └── functions/        ← Edge Functions (Deno)
└── package.json
```

> Siguiente paso: abre **[`01_ESTADO_Y_PLAN.md`](01_ESTADO_Y_PLAN.md)**.
