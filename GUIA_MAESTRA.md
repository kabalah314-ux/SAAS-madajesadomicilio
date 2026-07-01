# 🧭 GUÍA MAESTRA — MassFlow (SaaS Masajes a Domicilio)

> **Punto de entrada único del proyecto.** Empieza SIEMPRE por aquí.
> Si vas a trabajar en este repo, lee esta guía antes que cualquier otro `.md`.
> El resto de documentos son históricos o de un tema concreto (ver el mapa al final).

> 🛠️ **¿Vas a CONSTRUIR / llevar la app a 100%?** No trabajes desde aquí: ve a la carpeta
> **[`harness/`](harness/00_LEEME_PRIMERO.md)** — es el centro de control con el plan, el progreso
> (casillas) y el guion paso a paso. Esta guía es el "qué es"; el harness es el "qué hacemos ahora".

---

## 1. Qué es esto

**MassFlow** es un SaaS de gestión de servicios de **masajes a domicilio**, con **3 roles**:

- **Admin** — gestión total: reservas, masajistas, clientas, servicios, finanzas, transferencias, configuración.
- **Masajista** — su calendario, solicitudes (aceptar/rechazar con temporizador), historial, cobros, documentación, perfil, disponibilidad.
- **Clienta** — sus datos, nueva reserva (flujo guiado), sus reservas.

No es un esqueleto: el frontend está muy avanzado y hay un backend Supabase real (migraciones, RLS, seed, Edge Functions).

---

## 2. Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | **React 19** + **TypeScript** + **Vite 7** |
| Estilos | **Tailwind CSS 4** (vía `@tailwindcss/vite`) |
| Iconos / gráficos | `lucide-react`, `recharts` |
| Fechas | `date-fns` |
| Estado servidor | `@tanstack/react-query` (instalado) |
| Backend | **Supabase** (Postgres + Auth + Storage + Edge Functions Deno) |
| Deploy | **Vercel** (SPA, ver `vercel.json`) |

---

## 3. Cómo arrancar (local)

```bash
cd C:/Users/oscar/Documents/SAAS-madajesadomicilio
npm install
cp .env.example .env        # rellenar con tus claves Supabase
npm run dev                 # http://localhost:5173
```

Variables (`.env`):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

> ⚠️ Sin claves Supabase válidas el login real no funciona. Hay `src/mockData.ts` para datos de prueba; comprobar si la app cae a mock o exige Supabase antes de asumir que "no arranca".

Build de producción: `npm run build` · Preview: `npm run preview`

---

## 4. Mapa del código (`src/`)

```
src/
├── App.tsx              # Router por rol + render de vistas (sin react-router; switch por currentView)
├── AppContext.tsx       # Estado global de la app (currentUser, vistas)
├── main.tsx             # Entry
├── types.ts             # Tipos del dominio (Reserva, Masajista, Servicio, etc.)
├── mockData.ts          # Datos de demo
├── index.css            # Tailwind
├── hooks/
│   └── useAuth.tsx      # Auth con Supabase (signIn/signUp/signOut, profile + role)
├── lib/
│   └── supabase.ts      # Cliente Supabase
├── services/            # Capa de acceso a datos (1 archivo por entidad)
│   ├── reservas / masajistas / clientes / servicios
│   ├── transferencias / valoraciones / documentos / disponibilidad
│   ├── notificaciones / configuracion / profiles
│   └── edge-functions.service.ts
├── components/
│   ├── admin/           # Dashboard, GestionReservas/Masajistas/Clientas/Servicios/Transferencias, Finanzas, Configuracion
│   ├── masajista/       # MiCalendario, Solicitudes, Historial, MisCobros, Documentacion, MiPerfil, Disponibilidad
│   ├── clienta/         # MisDatos, NuevaReserva, MisReservas
│   ├── Login / Header / Sidebar / EmptyState
└── utils/cn.ts
```

> Nota: enrutado **por estado**, no por URL. Cambiar de vista = cambiar `currentView`, no navegar. Si en algún momento se quiere deep-linking, habría que meter `react-router`.

### Backend (`supabase/`)
```
supabase/
├── config.toml
├── migrations/   # 20260507* → init, rls, logic, storage, seed
└── functions/    # admin-actions, expire-reservas (Deno)
```

---

## 5. Reglas de negocio (fuente de verdad: README + configuración)

