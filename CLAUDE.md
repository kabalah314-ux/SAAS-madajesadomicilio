# 🎯 MASSFLOW — GUÍA DE MIGRACIÓN A PRODUCCIÓN

> **Estado actual:** Frontend 100% funcional con mockData (25 componentes, 21 vistas, 16,500 líneas)  
> **Objetivo:** Migrar a producción con Supabase + Stripe + Vercel + GitHub CI/CD  
> **Última actualización:** 2026-05-07

---

## 📋 CONTEXTO DEL PROYECTO

### Lo que YA ESTÁ HECHO ✅
- ✅ **Frontend completo** (React 18 + TypeScript + Vite + Tailwind)
- ✅ **25 componentes** funcionales con mockData
- ✅ **3 roles diferenciados:** Admin, Masajista, Cliente
- ✅ **Sistema de diseño completo** con validaciones robustas
- ✅ **Bundle optimizado:** 232KB gzipped
- ✅ **Responsive completo**

### Lo que FALTA (Esta guía) ⚠️
- ⚠️ Backend real (PostgreSQL + Supabase)
- ⚠️ Autenticación JWT real
- ⚠️ Pagos con Stripe + Stripe Connect
- ⚠️ Storage de archivos (documentos, avatares)
- ⚠️ Edge Functions para lógica sensible
- ⚠️ Deploy automático (GitHub → Vercel)
- ⚠️ Notificaciones en tiempo real

---

## 🚀 PLAN DE EJECUCIÓN (17 PASOS)

### FASE 0: PREPARACIÓN (30 min)
**Objetivo:** Crear cuentas y recoger credenciales

**Tareas humanas (pedir al usuario):**
1. [ ] Crear cuenta Supabase → https://supabase.com (Free tier OK)
2. [ ] Crear cuenta Stripe → https://stripe.com (modo test)
3. [ ] Cuenta GitHub (ya existe)
4. [ ] Cuenta Vercel → https://vercel.com (login con GitHub)

**Tareas automáticas:**
```bash
# Instalar CLIs necesarias
npm install -g supabase
npm install -g vercel
# Stripe CLI: https://stripe.com/docs/stripe-cli

# Verificar versiones
node -v   # >= 20
npm -v    # >= 10
git --version
```

**Output esperado:** Credenciales guardadas en gestor de passwords.

---

### FASE 1: PROYECTO SUPABASE (15 min)
**Objetivo:** Crear proyecto y obtener keys

**Pasos:**
1. Ir a https://supabase.com/dashboard
2. **New project:**
   - Name: `massflow-prod`
   - DB password: *generar y guardar*
   - Region: `eu-west-1` (España) o la más cercana
   - Plan: Free

3. **Recoger credenciales** (Project Settings → API):
   ```
   Project URL        → VITE_SUPABASE_URL
   anon public key    → VITE_SUPABASE_ANON_KEY
   service_role key   → SUPABASE_SERVICE_ROLE_KEY (NUNCA en frontend)
   Project Ref        → Para CLI
   ```

4. **Conectar CLI local:**
   ```bash
   cd C:\Users\oscar\OneDrive\Documentos\VS Code\SAAS-madajesadomicilio-main
   supabase login
   supabase init
   supabase link --project-ref <PROJECT_REF>
   ```

**Output esperado:** Carpeta `supabase/` creada con estructura básica.

---

### FASE 2: SCHEMA SQL (45 min)
**Objetivo:** Crear todas las tablas en PostgreSQL

**Archivo a crear:** `supabase/migrations/0001_init.sql`

