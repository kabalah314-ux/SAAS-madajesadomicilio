# 🚀 LÉEME PRIMERO — Harness de MassFlow

> **Si acabas de abrir este proyecto (seas humano o IA), empieza por aquí.**
> Este `harness/` es el "centro de control" para llevar MassFlow a **100% funcional**
> sin perderse, aunque cambies de ordenador o pase tiempo entre sesiones.

---

## 🟢 ESTADO ACTUAL Y CÓMO CONTINUAR (actualizado 2026-07-03)

**Resumen:** la app está **funcional, testeada de punta a punta y desplegada en producción**. El grueso
está hecho y verificado. La fuente de verdad del testeo y los diseños es **[`09_TESTEO_MAESTRO.md`](09_TESTEO_MAESTRO.md)**;
el estado de tareas, **[`01_ESTADO_Y_PLAN.md`](01_ESTADO_Y_PLAN.md)**.

> **✅ NUEVO 2026-07-03 — FASE 12 y FASE 11 COMPLETAS (desplegadas).**
> - **Fase 12** (correcciones de la revisión del usuario, 8/10): campana de notificaciones navega, admin cambia estado de reservas + tarjetas móvil, BUG invitar masajista (era CORS) arreglado, gasto real de clientas + tarjetas móvil, modales ya no se cierran al volver a la app, crear servicio arreglado, rediseño de Mi Calendario. (12.8 fue a Fase 11·B; 12.10 desplegado.)
> - **Fase 11** (reparto con consentimiento + disponibilidad real): **Bloque A** el admin OFRECE (estado `ofrecida`) y la masajista acepta/rechaza; **Bloque B** la disponibilidad real filtra clienta/admin/agente/pool (estricto) vía funciones SQL `masajista_disponible`/`masajistas_disponibles`/`horas_disponibles`; **Bloque C** excepciones por fecha (bloqueo/extra); **B6** backstop en BD; **B7** avisos. Migraciones `_24`–`_28`, `agente` redesplegado. Todo verificado (BD + E2E Playwright) y en producción; `main` sincronizado (PRs #2–#5).
> - **Pendiente**: pasada E2E conjunta formal R1–R8 (verificado por piezas), y opciones nuevas: Fase 9·B (WhatsApp), activar Stripe, verificar dominio email.
> - ⚠️ **Piloto**: la disponibilidad es ESTRICTA. La masajista de prueba "Laura" solo tiene el LUNES configurado, así que al reservar solo salen huecos los lunes (correcto). Cada masajista real DEBE configurar su disponibilidad.

### Qué está hecho y VERIFICADO EN VIVO
- **Fases 0–8** (seguridad/RLS, flujos de negocio, automatización, pulido, camino a vendible) + **Fase 9 Agente FASE A** + **FASE C (Análisis)**.
- **Testeo E2E fresco (`09` rondas 1-3): toda la guía en verde** — FA1–FA9 y FB1–FB8. Runners en `harness/tests/` (committeados): `test_regresion_clasicos.py` (16/16), `test_regresion_agente.py` (9/9), `test_FA2_...`, `test_agente_A1_A2_A3.py`, `test_asistente_cliente.py` (16/16), `test_accesos.py` (7/7), `test_email_solicitud.py`. Playwright: `pw_*.cjs` (capturas fiables; el screenshot del preview MCP va flaky).
- **Modelo de cuentas (FC · Accesos):** cliente registro libre; **masajista SOLO por invitación del admin** (email con enlace, sección admin "Accesos"); admin puede **promover a admin**; pantalla `SetPassword` (invitación + recuperar contraseña).
- **Chat de la clienta con el agente (FC2):** vista "Asistente" — pregunta y reserva por IA desde su cuenta; identidad por JWT (no suplantable); **el contexto persiste** al recargar (RLS de solo-lectura propia). 16/16 incl. 2 ataques.
- **Foto de perfil (FC1):** en los 3 roles (masajista ya la tenía; clienta en MisDatos, admin en Configuración); se ve en el Header.
- **Email mejorado:** el cliente recibe "hemos recibido tu solicitud"; plantilla con icono + tarjeta de detalles + CTA (antes texto plano).
- **Migraciones aplicadas hasta `_23`** (en producción). Edge Functions desplegadas: `agente`, `admin-actions`, `expire-reservas`, `send-email`. Cron `expire-reservas-cada-15min`.
- **Fase 8 · "importantes restantes" cerrada (2026-07-02):** CORS con allowlist (`supabase/functions/_shared/cors.ts`), contraseña mínima 6→8 (formularios + config de Auth vía Management API), retirado el alta de masajista por contraseña temporal (`GestionMasajistas` ya solo edita; el alta es SOLO por invitación en Accesos), `tsc --noEmit` a 0 errores (nuevo `src/vite-env.d.ts` + limpieza) y CI nuevo (`.github/workflows/ci.yml`). ⚠️ **Ni las Edge Functions ni el frontend se han redesplegado con estos cambios** — producción lleva el código anterior; al redesplegar `admin-actions`/`agente`/`create-checkout`, revisar antes la allowlist de CORS (falta `localhost:5199`, el puerto del preview — está anotado en la tarea 12.3).

### Lo siguiente (por dónde seguir) — **⭐ FASE 12 primero, luego FASE 11**

**EMPIEZA POR LA FASE 12** de `01_ESTADO_Y_PLAN.md`: correcciones que el usuario reportó al probar la app (2026-07-02), sobre todo en **móvil**. Resumen: campana de notificaciones rota/sin navegación en los 3 roles (12.1); cambio de estado de reserva fácil para el admin (12.2); **BUG: invitar masajista no crea la cuenta** (12.3); Reservas y Clientas del admin como tarjetas en móvil, fuera el scroll lateral (12.4/12.5); **BUG: los modales pierden lo escrito al cambiar de app en móvil** (12.6); **BUG: crear servicio no funciona** (12.7); agente y picker del admin deben respetar disponibilidad + especialidad (12.8 → remite a Fase 11·B); rediseño completo de Mi Calendario de la masajista (12.9); verificación + redespliegue final (12.10). Cada tarea lleva archivos, pistas y criterio de verificación.

Después, **FASE 11 (planteada, sin construir)** — diseño cerrado con decisiones del usuario en **`09 · FC3`** y checklist en **`01 · Fase 11`**:
- **Bloque A:** el admin OFRECE la reserva (nuevo estado `ofrecida`) y la masajista acepta/rechaza (hoy el admin asigna directo sin consentimiento). El pool abierto se mantiene en paralelo.
- **Bloque B:** la **disponibilidad real** (panel de la masajista, hoy no se usa) filtra los huecos del cliente/agente/picker admin. Modo **estricto** (sin disponibilidad = no disponible).
- **Bloque C:** excepciones por fecha (bloquear un día / disponibilidad extra) además del horario semanal recurrente.
> Empezar por el Bloque A (el corazón del cambio). ⚠️ Con el modo estricto, cada masajista real DEBE configurar su disponibilidad o no le entrarán reservas.

### 🔑 Entorno en vivo (datos para trabajar)
- **Repo GitHub:** `github.com/kabalah314-ux/SAAS-madajesadomicilio`, rama de trabajo **`claude/funcional-y-harness`** (todo commiteado y pusheado; **PR #1 abierto a `main`**, sin mergear aún). ⚠️ El repo MassFlow es **SEPARADO** del worktree de Antigravity — los `git` van en `cd C:/Users/oscar/Documents/SAAS-madajesadomicilio`.
- **Supabase:** proyecto `lzvbfmphtrhvrjjnvqtt`. La IA administra por **Management API** (`POST https://api.supabase.com/v1/projects/<ref>/database/query`, header `User-Agent` obligatorio o Cloudflare da 403). Deploy de Edge Functions con la CLI:
  `SUPABASE_ACCESS_TOKEN=$(cat sb_token.txt) npx supabase functions deploy <fn> --project-ref lzvbfmphtrhvrjjnvqtt --no-verify-jwt --use-api`.
- **Token de Supabase** (`sbp_...`) en `C:\Users\oscar\AppData\Local\massflow\sb_token.txt` (fuera del repo). Léelo de ahí. Si da 401, el usuario da uno nuevo. **Helper de tests:** `harness/tests/sbhelp.py` (`q`, `q_as`, `admin_jwt`, `agente`).
- **Usuarios de prueba** (misma BD local y producción): `admin@` / `masajista@` / `clienta@massflow.app`, contraseña `Test1234`. Solo hay esas 3 cuentas.
- **Vercel:** proyecto `saas-madajesadomicilio`. `npx vercel --prod --yes` redespliega (usa `.env.production` con claves públicas). La CLI ya está logueada como `kabalah314-ux` y el proyecto vinculado vía `.vercel/repo.json` (id `prj_ChdAIfIMsOldxsOhg272ewupVECd`) — no hace falta token ni `vercel link`. ⚠️ En esa cuenta hay OTRO proyecto viejo parecido (`saas-masajes-a-domicilio`, con guiones): el bueno es `saas-madajesadomicilio`.
- **Checklist de credenciales VERIFICADO (2026-07-02)** — todo funciona sin pedir nada al usuario: ✅ token Supabase (`sb_token.txt`) ve el proyecto; ✅ `.env` y `.env.production` presentes en la raíz (gitignored, NO leerlos salvo necesidad: están en la lista `ask` de permisos); ✅ secrets de Edge Functions cargados en Supabase (`npx supabase secrets list`): `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `RESEND_API_KEY`, `EMAIL_FROM`, `WEBHOOK_SECRET`, `AGENTE_WEBHOOK_SECRET` (+ los `SUPABASE_*` inyectados); ✅ Vercel CLI logueada y vinculada; ✅ `git push` a GitHub funciona. Si el token de Supabase da 401, pedir uno nuevo al usuario y sobrescribir `sb_token.txt`.
- **Permisos:** ver `harness/PERMISOS.md`. `defaultMode:acceptEdits`; solo se pide permiso para la lista `ask` (borrados, `vercel --prod`, `git push --force`, secretos…). `supabase functions deploy` NO pide permiso.
- **Playwright montado** (`harness/tests/pw_*.cjs`, extensión `.cjs` porque el proyecto es ESM). `launch.json` del preview MCP va en el WORKTREE, no en MassFlow.

### ⚠️ Límite conocido (importante para el plan del usuario)
- **Email en modo prueba (Resend):** `EMAIL_FROM=onboarding@resend.dev` solo entrega a `recordingmythings@gmail.com`. Invitaciones/notificaciones a emails reales NO llegan hasta **verificar un dominio en resend.com/domains** y cambiar `EMAIL_FROM`. Mientras, la pantalla "Accesos" muestra el enlace de invitación para pasarlo a mano.
- **Single-tenant:** para vender a varios negocios hoy = clonar (nuevo Supabase + Vercel por cliente). Multi-tenant real = semanas (ver `06_VENDIBLE.md`).

### Datos de prueba en la BD (se pueden borrar)
`MF-001046` (reserva vieja de "Marta", expirada) + su contacto + conversación test `+34600000000`. Los tests limpian lo suyo (la BD vuelve a 3 reservas base: MF-001000/001/002).

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