- **Comisión plataforma:** 40% · **Pago masajista:** 60% (configurable).
- **Precio máx. sesión:** 60 €.
- **Ciclo de pago a masajistas:** quincenal (1–15 y 16–fin de mes).
- **Tiempo de respuesta a una solicitud:** 2 h.
- **Cancelación de la clienta:** hasta 24 h antes.
- **Tipos de servicio:** Relajante, Descontracturante, Deportivo, Prenatal, Ayurveda, Parejas.
- **Estados de reserva:** `pendiente_asignacion`, `confirmada`, `completada`, `cancelada_clienta`, `cancelada_masajista`, `rechazada`.

### Usuarios demo
| Rol | Email | PIN |
|-----|-------|-----|
| Admin | `admin@massflow.com` | 1111 |
| Masajista (Laura) | `laura@massflow.com` | 2222 |
| Cliente (Ana) | `ana@email.com` | 5555 |

---

## 6. ✅ Estado real VERIFICADO (auditoría 2026-06-30)

> Auditoría exhaustiva del código (8 agentes leyendo línea a línea). **Los docs internos mienten**: dicen "100% completado", pero el producto funcional end-to-end está en **~45-55%**. Lo que sí está al ~90% es la UI, y el esquema de BD al ~85%. El agujero está en el **cableado UI ↔ datos**: muchos botones son fachada (`alert`/`console.log`/confirmaciones falsas) y 3 flujos nucleares están rotos.

### 🔴 SEGURIDAD — taparlo antes de cualquier despliegue
- **Registro público como Admin.** El formulario de registro ofrece botón "⚙️ Admin", `signUp` pasa el rol sin validar, y `config.toml` tiene `enable_signup=true` + `enable_confirmations=false`. **Cualquiera puede crearse cuenta admin.** Evidencia: `src/components/Login.tsx:180-186`, `src/hooks/useAuth.tsx:21`, `supabase/config.toml:171,221`.

### 🟢 Lo que FUNCIONA de verdad (cableado a Supabase)
- Auth real (email+password) + carga de perfil + realtime de notificaciones.
- **Admin:** dashboard KPIs, listados (reservas/masajistas/clientas/servicios), editar masajista, bloquear clienta, export CSV, guardar comisión y precio máx.
- **Masajista:** calendario semanal, marcar sesión completada, historial+KPIs, ver transferencias.
- **Clienta:** crear reserva (insert real), listar sus reservas, cancelar, valorar.
- **Backend:** 14 tablas + RLS + triggers (`handle_new_user`, notificaciones, rating) + storage + seed + 2 Edge Functions + realtime.

### 🟡 Roto / fachada (NO fiarse aunque la pantalla exista)
- **Admin → Asignar masajista:** roto (filtro por barrio siempre vacío → "no cubre zona", botón Confirmar inalcanzable). `GestionReservas.tsx:222`, `AppContext.tsx:308`.
- **Admin → Configuración** (ciclo pago, % Meta Ads, % pago): dice "guardado" pero NO persiste. `AppContext.tsx:537-545`.
- **Masajista → Solicitudes:** SIEMPRE VACÍA — se filtran por `masajista_id` pero las pendientes están sin asignar (`masajista_id=null`). Una masajista nunca ve solicitudes. `AppContext.tsx:175-184` vs `Solicitudes.tsx:14-16`.
- **Masajista → MiPerfil/Documentación:** el `currentUser` no trae bio/especialidades/zonas/documentos/rating → formularios vacíos, stats en blanco.
- **Clienta → MisDatos:** nombre/teléfono/preferencias NO se guardan (`updateClienta` no toca `profiles` ni `preferencias jsonb`).
- **Clienta → NuevaReserva:** la lista de masajistas no se carga para la clienta (`AppContext.tsx:78-80`) → solo "asignación automática"; franjas 09-21 hardcodeadas; **sin Stripe**; el código de reserva mostrado es inventado, no el real de BD.

### ⬜ Stub / botón muerto (`alert`/`console.log`/sin handler)
- Admin: crear masajista, CRUD de servicios, acciones de transferencias, cerrar ciclo de pagos.
- Masajista: subir/ver documento, editor de Disponibilidad (100% local), botón Reportar, cámara de perfil.
- Clienta: cambiar PIN, repetir reserva.

