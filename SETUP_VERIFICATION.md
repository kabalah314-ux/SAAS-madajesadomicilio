# ✅ VERIFICACIÓN DE SETUP - MassFlow

**Proyecto Supabase:** nqewibtmewemlqaxriko  
**URL:** https://nqewibtmewemlqaxriko.supabase.co  
**Fecha:** 2026-05-12

---

## 📋 CHECKLIST DE CONFIGURACIÓN

### 1. Variables de Entorno Locales ✅
**Estado:** ✅ COMPLETADO

**Archivo:** `.env.local` (existe y tiene credenciales correctas)

```env
NEXT_PUBLIC_SUPABASE_URL=https://nqewibtmewemlqaxriko.supabase.co ✅
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci... ✅
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... ✅
PERPLEXITY_API_KEY=pplx-oSbBedd... ✅
```

**⚠️ IMPORTANTE:** Vite requiere prefijo `VITE_` pero Next.js usa `NEXT_PUBLIC_`

**Acción requerida:** Verificar qué framework se está usando (Vite o Next.js)

---

### 2. Variables de Entorno en Vercel ❓
**Estado:** ❓ REQUIERE VERIFICACIÓN MANUAL

**Ir a:** https://vercel.com/kabalah314-ux/saas-madajesadomicilio/settings/environment-variables

**Variables que deben existir:**

#### Para Vite (si aplica):
```
VITE_SUPABASE_URL = https://nqewibtmewemlqaxriko.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_STRIPE_PUBLISHABLE_KEY = pk_test_... (obtener de Stripe)
```

#### Para Next.js (si aplica):
```
NEXT_PUBLIC_SUPABASE_URL = https://nqewibtmewemlqaxriko.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_test_...
```

**⚠️ Importante:** Configurar para **Production** y **Preview**

**Después de agregar variables:** Re-deploy necesario

---

### 3. Base de Datos Supabase - Migraciones ❓
**Estado:** ❓ REQUIERE VERIFICACIÓN

**Ir a:** https://nqewibtmewemlqaxriko.supabase.co/project/nqewibtmewemlqaxriko/editor

**Verificar que existan estas tablas:**

```sql
-- Ejecutar en SQL Editor:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Tablas esperadas (14):**
- [ ] `audit_log`
- [ ] `ciclos_pago`
- [ ] `clientes`
- [ ] `configuracion`
- [ ] `disponibilidad`
- [ ] `documentos`
- [ ] `masajistas`
- [ ] `notificaciones`
- [ ] `pagos_stripe`
- [ ] `profiles`
- [ ] `reservas`
- [ ] `servicios`
- [ ] `transferencias`
- [ ] `valoraciones`

**Si NO existen:** Ejecutar migraciones desde `supabase/migrations/`

---

### 4. Row Level Security (RLS) ❓
**Estado:** ❓ REQUIERE VERIFICACIÓN

**Verificar en SQL Editor:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

**Resultado esperado:** Todas las tablas deben tener `rowsecurity = true`

---

### 5. Storage Buckets ❓
**Estado:** ❓ REQUIERE VERIFICACIÓN

**Ir a:** https://nqewibtmewemlqaxriko.supabase.co/project/nqewibtmewemlqaxriko/storage/buckets

**Buckets esperados:**
- [ ] `documentos` (privado)
- [ ] `avatars` (público)

**Si NO existen:** Ejecutar migración `0004_storage.sql`

---

### 6. Usuarios de Prueba ❓
**Estado:** ❓ REQUIERE CREACIÓN

**Ir a:** https://nqewibtmewemlqaxriko.supabase.co/project/nqewibtmewemlqaxriko/auth/users

**Usuarios a crear:**

1. **Admin**
   ```
   Email: admin@massflow.app
   Password: [generar seguro, guardar en gestor]
   ```
   
2. **Masajista**
   ```
   Email: masajista1@test.com
   Password: [generar seguro]
   ```
   
3. **Cliente**
   ```
   Email: cliente1@test.com
   Password: [generar seguro]
   ```

**Después de crear usuarios, ejecutar en SQL Editor:**
```sql
-- Asignar rol admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@massflow.app';

