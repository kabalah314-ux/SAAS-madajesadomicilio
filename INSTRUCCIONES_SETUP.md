# 🎯 INSTRUCCIONES DE SETUP - PASO A PASO

**Proyecto:** MassFlow  
**Supabase Project:** nqewibtmewemlqaxriko  
**Fecha:** 2026-05-12  
**Tiempo estimado:** 30-60 minutos

---

## 📋 RESUMEN EJECUTIVO

**Estado actual:**
- ✅ Proyecto Supabase existe
- ✅ Credenciales configuradas localmente (.env.local)
- ✅ Migraciones SQL creadas (8 archivos)
- ✅ Framework: Next.js
- ❓ Migraciones aplicadas (verificar)
- ❓ Variables en Vercel (verificar)
- ❓ Usuarios de prueba (crear)

**Objetivo:** Configurar completamente Supabase + Vercel para habilitar testing de la aplicación.

---

## 🚀 PASO 1: VERIFICAR ESTADO DE SUPABASE (15 min)

### 1.1 Abrir Supabase Dashboard

URL: https://nqewibtmewemlqaxriko.supabase.co

### 1.2 Ir a SQL Editor

Ruta: **Project → SQL Editor**

URL directa: https://nqewibtmewemlqaxriko.supabase.co/project/nqewibtmewemlqaxriko/sql

### 1.3 Ejecutar Script de Verificación

1. Click en **"+ New query"**
2. Copiar TODO el contenido de: `verify_supabase_setup.sql`
3. Pegar en el editor
4. Click **"Run"** (o Ctrl+Enter)
5. Revisar resultados

### 1.4 Interpretar Resultados

**Si ves:**
- ✅ "SETUP COMPLETO - LISTO PARA TESTING" → Pasar a Paso 2
- ⚠️ "SETUP INCOMPLETO" → Seguir con 1.5

### 1.5 Aplicar Migraciones (si es necesario)

**Si falta alguna tabla, ejecutar manualmente cada migración:**

**ORDEN OBLIGATORIO:**

1. **20260507000000_init.sql** (Tablas base + enums)
   - Abrir archivo en VS Code
   - Copiar TODO el contenido
   - Pegar en SQL Editor de Supabase
   - Run

2. **20260507000001_rls.sql** (Row Level Security)
   - Repetir proceso

3. **20260507000002_logic.sql** (Triggers y funciones)
   - Repetir proceso

4. **20260507000003_storage.sql** (Buckets de Storage)
   - Repetir proceso

5. **20260507000004_seed.sql** (Datos iniciales)
   - Repetir proceso

6. **0006_whatsapp_schema.sql** (Tablas WhatsApp)
   - Repetir proceso

7. **0008_multi_tenancy_schema.sql** (Multi-tenant)
   - Repetir proceso

8. **20260510000001_chat_system.sql** (Sistema de chat)
   - Repetir proceso

**⚠️ IMPORTANTE:** Si una migración falla:
- Leer el error
- Verificar si la tabla ya existe (puede ser que ya esté aplicada)
- Si es "relation already exists", continuar con la siguiente
- Si es otro error, anotar y consultar

---

## 👥 PASO 2: CREAR USUARIOS DE PRUEBA (10 min)

### 2.1 Ir a Authentication

Ruta: **Project → Authentication → Users**

URL directa: https://nqewibtmewemlqaxriko.supabase.co/project/nqewibtmewemlqaxriko/auth/users

### 2.2 Crear Usuario Admin

1. Click **"Add user"** → **"Create new user"**
2. Email: `admin@massflow.app`
3. Password: **Generar una segura** (ej: `AdminMass2026!`)
4. ✅ Auto Confirm User: **ACTIVAR**
5. Click **"Create user"**
6. **GUARDAR CONTRASEÑA** en tu gestor (1Password, LastPass, etc.)

### 2.3 Crear Usuario Masajista

1. Click **"Add user"**
2. Email: `masajista1@test.com`
3. Password: **Generar** (ej: `Masajista2026!`)
4. ✅ Auto Confirm User: **ACTIVAR**
5. Click **"Create user"**
6. **GUARDAR CONTRASEÑA**