### ☠️ Código muerto / deuda estructural
- **`src/services/` (13 módulos): NADIE los importa.** `AppContext.tsx` reimplementa todo inline e incompleto → **dos implementaciones del acceso a datos**, una muerta y otra a medias. Decisión pendiente: usar `services/` como capa única (refactor) o borrarla.
- **`src/mockData.ts`: 0 imports**, código muerto que arrastra el esquema PIN obsoleto.
- **Edge Functions sin cablear a ningún botón**; `expire-reservas` **sin scheduler** (no hay pg_cron) → las reservas nunca expiran. `audit_log` y `pagos_stripe` son tablas sin un solo escritor.

### 🧩 Incoherencias de modelo
- **Rol `cliente` (BD/Auth) vs `clienta` (UI/types)**, traducido en un único punto frágil (`AppContext.tsx:44`).
- **Comisión: 25% real en BD** (`seed.sql:5`), pero 40% hardcodeado en `Dashboard.tsx:14` y 60% en comentarios de `types.ts`. Tres fuentes en conflicto.
- **Auth por PIN vestigial** (campo `pin`, `clientes.pin_hash`, `login()=>false`) conviviendo con el auth real email+password. Los "usuarios demo con PIN" del README (sección 5) son obsoletos: el login real es email+password.
- Estados de reserva distintos entre BD (`pendiente/aceptada/expirada…`) y `types.ts` (`pendiente_asignacion/confirmada…`).

### 🎯 Huecos críticos para que sea usable
1. Cerrar el agujero de admin (bloquear registro de rol admin, validar en servidor, activar confirmación email).
2. Cargar pendientes sin asignar para masajistas (+ matching zona/especialidad) y cargar el registro `masajistas` del usuario logueado.
3. Cargar masajistas para la clienta + mapear `reserva.valoracion`.
4. Integrar pago real (Stripe) — hay tabla `pagos_stripe` pero cero lógica de cobro.
5. Cablear escrituras que hoy son `alert`/`console.log` (CRUD servicios, transferencias, cierre de ciclos) y poner scheduler a `expire-reservas`.

> Cuando arreglemos algo de esto, actualizar esta sección — no crear un doc nuevo "FINAL_v2".

---

## 6.5 🤖 El Agente conversacional (en diseño)

Próxima gran pieza: un **agente** que atiende a clientes (primero por texto/test, luego
**WhatsApp** y **teléfono**), resuelve todo (reservar / consultar cita / info / recado) y
**guarda toda la conversación** para que el admin la consulte (nueva sección **"Agente"**)
y para análisis del negocio. Identifica por **número de teléfono** y da de alta a clientes
nuevos recogiendo datos poco a poco. El cerebro usará **OpenRouter** (modelos baratos,
API compatible con OpenAI).

> **Plan completo y decisiones en [`harness/08_AGENTE.md`](harness/08_AGENTE.md).** No se
> pica código del agente hasta cerrar ese plan. La base de datos (tablas de conversaciones
> y mensajes) ya está creada (migración `..._15_agente.sql`).

---

## 7. Mapa de documentos (qué es cada `.md`)

| Archivo | Para qué | Vigencia |
|---------|----------|----------|
| **GUIA_MAESTRA.md** (este) | Punto de entrada y orientación | ✅ Viva |
| `README.md` | Pitch + características + reglas de negocio | ✅ Útil |
| `CLAUDE.md` | Guía paso a paso de **migración a producción** (Supabase/Stripe/Vercel) + anexos SQL | 📘 Referencia técnica |
| `DEPLOYMENT.md` | Despliegue y producción | 📘 Referencia |
| `WHATSAPP_INTEGRATION.md` | Plan integración WhatsApp (pendiente) | 📘 Pendiente |
| `IMPLEMENTACION.md`, `ESTADO_COMPLETO.md`, `RESUMEN_FINAL.md`, `PROYECTO_100_COMPLETO.md`, `ACTUALIZACION_FINAL.md` | Bitácoras históricas de avance | 🗄️ Histórico (no fiarse de los %) |
| `directives/subir_a_github_SOP.md` | SOP para subir a GitHub | 📘 Procedimiento |

---

## 8. Cómo trabajar en este repo (método)

1. **Lee esta guía** y, si tocas backend, el `CLAUDE.md` (migración) y `supabase/`.
2. **Verifica antes de creer** cualquier % o "está hecho": míralo en el código.
3. **Un cambio = actualizar esta guía** (secciones 4/5/6) en lugar de crear otro `*_FINAL.md`.
4. **Antes de subir a GitHub**, sigue `directives/subir_a_github_SOP.md`.
5. Repo remoto: `kabalah314-ux/SAAS-madajesadomicilio` (privado/público según GitHub).

---

_Última actualización de esta guía: 2026-06-29._