-- Asignar rol masajista
UPDATE public.profiles 
SET role = 'masajista' 
WHERE email = 'masajista1@test.com';

-- Verificar roles
SELECT id, email, role FROM public.profiles;
```

---

### 7. Configuración Inicial (Seed Data) ❓
**Estado:** ❓ REQUIERE VERIFICACIÓN

**Verificar en SQL Editor:**
```sql
-- Verificar configuración existe
SELECT * FROM public.configuracion;

-- Verificar servicios existen
SELECT * FROM public.servicios;
```

**Si está vacío:** Ejecutar migración `0005_seed.sql`

---

### 8. Edge Functions (Opcional) ⏸️
**Estado:** ⏸️ PENDIENTE - No crítico para testing inicial

**Funciones a deployar (cuando sea necesario):**
- `create-payment-intent`
- `stripe-webhook`
- `connect-onboarding`
- `transfer-masajista`

---

## 🚀 GUÍA RÁPIDA DE EJECUCIÓN

### Si las tablas NO existen (primera vez):

1. **Inicializar Supabase CLI local:**
```bash
cd /c/Users/oscar/OneDrive/Documentos/VS\ Code/SAAS-madajesadomicilio-main
supabase login
supabase init
supabase link --project-ref nqewibtmewemlqaxriko
```

2. **Aplicar migraciones:**
```bash
# Opción A: Push directo (si las migraciones ya existen en supabase/migrations/)
supabase db push

# Opción B: Ejecutar SQL manualmente
# Ir a Supabase Dashboard → SQL Editor
# Copiar y ejecutar cada archivo .sql en orden:
# - 0001_init.sql
# - 0002_rls.sql
# - 0003_logic.sql
# - 0004_storage.sql
# - 0005_seed.sql
```

3. **Generar tipos TypeScript:**
```bash
supabase gen types typescript --linked > src/lib/database.types.ts
```

4. **Crear usuarios de prueba** (manualmente en Dashboard)

5. **Configurar variables en Vercel:**
   - Ir a proyecto en Vercel
   - Settings → Environment Variables
   - Agregar las 3 variables (VITE_* o NEXT_PUBLIC_*)
   - Re-deploy

---

## 🔍 DIAGNÓSTICO RÁPIDO

### Verificar que framework se está usando:

```bash
# Buscar vite.config o next.config
ls -la vite.config.* next.config.* 2>/dev/null
```

**Si existe `vite.config.ts`:** Usar variables `VITE_*`  
**Si existe `next.config.js`:** Usar variables `NEXT_PUBLIC_*`

---

## ⚠️ PROBLEMAS COMUNES

### 1. "Cannot find module '@/lib/database.types'"
**Solución:** Ejecutar `supabase gen types typescript --linked > src/lib/database.types.ts`

### 2. "Invalid credentials" al hacer login
**Causas posibles:**
- Usuario no existe en Supabase Auth
- Contraseña incorrecta
- Email no confirmado

**Solución:** Verificar en Dashboard → Authentication → Users

### 3. "Permission denied for table X"
**Causa:** RLS no configurado o policies incorrectas
**Solución:** Ejecutar migración `0002_rls.sql`

### 4. Variables de entorno no se aplican en Vercel
**Causa:** No se hizo re-deploy después de agregar variables
**Solución:** 
```bash
git commit --allow-empty -m "chore: trigger redeploy"
git push
```

---

## 📊 ESTADO ACTUAL

```
[✅] Variables locales configuradas
[❓] Variables en Vercel (verificar manualmente)
[❓] Tablas en Supabase (verificar manualmente)
[❓] RLS habilitado (verificar manualmente)
[❓] Storage buckets (verificar manualmente)
[❓] Usuarios de prueba (crear manualmente)
[❓] Seed data (verificar manualmente)
[⏸️] Edge Functions (pendiente, no crítico)
```

**Próximo paso:** Ejecutar verificaciones manuales en Supabase Dashboard

---

**Última actualización:** 2026-05-12  
**Documento creado por:** Claude AI