### 2.4 Crear Usuario Cliente

1. Click **"Add user"**
2. Email: `cliente1@test.com`
3. Password: **Generar** (ej: `Cliente2026!`)
4. ✅ Auto Confirm User: **ACTIVAR**
5. Click **"Create user"**
6. **GUARDAR CONTRASEÑA**

### 2.5 Asignar Roles

Volver a **SQL Editor** y ejecutar:

```sql
-- Asignar rol admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@massflow.app';

-- Asignar rol masajista
UPDATE public.profiles 
SET role = 'masajista' 
WHERE email = 'masajista1@test.com';

-- Cliente ya tiene rol por defecto, pero verificar:
UPDATE public.profiles 
SET role = 'cliente' 
WHERE email = 'cliente1@test.com';

-- VERIFICAR:
SELECT email, role, full_name, is_active 
FROM public.profiles 
ORDER BY role;
```

**Resultado esperado:**
```
admin@massflow.app     | admin     | ...
masajista1@test.com    | masajista | ...
cliente1@test.com      | cliente   | ...
```

---

## 🔐 PASO 3: CONFIGURAR VARIABLES EN VERCEL (10 min)

### 3.1 Abrir Proyecto en Vercel

URL: https://vercel.com/kabalah314-ux/saas-madajesadomicilio

### 3.2 Ir a Environment Variables

Ruta: **Settings → Environment Variables**

URL: https://vercel.com/kabalah314-ux/saas-madajesadomicilio/settings/environment-variables

### 3.3 Agregar Variables (si no existen)

**Variable 1:**
```
Name:  NEXT_PUBLIC_SUPABASE_URL
Value: https://nqewibtmewemlqaxriko.supabase.co
Environment: ✅ Production ✅ Preview ✅ Development
```

**Variable 2:**
```
Name:  NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZXdpYnRtZXdlbWxxYXhyaWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNjA4OTMsImV4cCI6MjA5MzczNjg5M30.rRqNZ3UuMxYYXCJz0Tpp81z2vTRAlpsPdQYSpJy-KYA
Environment: ✅ Production ✅ Preview ✅ Development
```

**Variable 3 (opcional por ahora):**
```
Name:  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
Value: pk_test_... (obtener de Stripe cuando lo configures)
Environment: ✅ Production ✅ Preview ✅ Development
```

**⚠️ CRÍTICO:** Marcar las 3 opciones (Production, Preview, Development)

### 3.4 Re-deploy Proyecto

**Opción A - Desde GitHub (Recomendado):**
```bash
cd /c/Users/oscar/OneDrive/Documentos/VS\ Code/SAAS-madajesadomicilio-main
git commit --allow-empty -m "chore: trigger redeploy after adding Supabase env vars"
git push origin feature/whatsapp-integration
```

**Opción B - Desde Vercel Dashboard:**
- Deployments → Click en "..." del último deployment → **Redeploy**

### 3.5 Esperar Deploy

- Ver progreso en: https://vercel.com/kabalah314-ux/saas-madajesadomicilio/deployments
- Estado debe cambiar a: **Ready** ✅
- Tiempo aprox: 2-3 minutos

---

## 🧪 PASO 4: VERIFICAR TODO FUNCIONA (10 min)

### 4.1 Abrir Aplicación

**URL Production:** https://saas-madajesadomicilio.vercel.app

**URL Preview:** https://saas-madajesadomicilio-[deployment-id].vercel.app

### 4.2 Abrir DevTools

- Presionar **F12**
- Ir a tab **Console**
- Ir a tab **Network**

### 4.3 Test Login como Cliente

1. Email: `cliente1@test.com`
2. Password: (la que guardaste)
3. Click **"Iniciar sesión"**

**✅ Resultado esperado:**
- Redirección a dashboard de cliente
- Console SIN errores rojos
- Network tab muestra request a Supabase exitoso (200)

**❌ Si falla:**
- Error "Invalid credentials" → Verificar contraseña correcta
- Error de red → Verificar variables de entorno en Vercel
- Error 401 → Verificar anon key correcta

### 4.4 Test Login como Admin

1. Logout (si estás logueado)
2. Email: `admin@massflow.app`
3. Password: (la que guardaste)
4. Click **"Iniciar sesión"**