**Contenido completo:** Ver [ANEXO A — SQL SCHEMA](#anexo-a-sql-schema)

**Tablas que se crean (14):**
- `profiles` (extiende auth.users)
- `masajistas`
- `clientes`
- `servicios`
- `disponibilidad`
- `reservas`
- `valoraciones`
- `documentos`
- `ciclos_pago`
- `transferencias`
- `notificaciones`
- `configuracion`
- `pagos_stripe`
- `audit_log`

**Enums (6):**
- `user_role`, `reserva_estado`, `documento_estado`, `transferencia_estado`, `pago_estado`, `notificacion_tipo`

**Ejecutar:**
```bash
# Crear archivo (copiar contenido del anexo)
# Luego aplicar:
supabase db push
```

**Validar:**
```sql
-- En Supabase Dashboard → SQL Editor:
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- Debe devolver 14 tablas
```

---

### FASE 3: ROW LEVEL SECURITY (30 min)
**Objetivo:** Proteger datos con policies por rol

**Archivo a crear:** `supabase/migrations/0002_rls.sql`

**Contenido completo:** Ver [ANEXO B — RLS POLICIES](#anexo-b-rls-policies)

**Funciones helper:**
- `current_role()` → obtiene rol del usuario autenticado
- `is_admin()`, `is_masajista()`, `is_cliente()` → helpers booleanos

**Policies críticas:**
- Cliente solo ve sus propias reservas
- Masajista solo ve reservas donde está asignado
- Admin ve todo
- Nadie puede cambiar su propio rol
- Documentos solo visibles para owner + admin

**Ejecutar:**
```bash
supabase db push
```

**⚠️ CRÍTICO:** NUNCA desactivar RLS en producción. Si algo falla, ajustar la policy, NO quitar RLS.

---

### FASE 4: TRIGGERS Y FUNCIONES (30 min)
**Objetivo:** Automatizar lógica de negocio

**Archivo a crear:** `supabase/migrations/0003_logic.sql`

**Contenido completo:** Ver [ANEXO C — TRIGGERS](#anexo-c-triggers)

**Triggers que se crean:**
1. `handle_new_user` → crea profile + cliente/masajista al registrarse
2. `set_updated_at` → actualiza columna `updated_at` automáticamente
3. `recalc_rating_masajista` → recalcula rating al insertar valoración
4. `notify_reserva_event` → crea notificaciones en cambios de estado

**Vistas:**
- `v_admin_kpis` → métricas dashboard admin
- `v_pagos_pendientes_masajista` → para ciclos de pago

**Ejecutar:**
```bash
supabase db push
```

---

### FASE 5: STORAGE (15 min)
**Objetivo:** Configurar buckets para archivos

**Archivo a crear:** `supabase/migrations/0004_storage.sql`

**Contenido completo:** Ver [ANEXO D — STORAGE](#anexo-d-storage)

**Buckets:**
- `documentos` (privado) → DNI, seguro RC, certificados
- `avatars` (público) → fotos de perfil

**Convención de paths:**
- `documentos/{user_id}/dni.pdf`
- `avatars/{user_id}/profile.jpg`

**Policies:**
- Owner puede subir/leer sus propios archivos
- Admin puede leer todos los documentos
- Avatares son públicos (lectura)

**Ejecutar:**
```bash
supabase db push
```

---

### FASE 6: DATOS SEED (15 min)
**Objetivo:** Poblar configuración inicial y servicios

**Archivo a crear:** `supabase/migrations/0005_seed.sql`

**Contenido completo:** Ver [ANEXO E — SEED DATA](#anexo-e-seed-data)

**Inserta:**
- Configuración global (comisión 25%, precio máx 200€, etc.)
- 5 servicios demo (Relajante, Descontracturante, etc.)
- Instrucciones para crear admin manualmente

**Crear admin:**
```sql
-- 1. Ir a Supabase Dashboard → Authentication → Add user
--    Email: admin@massflow.app
--    Password: (elegir seguro)

-- 2. Ejecutar en SQL Editor:
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@massflow.app';
```

**Ejecutar:**
```bash
supabase db push
```

---

### FASE 7: TIPOS TYPESCRIPT (5 min)
**Objetivo:** Generar tipos desde el schema

**Ejecutar:**
```bash
supabase gen types typescript --linked > src/lib/database.types.ts
```

**⚠️ Importante:** Re-ejecutar este comando después de CADA cambio en el schema.

---

### FASE 8: FRONTEND — CLIENTE SUPABASE (20 min)
**Objetivo:** Conectar frontend a Supabase

**1. Instalar dependencias:**
```bash
npm install @supabase/supabase-js @tanstack/react-query
npm install @stripe/stripe-js @stripe/react-stripe-js
```

**2. Crear `.env.local`:**
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**3. Crear `.env.example`** (commitear sin valores):
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
```

**4. Crear `src/lib/supabase.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error('Faltan variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient<Database>(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
```

**5. Actualizar `.gitignore`:**
```
.env
.env.local
.env.*.local
```

---

### FASE 9: AUTH HOOK (30 min)
**Objetivo:** Sistema de autenticación real

**Crear `src/hooks/useAuth.ts`:**  
Ver [ANEXO F — HOOK AUTH](#anexo-f-hook-auth)

**Actualizar `src/main.tsx`:**
```typescript
import { AuthProvider } from './hooks/useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
```

**Refactorizar `src/components/Login.tsx`:**
- Reemplazar lógica mock por `useAuth().signIn(email, password)`
- Quitar PIN, usar password real
- Manejar errores de Supabase

---

### FASE 10: SERVICES LAYER (2-3 horas)
**Objetivo:** Reemplazar mockData por queries reales

**Estructura a crear:**
```
src/services/
├── reservas.service.ts
├── masajistas.service.ts
├── clientes.service.ts
├── servicios.service.ts
├── disponibilidad.service.ts
├── documentos.service.ts
├── valoraciones.service.ts
├── notificaciones.service.ts
├── transferencias.service.ts
└── configuracion.service.ts
```

**Ejemplo `src/services/reservas.service.ts`:**  
Ver [ANEXO G — SERVICE EXAMPLE](#anexo-g-service-example)

**Estrategia de migración:**
1. Crear un servicio a la vez
2. Refactorizar componente para usar servicio + `useQuery` / `useMutation`
3. Probar funcionalmente
4. Pasar al siguiente

**NO borrar `mockData.ts` hasta que TODO esté migrado.**

---

### FASE 11: EDGE FUNCTIONS (2 horas)
**Objetivo:** Lógica sensible en servidor

**Configurar secrets:**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

**Funciones a crear:**

**1. `supabase/functions/create-payment-intent/index.ts`**  
Ver [ANEXO H — EDGE FUNCTION PAYMENT](#anexo-h-edge-function-payment)

**2. `supabase/functions/stripe-webhook/index.ts`**  
Ver [ANEXO I — EDGE FUNCTION WEBHOOK](#anexo-i-edge-function-webhook)

**3. `supabase/functions/connect-onboarding/index.ts`**  
Ver [ANEXO J — EDGE FUNCTION CONNECT](#anexo-j-edge-function-connect)

**4. `supabase/functions/transfer-masajista/index.ts`**  
Ver [ANEXO K — EDGE FUNCTION TRANSFER](#anexo-k-edge-function-transfer)

**Deploy:**
```bash
supabase functions deploy create-payment-intent
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy connect-onboarding
supabase functions deploy transfer-masajista
```

**Configurar Stripe webhook:**
1. Dashboard Stripe → Developers → Webhooks
2. Add endpoint: `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`
3. Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
4. Copiar Signing Secret → `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`

---

### FASE 12: GITHUB (30 min)
**Objetivo:** Versionado + CI/CD

**1. Crear repo:**
```bash
git init
git add .
git commit -m "feat: initial commit with Supabase integration"
gh repo create massflow --private --source=. --push
```

**2. GitHub Secrets:**
Settings → Secrets → Actions:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`

**3. Crear `.github/workflows/db-migrate.yml`:**  
Ver [ANEXO L — GITHUB ACTION MIGRATE](#anexo-l-github-action-migrate)

**4. Crear `.github/workflows/edge-functions.yml`:**  
Ver [ANEXO M — GITHUB ACTION FUNCTIONS](#anexo-m-github-action-functions)

---

### FASE 13: VERCEL (20 min)
**Objetivo:** Deploy automático

**1. Importar proyecto:**
- https://vercel.com/new
- Seleccionar repo `massflow`
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

**2. Variables de entorno:**
Settings → Environment Variables (Production + Preview):
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**3. Crear `vercel.json`:**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**4. Configurar Auth URLs en Supabase:**
Authentication → URL Configuration:
- Site URL: `https://app.massflow.com` (o tu dominio Vercel)
- Redirect URLs:
  - `https://app.massflow.com/**`
  - `http://localhost:5173/**`
  - `https://*.vercel.app/**`

---

### FASE 14: TESTING (1-2 horas)
**Objetivo:** Validar todo funciona

**Checklist:**
- [ ] Registro de cliente crea fila en `profiles` y `clientes`
- [ ] Login funciona y carga perfil correcto
- [ ] Cliente A no ve datos de Cliente B (RLS)
- [ ] Crear reserva calcula comisión correctamente
- [ ] Aceptar/rechazar genera notificación
- [ ] PaymentIntent se crea con monto correcto
- [ ] Webhook actualiza estado a "pagado"
- [ ] Masajista sube documento a Storage
- [ ] Admin ve todos los documentos
- [ ] Notificaciones aparecen en tiempo real (sin reload)

**Test Stripe local:**
```bash
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
```

---

### FASE 15: GO LIVE (30 min)
**Objetivo:** Cambiar a modo producción

**1. Stripe → Live mode:**
- Cambiar `pk_test_` → `pk_live_`
- Cambiar `sk_test_` → `sk_live_`
- Re-configurar webhook con URL de producción

**2. Activar 2FA:**
- [ ] Supabase
- [ ] GitHub
- [ ] Stripe
- [ ] Vercel

**3. Backups:**
- Supabase → Database → Backups → Enable daily backups

**4. Monitoreo (opcional pero recomendado):**
- Sentry para errores frontend
- Supabase logs para backend
- Stripe dashboard para pagos

---

## 📚 ANEXOS (CÓDIGO COMPLETO)

### ANEXO A — SQL SCHEMA

<details>
<summary>Ver código completo de <code>0001_init.sql</code></summary>

```sql
-- =========================================================
-- MASSFLOW - INIT SCHEMA
-- =========================================================

-- Extensiones
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =========================================================
-- ENUMS
-- =========================================================
create type user_role as enum ('admin', 'masajista', 'cliente');
create type reserva_estado as enum ('pendiente','aceptada','rechazada','completada','cancelada','expirada');
create type documento_estado as enum ('pendiente','verificado','rechazado');
create type transferencia_estado as enum ('pendiente','enviada','confirmada','fallida');
create type pago_estado as enum ('pendiente','pagado','reembolsado','fallido');
create type notificacion_tipo as enum (
  'reserva_nueva','reserva_aceptada','reserva_rechazada','reserva_cancelada',
  'documento_verificado','documento_rechazado','pago_recibido','valoracion_recibida','sistema'
);

-- =========================================================
-- TABLA: profiles
-- =========================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'cliente',
  full_name   text not null,
  email       text not null unique,
  phone       text,
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_profiles_role on public.profiles(role);
create index idx_profiles_active on public.profiles(is_active);

-- =========================================================
-- TABLA: masajistas
-- =========================================================
create table public.masajistas (
  id                  uuid primary key references public.profiles(id) on delete cascade,
  bio                 text,
  especialidades      text[] not null default '{}',
  zonas_cobertura     text[] not null default '{}',
  anos_experiencia    int not null default 0,
  iban                text,
  stripe_account_id   text unique,
  stripe_onboarding_completed boolean not null default false,
  rating_promedio     numeric(3,2) not null default 0,
  total_sesiones      int not null default 0,
  is_verified         boolean not null default false,
  is_suspended        boolean not null default false,
  suspension_reason   text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index idx_masajistas_verified on public.masajistas(is_verified);
create index idx_masajistas_suspended on public.masajistas(is_suspended);

-- =========================================================
-- TABLA: clientes
-- =========================================================
create table public.clientes (
  id                  uuid primary key references public.profiles(id) on delete cascade,
  direccion           text,
  ciudad              text,
  codigo_postal       text,
  preferencias        jsonb not null default '{}'::jsonb,
  pin_hash            text,
  is_blocked          boolean not null default false,
  block_reason        text,
  internal_notes      text,
  stripe_customer_id  text unique,
  total_reservas      int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- =========================================================
-- TABLA: servicios
-- =========================================================
create table public.servicios (
  id           uuid primary key default uuid_generate_v4(),
  nombre       text not null,
  descripcion  text,
  duracion_min int not null check (duracion_min > 0),
  precio_eur   numeric(10,2) not null check (precio_eur >= 0),
  is_active    boolean not null default true,
  orden        int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- =========================================================
-- TABLA: disponibilidad
-- =========================================================
create table public.disponibilidad (
  id            uuid primary key default uuid_generate_v4(),
  masajista_id  uuid not null references public.masajistas(id) on delete cascade,
  dia_semana    int  not null check (dia_semana between 0 and 6),
  hora_inicio   time not null,
  hora_fin      time not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  check (hora_fin > hora_inicio)
);
create index idx_disponibilidad_masajista on public.disponibilidad(masajista_id);

-- =========================================================
-- TABLA: reservas
-- =========================================================
create sequence reserva_codigo_seq start 1000;

create table public.reservas (
  id                 uuid primary key default uuid_generate_v4(),
  codigo             text unique not null default ('MF-' || lpad(nextval('reserva_codigo_seq')::text, 6, '0')),
  cliente_id         uuid not null references public.clientes(id) on delete restrict,
  masajista_id       uuid references public.masajistas(id) on delete set null,
  servicio_id        uuid not null references public.servicios(id) on delete restrict,
  fecha              date not null,
  hora_inicio        time not null,
  duracion_min       int  not null,
  direccion_servicio text not null,
  ciudad             text not null,
  codigo_postal      text,
  notas_cliente      text,
  estado             reserva_estado not null default 'pendiente',
  precio_total       numeric(10,2) not null,
  comision_pct       numeric(5,2)  not null,
  comision_monto     numeric(10,2) not null,
  pago_masajista     numeric(10,2) not null,
  pago_estado        pago_estado not null default 'pendiente',
  stripe_payment_intent_id text,
  rechazo_motivo     text,
  cancelacion_motivo text,
  cancelado_por      uuid references public.profiles(id),
  expira_en          timestamptz,
  aceptada_en        timestamptz,
  completada_en      timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index idx_reservas_cliente on public.reservas(cliente_id);
create index idx_reservas_masajista on public.reservas(masajista_id);
create index idx_reservas_fecha on public.reservas(fecha);
create index idx_reservas_estado on public.reservas(estado);

-- =========================================================
-- TABLA: valoraciones
-- =========================================================
create table public.valoraciones (
  id            uuid primary key default uuid_generate_v4(),
  reserva_id    uuid not null unique references public.reservas(id) on delete cascade,
  cliente_id    uuid not null references public.clientes(id),
  masajista_id  uuid not null references public.masajistas(id),
  puntuacion    int not null check (puntuacion between 1 and 5),
  comentario    text,
  created_at    timestamptz not null default now()
);
create index idx_valoraciones_masajista on public.valoraciones(masajista_id);

-- =========================================================
-- TABLA: documentos
-- =========================================================
create table public.documentos (
  id            uuid primary key default uuid_generate_v4(),
  masajista_id  uuid not null references public.masajistas(id) on delete cascade,
  tipo          text not null,
  storage_path  text not null,
  estado        documento_estado not null default 'pendiente',
  rechazo_motivo text,
  uploaded_at   timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid references public.profiles(id)
);
create unique index uq_documentos_masajista_tipo on public.documentos(masajista_id, tipo);

-- =========================================================
-- TABLA: ciclos_pago
-- =========================================================
create table public.ciclos_pago (
  id            uuid primary key default uuid_generate_v4(),
  fecha_inicio  date not null,
  fecha_fin     date not null,
  is_closed     boolean not null default false,
  closed_at     timestamptz,
  created_at    timestamptz not null default now(),
  unique (fecha_inicio, fecha_fin),
  check (fecha_fin >= fecha_inicio)
);

-- =========================================================
-- TABLA: transferencias
-- =========================================================
create table public.transferencias (
  id              uuid primary key default uuid_generate_v4(),
  ciclo_id        uuid not null references public.ciclos_pago(id) on delete restrict,
  masajista_id    uuid not null references public.masajistas(id) on delete restrict,
  monto_eur       numeric(10,2) not null,
  num_sesiones    int not null,
  estado          transferencia_estado not null default 'pendiente',
  stripe_transfer_id text,
  referencia      text,
  enviada_en      timestamptz,
  confirmada_en   timestamptz,
  notas           text,
  created_at      timestamptz not null default now(),
  unique (ciclo_id, masajista_id)
);

-- =========================================================
-- TABLA: notificaciones
-- =========================================================
create table public.notificaciones (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  tipo        notificacion_tipo not null,
  titulo      text not null,
  mensaje     text not null,
  payload     jsonb not null default '{}'::jsonb,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index idx_notif_user_unread on public.notificaciones(user_id, is_read);

-- =========================================================
-- TABLA: configuracion
-- =========================================================
create table public.configuracion (
  clave       text primary key,
  valor       jsonb not null,
  descripcion text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id)
);

-- =========================================================
-- TABLA: pagos_stripe
-- =========================================================
create table public.pagos_stripe (
  id                       uuid primary key default uuid_generate_v4(),
  reserva_id               uuid not null references public.reservas(id) on delete cascade,
  stripe_payment_intent_id text not null unique,
  stripe_charge_id         text,
  monto_eur                numeric(10,2) not null,
  estado                   pago_estado not null default 'pendiente',
  metodo                   text,
  raw_event                jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index idx_pagos_reserva on public.pagos_stripe(reserva_id);

-- =========================================================
-- TABLA: audit_log
-- =========================================================
create table public.audit_log (
  id          bigserial primary key,
  actor_id    uuid references public.profiles(id),
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  diff        jsonb,
  created_at  timestamptz not null default now()
);
```

</details>

---

### ANEXO B — RLS POLICIES

<details>
<summary>Ver código completo de <code>0002_rls.sql</code></summary>

```sql
-- =========================================================
-- HELPER FUNCTIONS
-- =========================================================
create or replace function public.current_role()
returns user_role
language sql stable security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select public.current_role() = 'admin';
$$;

create or replace function public.is_masajista()
returns boolean language sql stable as $$
  select public.current_role() = 'masajista';
$$;

create or replace function public.is_cliente()
returns boolean language sql stable as $$
  select public.current_role() = 'cliente';
$$;

-- =========================================================
-- ACTIVAR RLS
-- =========================================================
alter table public.profiles        enable row level security;
alter table public.masajistas      enable row level security;
alter table public.clientes        enable row level security;
alter table public.servicios       enable row level security;
alter table public.disponibilidad  enable row level security;
alter table public.reservas        enable row level security;
alter table public.valoraciones    enable row level security;
alter table public.documentos      enable row level security;
alter table public.ciclos_pago     enable row level security;
alter table public.transferencias  enable row level security;
alter table public.notificaciones  enable row level security;
alter table public.configuracion   enable row level security;
alter table public.pagos_stripe    enable row level security;
alter table public.audit_log       enable row level security;

-- =========================================================
-- PROFILES
-- =========================================================
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using ( auth.uid() = id or public.is_admin() );

create policy "profiles_update_own"
  on public.profiles for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id and role = (select role from public.profiles where id = auth.uid()) );

create policy "profiles_admin_all"
  on public.profiles for all
  using ( public.is_admin() )
  with check ( public.is_admin() );

-- =========================================================
-- MASAJISTAS
-- =========================================================
create policy "masajistas_select_public"
  on public.masajistas for select
  using ( true );

create policy "masajistas_update_own"
  on public.masajistas for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

create policy "masajistas_admin_all"
  on public.masajistas for all
  using ( public.is_admin() );

-- =========================================================
-- CLIENTES
-- =========================================================
create policy "clientes_select_own_or_admin_or_assigned_masajista"
  on public.clientes for select
  using (
    auth.uid() = id
    or public.is_admin()
    or exists (
      select 1 from public.reservas r
      where r.cliente_id = clientes.id
        and r.masajista_id = auth.uid()
    )
  );

create policy "clientes_update_own"
  on public.clientes for update
  using ( auth.uid() = id ) with check ( auth.uid() = id );

create policy "clientes_admin_all"
  on public.clientes for all using ( public.is_admin() );

-- =========================================================
-- SERVICIOS
-- =========================================================
create policy "servicios_select_all"
  on public.servicios for select using ( is_active = true or public.is_admin() );

create policy "servicios_admin_write"
  on public.servicios for all using ( public.is_admin() ) with check ( public.is_admin() );

-- =========================================================
-- DISPONIBILIDAD
-- =========================================================
create policy "disp_select_all"
  on public.disponibilidad for select using ( true );

create policy "disp_owner_write"
  on public.disponibilidad for all
  using ( masajista_id = auth.uid() or public.is_admin() )
  with check ( masajista_id = auth.uid() or public.is_admin() );

-- =========================================================
-- RESERVAS
-- =========================================================
create policy "reservas_select_visible"
  on public.reservas for select
  using (
    cliente_id   = auth.uid()
    or masajista_id = auth.uid()
    or public.is_admin()
  );

create policy "reservas_insert_cliente"
  on public.reservas for insert
  with check ( cliente_id = auth.uid() and public.is_cliente() );

create policy "reservas_update_participants"
  on public.reservas for update
  using (
    cliente_id   = auth.uid()
    or masajista_id = auth.uid()
    or public.is_admin()
  );

create policy "reservas_delete_admin"
  on public.reservas for delete using ( public.is_admin() );

-- =========================================================
-- VALORACIONES
-- =========================================================
create policy "valoraciones_select_all"
  on public.valoraciones for select using ( true );

create policy "valoraciones_insert_cliente"
  on public.valoraciones for insert
  with check (
    cliente_id = auth.uid()
    and exists (
      select 1 from public.reservas r
      where r.id = valoraciones.reserva_id
        and r.cliente_id = auth.uid()
        and r.estado = 'completada'
    )
  );

-- =========================================================
-- DOCUMENTOS
-- =========================================================
create policy "documentos_owner_or_admin_select"
  on public.documentos for select
  using ( masajista_id = auth.uid() or public.is_admin() );

create policy "documentos_owner_insert"
  on public.documentos for insert
  with check ( masajista_id = auth.uid() );

create policy "documentos_owner_update_own"
  on public.documentos for update
  using ( masajista_id = auth.uid() and estado = 'pendiente' );

create policy "documentos_admin_all"
  on public.documentos for all using ( public.is_admin() );

-- =========================================================
-- CICLOS + TRANSFERENCIAS
-- =========================================================
create policy "ciclos_admin"
  on public.ciclos_pago for all using ( public.is_admin() ) with check ( public.is_admin() );

create policy "transfer_admin_all"
  on public.transferencias for all using ( public.is_admin() );

create policy "transfer_select_own"
  on public.transferencias for select
  using ( masajista_id = auth.uid() or public.is_admin() );

-- =========================================================
-- NOTIFICACIONES
-- =========================================================
create policy "notif_select_own"
  on public.notificaciones for select using ( user_id = auth.uid() );

create policy "notif_update_own"
  on public.notificaciones for update using ( user_id = auth.uid() );

-- =========================================================
-- CONFIGURACION
-- =========================================================
create policy "config_select_all"
  on public.configuracion for select using ( true );

create policy "config_admin_write"
  on public.configuracion for all using ( public.is_admin() ) with check ( public.is_admin() );

-- =========================================================
-- PAGOS_STRIPE
-- =========================================================
create policy "pagos_select_visible"
  on public.pagos_stripe for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.reservas r
      where r.id = pagos_stripe.reserva_id
        and (r.cliente_id = auth.uid() or r.masajista_id = auth.uid())
    )
  );

-- =========================================================
-- AUDIT LOG
-- =========================================================
create policy "audit_admin_only"
  on public.audit_log for select using ( public.is_admin() );
```

</details>

---

### ANEXO C — TRIGGERS

<details>
<summary>Ver código completo de <code>0003_logic.sql</code></summary>

```sql
-- =========================================================
-- TRIGGER: handle_new_user
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role user_role;
  v_full_name text;
begin
  v_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'cliente');
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  insert into public.profiles (id, role, full_name, email, phone)
  values (new.id, v_role, v_full_name, new.email, new.raw_user_meta_data->>'phone');

  if v_role = 'cliente' then
    insert into public.clientes (id) values (new.id);
  elsif v_role = 'masajista' then
    insert into public.masajistas (id) values (new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- TRIGGER: updated_at
-- =========================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_profiles_updated   before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_masajistas_updated before update on public.masajistas for each row execute function public.set_updated_at();
create trigger trg_clientes_updated   before update on public.clientes for each row execute function public.set_updated_at();
create trigger trg_servicios_updated  before update on public.servicios for each row execute function public.set_updated_at();
create trigger trg_reservas_updated   before update on public.reservas for each row execute function public.set_updated_at();
create trigger trg_pagos_updated      before update on public.pagos_stripe for each row execute function public.set_updated_at();

-- =========================================================
-- TRIGGER: rating masajista
-- =========================================================
create or replace function public.recalc_rating_masajista()
returns trigger language plpgsql as $$
begin
  update public.masajistas m
  set rating_promedio = sub.avg_p,
      total_sesiones  = sub.cnt
  from (
    select masajista_id, round(avg(puntuacion)::numeric, 2) as avg_p, count(*) as cnt
    from public.valoraciones
    where masajista_id = new.masajista_id
    group by masajista_id
  ) sub
  where m.id = sub.masajista_id;
  return new;
end; $$;

create trigger trg_valoraciones_rating
  after insert on public.valoraciones
  for each row execute function public.recalc_rating_masajista();

-- =========================================================
-- TRIGGER: notificaciones
-- =========================================================
create or replace function public.notify_reserva_event()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' and new.masajista_id is not null then
    insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
    values (new.masajista_id, 'reserva_nueva', 'Nueva solicitud',
            'Tienes una nueva solicitud de reserva ' || new.codigo,
            jsonb_build_object('reserva_id', new.id));
  end if;

  if TG_OP = 'UPDATE' and old.estado <> new.estado then
    if new.estado = 'aceptada' then
      insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
      values (new.cliente_id, 'reserva_aceptada', 'Reserva confirmada',
              'Tu reserva ' || new.codigo || ' fue aceptada',
              jsonb_build_object('reserva_id', new.id));
    elsif new.estado = 'rechazada' then
      insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
      values (new.cliente_id, 'reserva_rechazada', 'Reserva rechazada',
              'Tu reserva ' || new.codigo || ' fue rechazada',
              jsonb_build_object('reserva_id', new.id, 'motivo', new.rechazo_motivo));
    elsif new.estado = 'cancelada' then
      insert into public.notificaciones (user_id, tipo, titulo, mensaje, payload)
      values (
        case when new.cancelado_por = new.cliente_id then new.masajista_id else new.cliente_id end,
        'reserva_cancelada', 'Reserva cancelada',
        'La reserva ' || new.codigo || ' fue cancelada',
        jsonb_build_object('reserva_id', new.id));
    end if;
  end if;
  return new;
end; $$;

create trigger trg_reservas_notify
  after insert or update on public.reservas
  for each row execute function public.notify_reserva_event();

-- =========================================================
-- VISTA: kpis_admin
-- =========================================================
create or replace view public.v_admin_kpis as
select
  (select count(*) from public.reservas where estado = 'completada' and date_trunc('month', fecha) = date_trunc('month', now())) as reservas_mes,
  (select coalesce(sum(precio_total),0) from public.reservas where estado='completada' and date_trunc('month',fecha)=date_trunc('month',now())) as ingresos_mes,
  (select coalesce(sum(comision_monto),0) from public.reservas where estado='completada' and date_trunc('month',fecha)=date_trunc('month',now())) as comisiones_mes,
  (select count(*) from public.masajistas where is_verified = true and is_suspended = false) as masajistas_activos,
  (select count(*) from public.clientes where is_blocked = false) as clientes_activos;

-- =========================================================
-- VISTA: pagos pendientes
-- =========================================================
create or replace view public.v_pagos_pendientes_masajista as
select
  m.id as masajista_id,
  count(r.*) as num_sesiones,
  sum(r.pago_masajista) as monto_pendiente
from public.masajistas m
left join public.reservas r
  on r.masajista_id = m.id
 and r.estado = 'completada'
 and r.id not in (
    select unnest(string_to_array(coalesce(t.referencia,''), ','))::uuid
    from public.transferencias t where t.estado in ('enviada','confirmada')
 )
group by m.id;
```

</details>

---

### ANEXO D — STORAGE

<details>
<summary>Ver código completo de <code>0004_storage.sql</code></summary>

```sql
-- =========================================================
-- BUCKETS
-- =========================================================
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- =========================================================
-- POLICIES: documentos
-- =========================================================
create policy "doc_owner_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documentos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

create policy "doc_owner_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "doc_owner_update"
  on storage.objects for update to authenticated
  using ( bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text );

-- =========================================================
-- POLICIES: avatars
-- =========================================================
create policy "avatars_public_read"
  on storage.objects for select using ( bucket_id = 'avatars' );

create policy "avatars_owner_write"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );

create policy "avatars_owner_update"
  on storage.objects for update to authenticated
  using ( bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text );
```

</details>

---

### ANEXO E — SEED DATA

<details>
<summary>Ver código completo de <code>0005_seed.sql</code></summary>

```sql
-- =========================================================
-- CONFIGURACION INICIAL
-- =========================================================
insert into public.configuracion (clave, valor, descripcion) values
  ('comision_pct',         '25',                 'Porcentaje de comisión de la plataforma'),
  ('precio_maximo_eur',    '200',                'Precio máximo permitido por servicio'),
  ('cancelacion_horas',    '24',                 'Horas mínimas antes para cancelar sin penalización'),
  ('solicitud_timeout_min','60',                 'Minutos para que masajista responda solicitud'),
  ('moneda',               '"EUR"',              'Moneda principal'),
  ('iva_pct',              '21',                 'IVA aplicado'),
  ('soporte_email',        '"soporte@massflow.app"', 'Email de soporte')
on conflict (clave) do nothing;

-- =========================================================
-- SERVICIOS DEMO
-- =========================================================
insert into public.servicios (nombre, descripcion, duracion_min, precio_eur, orden) values
  ('Masaje Relajante 60 min',    'Masaje sueco enfocado en relajación', 60,  55.00, 1),
  ('Masaje Descontracturante 60','Trabajo profundo de tensiones',       60,  65.00, 2),
  ('Masaje Deportivo 60 min',    'Pre/post entreno',                    60,  70.00, 3),
  ('Masaje Pareja 90 min',       '2 masajistas simultáneos',            90, 140.00, 4),
  ('Drenaje Linfático 75 min',   'Técnica suave de drenaje',            75,  80.00, 5);

-- =========================================================
-- ADMIN: crear manualmente
-- =========================================================
-- 1. Dashboard Supabase → Authentication → Add user
--    Email: admin@massflow.app
--    Password: (elegir seguro)
-- 
-- 2. Ejecutar en SQL Editor:
--    UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@massflow.app';
```

</details>

---

### ANEXO F — HOOK AUTH

<details>
<summary>Ver código completo de <code>src/hooks/useAuth.ts</code></summary>

```typescript
import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

type Profile = {
  id: string;
  role: 'admin' | 'masajista' | 'cliente';
  full_name: string;
  email: string;
  avatar_url: string | null;
};

type AuthCtx = {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, meta: { full_name: string; role: 'cliente'|'masajista'; phone?: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadProfile(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    setProfile(data as Profile | null);
    setLoading(false);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string, meta: any) {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: meta },
    });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <Ctx.Provider value={{ user, profile, session, loading, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}
```

</details>

---

### ANEXO G — SERVICE EXAMPLE

<details>
<summary>Ver código completo de <code>src/services/reservas.service.ts</code></summary>

```typescript
import { supabase } from '../lib/supabase';

export async function listReservasCliente(clienteId: string) {
  const { data, error } = await supabase
    .from('reservas')
    .select('*, servicio:servicios(*), masajista:masajistas(id, profile:profiles(full_name, avatar_url))')
    .eq('cliente_id', clienteId)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data;
}

export async function crearReserva(input: {
  cliente_id: string;
  servicio_id: string;
  masajista_id?: string;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  direccion_servicio: string;
  ciudad: string;
  codigo_postal?: string;
  notas_cliente?: string;
  precio_total: number;
}) {
  // Calcular comisión desde configuracion
  const { data: cfg } = await supabase.from('configuracion').select('valor').eq('clave','comision_pct').single();
  const comision_pct = Number(cfg?.valor ?? 25);
  const comision_monto = +(input.precio_total * comision_pct / 100).toFixed(2);
  const pago_masajista = +(input.precio_total - comision_monto).toFixed(2);

  const { data, error } = await supabase.from('reservas').insert({
    ...input,
    comision_pct,
    comision_monto,
    pago_masajista,
    estado: 'pendiente',
  }).select().single();
  if (error) throw error;
  return data;
}

export async function aceptarReserva(id: string) {
  const { error } = await supabase.from('reservas')
    .update({ estado: 'aceptada', aceptada_en: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function rechazarReserva(id: string, motivo: string) {
  const { error } = await supabase.from('reservas')
    .update({ estado: 'rechazada', rechazo_motivo: motivo })
    .eq('id', id);
  if (error) throw error;
}

export async function cancelarReserva(id: string, motivo: string, userId: string) {
  const { error } = await supabase.from('reservas')
    .update({ estado: 'cancelada', cancelacion_motivo: motivo, cancelado_por: userId })
    .eq('id', id);
  if (error) throw error;
}

export async function completarReserva(id: string) {
  const { error } = await supabase.from('reservas')
    .update({ estado: 'completada', completada_en: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
```

</details>

---

### ANEXO H — EDGE FUNCTION PAYMENT

<details>
<summary>Ver código completo de <code>supabase/functions/create-payment-intent/index.ts</code></summary>

```typescript
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { reserva_id } = await req.json();
  const { data: r, error } = await supabase
    .from("reservas")
    .select("id, precio_total, cliente_id, masajista_id, codigo")
    .eq("id", reserva_id).single();
  if (error || !r) return new Response("Reserva no encontrada", { status: 404 });

  // Obtener / crear stripe_customer_id
  const { data: cliente } = await supabase
    .from("clientes").select("stripe_customer_id, profiles!inner(email, full_name)")
    .eq("id", r.cliente_id).single();

  let customerId = cliente?.stripe_customer_id;
  if (!customerId) {
    const c = await stripe.customers.create({
      email: cliente!.profiles.email,
      name: cliente!.profiles.full_name,
    });
    customerId = c.id;
    await supabase.from("clientes").update({ stripe_customer_id: customerId }).eq("id", r.cliente_id);
  }

  const pi = await stripe.paymentIntents.create({
    amount: Math.round(r.precio_total * 100),
    currency: "eur",
    customer: customerId,
    metadata: { reserva_id: r.id, codigo: r.codigo },
    automatic_payment_methods: { enabled: true },
  });

  await supabase.from("pagos_stripe").insert({
    reserva_id: r.id,
    stripe_payment_intent_id: pi.id,
    monto_eur: r.precio_total,
    estado: "pendiente",
  });

  await supabase.from("reservas").update({ stripe_payment_intent_id: pi.id }).eq("id", r.id);

  return Response.json({ clientSecret: pi.client_secret });
});
```

</details>

---

### ANEXO I — EDGE FUNCTION WEBHOOK

<details>
<summary>Ver código completo de <code>supabase/functions/stripe-webhook/index.ts</code></summary>

```typescript
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const whsec = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

serve(async (req) => {
  const sig = req.headers.get("stripe-signature")!;
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, whsec);
  } catch (e) {
    return new Response(`Webhook Error: ${e.message}`, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await supabase.from("pagos_stripe").update({
        estado: "pagado",
        stripe_charge_id: pi.latest_charge as string,
        raw_event: event as any,
      }).eq("stripe_payment_intent_id", pi.id);

      await supabase.from("reservas").update({ pago_estado: "pagado" })
        .eq("stripe_payment_intent_id", pi.id);
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await supabase.from("pagos_stripe").update({ estado: "fallido", raw_event: event as any })
        .eq("stripe_payment_intent_id", pi.id);
      break;
    }
    case "charge.refunded": {
      const ch = event.data.object as Stripe.Charge;
      await supabase.from("pagos_stripe").update({ estado: "reembolsado", raw_event: event as any })
        .eq("stripe_charge_id", ch.id);
      break;
    }
  }
  return new Response("ok");
});
```

</details>

---

### ANEXO J — EDGE FUNCTION CONNECT

<details>
<summary>Ver estructura de <code>supabase/functions/connect-onboarding/index.ts</code></summary>

```typescript
// Crear cuenta Stripe Connect Express para masajista
// 1. stripe.accounts.create({ type: 'express', country: 'ES', email })
// 2. Guardar account.id en masajistas.stripe_account_id
// 3. Crear accountLink de onboarding → devolver URL
// 4. Frontend redirige a esa URL
// 5. Stripe redirige de vuelta → marcar stripe_onboarding_completed=true
```

</details>

---

### ANEXO K — EDGE FUNCTION TRANSFER

<details>
<summary>Ver estructura de <code>supabase/functions/transfer-masajista/index.ts</code></summary>

```typescript
// Transferir a masajistas al cerrar ciclo
// Input: { ciclo_id }
// 1. Buscar todas las reservas completadas del ciclo sin transferir
// 2. Agrupar por masajista_id
// 3. Por cada masajista con stripe_onboarding_completed=true:
//    - stripe.transfers.create({ amount, destination: stripe_account_id })
//    - Insertar en transferencias
```

</details>

---

### ANEXO L — GITHUB ACTION MIGRATE

<details>
<summary>Ver código completo de <code>.github/workflows/db-migrate.yml</code></summary>

```yaml
name: Supabase Migrations
on:
  push:
    branches: [ main ]
    paths: [ 'supabase/migrations/**' ]
jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with: { version: latest }
      - run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD:  ${{ secrets.SUPABASE_DB_PASSWORD }}
      - run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD:  ${{ secrets.SUPABASE_DB_PASSWORD }}
```

</details>

---

### ANEXO M — GITHUB ACTION FUNCTIONS

<details>
<summary>Ver código completo de <code>.github/workflows/edge-functions.yml</code></summary>

```yaml
name: Deploy Edge Functions
on:
  push:
    branches: [ main ]
    paths: [ 'supabase/functions/**' ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env: { SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }} }
      - run: |
          supabase functions deploy create-payment-intent
          supabase functions deploy stripe-webhook --no-verify-jwt
          supabase functions deploy connect-onboarding
          supabase functions deploy transfer-masajista
        env: { SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }} }
```

</details>

---

## 🎓 COMANDOS RÁPIDOS

```bash
# Crear nueva migración
supabase migration new nombre_descriptivo

# Aplicar migraciones
supabase db push

# Resetear DB local (⚠️ borra todo)
supabase db reset

# Generar tipos TS (ejecutar después de cada migración)
supabase gen types typescript --linked > src/lib/database.types.ts

# Desarrollo local
supabase start            # Docker: DB + Auth + Storage
npm run dev               # Frontend
supabase functions serve  # Edge functions

# Stripe local webhook
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# Deploy funciones
supabase functions deploy nombre-funcion
supabase functions deploy nombre-funcion --no-verify-jwt  # para webhooks externos

# Configurar secrets
supabase secrets set KEY=value

# Ver logs
supabase functions logs nombre-funcion
```

---

## ⚠️ REGLAS DE SEGURIDAD INNEGOCIABLES

1. ❌ **NUNCA** commitear `.env` o `service_role` key
2. ❌ **NUNCA** desactivar RLS en producción
3. ❌ **NUNCA** calcular precios solo en cliente
4. ❌ **NUNCA** confiar en datos del frontend sin validar
5. ✅ **SIEMPRE** versionar migraciones SQL
6. ✅ **SIEMPRE** usar `service_role` solo en Edge Functions
7. ✅ **SIEMPRE** verificar firmas de webhooks
8. ✅ **SIEMPRE** rotar claves al pasar a producción

---

## 🐛 TROUBLESHOOTING

| Síntoma | Causa | Solución |
|---------|-------|----------|
| `permission denied for table X` | Falta policy RLS | Revisar policies o usar service_role en función |
| `new row violates row-level security` | Policy INSERT incorrecta | Añadir `with check` adecuado |
| Webhook Stripe 400 | Secret incorrecto | `supabase secrets set STRIPE_WEBHOOK_SECRET=...` |
| `VITE_SUPABASE_URL undefined` | Env var no inyectada | Re-deploy tras añadir en Vercel |
| Trigger falla silencioso | Metadata mal / email duplicado | Supabase Dashboard → Database → Logs |
| CORS en Edge Function | Falta header | Añadir `Access-Control-Allow-Origin: *` |
| Storage 403 | Policy de bucket incorrecta | Revisar `storage.objects` policies |
| Tipos TS desactualizados | Schema cambió | Re-ejecutar `supabase gen types` |

---

## 📞 SOPORTE

- **Documentación Supabase:** https://supabase.com/docs
- **Stripe Docs:** https://stripe.com/docs
- **Issues proyecto:** GitHub Issues (cuando lo crees)
- **Estado actual:** Frontend 100% funcional, backend pendiente

---

**Última actualización:** 2026-05-07  
**Versión guía:** 1.0  
**Proyecto:** MassFlow — Sistema de Gestión de Masajes a Domicilio