**✅ Resultado esperado:**
- Redirección a `/admin/dashboard` o `/admin/chat`
- Sidebar con opciones de admin visible

### 4.5 Test Chat Conversacional (Cliente)

1. Login como cliente
2. Buscar botón "💬 Hablar con Lía" o icono de chat
3. Escribir: "Hola, quiero un masaje"
4. Verificar que bot responde

**✅ Resultado esperado:**
- Chat abre
- Bot responde en menos de 3 segundos
- Mensaje guardado en tabla `conversaciones_whatsapp` o `mensajes`

---

## 📊 PASO 5: EJECUTAR TESTS AUTOMATIZADOS (15 min)

Una vez verificado manualmente, ejecutar la suite de tests:

```bash
cd /c/Users/oscar/OneDrive/Documentos/VS\ Code/SAAS-madajesadomicilio-main

# Actualizar documento de testing con credenciales
# (editar MANUAL_TESTING_GUIDE.md con las contraseñas)

# Ejecutar tests uno por uno siguiendo MANUAL_TESTING_GUIDE.md
```

**Tests prioritarios:**
1. Test 1.2 - Login Admin ✅
2. Test 1.3 - Login Roles ✅
3. Test 2.1 - Chat conversacional ⭐
4. Test 4.1 - Dashboard Admin
5. Test 6.1 - Nueva reserva

---

## ⚠️ TROUBLESHOOTING

### Problema: "Cannot find module '@/lib/database.types'"

**Solución:**
```bash
# Si tienes Supabase CLI:
supabase gen types typescript --linked > src/lib/database.types.ts

# Si NO tienes CLI:
# → Copiar manualmente los tipos desde Supabase Dashboard → API Docs → TypeScript
```

### Problema: Variables de entorno no se aplican

**Verificar:**
1. Variables tienen prefijo `NEXT_PUBLIC_` (NO `VITE_`)
2. Están marcadas para Production + Preview
3. Se hizo re-deploy DESPUÉS de agregarlas

### Problema: RLS bloquea queries

**Verificar:**
```sql
-- Ver policies activas:
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Si falta alguna policy:** Ejecutar `20260507000001_rls.sql` nuevamente

### Problema: Storage buckets no existen

**Solución manual:**
1. Dashboard → Storage → New bucket
2. Crear `documentos` (Public: NO)
3. Crear `avatars` (Public: YES)
4. Configurar policies desde SQL Editor (archivo `20260507000003_storage.sql`)

---

## ✅ CHECKLIST FINAL

**Antes de considerar el setup completo:**

```
[  ] Migraciones aplicadas (verificar con verify_supabase_setup.sql)
[  ] 14+ tablas existen en public schema
[  ] RLS habilitado en todas las tablas
[  ] 2 buckets de storage creados
[  ] 3 usuarios de prueba creados (admin, masajista, cliente)
[  ] Roles asignados correctamente
[  ] 5+ servicios en tabla servicios
[  ] 1+ empresa en tabla empresas
[  ] Variables de entorno en Vercel configuradas
[  ] Re-deploy ejecutado después de agregar variables
[  ] Login funciona (probado manualmente)
[  ] Chat responde (probado manualmente)
[  ] Console sin errores críticos
```

**Cuando TODO esté marcado:** ✅ Setup completo, proceder con testing exhaustivo

---

## 📞 SOPORTE

**Documentos de referencia:**
- [CLAUDE.md](CLAUDE.md) - Guía completa de migración
- [MANUAL_TESTING_GUIDE.md](MANUAL_TESTING_GUIDE.md) - Tests manuales
- [SETUP_VERIFICATION.md](SETUP_VERIFICATION.md) - Verificaciones técnicas

**URLs importantes:**
- Supabase Dashboard: https://nqewibtmewemlqaxriko.supabase.co
- Vercel Dashboard: https://vercel.com/kabalah314-ux/saas-madajesadomicilio
- Aplicación: https://saas-madajesadomicilio.vercel.app

---

**Última actualización:** 2026-05-12  
**Tiempo total estimado:** 30-60 minutos  
**Próximo paso:** Ejecutar Paso 1
