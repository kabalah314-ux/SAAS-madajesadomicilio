-- ============================================
-- SCRIPT DE VERIFICACIÓN DE SETUP SUPABASE
-- ============================================
-- Ejecutar en: https://nqewibtmewemlqaxriko.supabase.co/project/nqewibtmewemlqaxriko/sql
-- Fecha: 2026-05-12

-- ============================================
-- 1. VERIFICAR TABLAS EXISTEN
-- ============================================
SELECT
  '1. VERIFICACIÓN DE TABLAS' as seccion,
  table_name,
  CASE
    WHEN table_name IN (
      'profiles', 'masajistas', 'clientes', 'servicios', 'disponibilidad',
      'reservas', 'valoraciones', 'documentos', 'ciclos_pago', 'transferencias',
      'notificaciones', 'configuracion', 'pagos_stripe', 'audit_log',
      'empresas', 'conversaciones_whatsapp', 'mensajes', 'leads'
    ) THEN '✅ OK'
    ELSE '⚠️ Tabla extra'
  END as estado
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================
-- 2. VERIFICAR ROW LEVEL SECURITY HABILITADO
-- ============================================
SELECT
  '2. VERIFICACIÓN RLS' as seccion,
  tablename as tabla,
  CASE
    WHEN rowsecurity = true THEN '✅ RLS Habilitado'
    ELSE '❌ RLS DESHABILITADO (CRÍTICO)'
  END as estado
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- 3. VERIFICAR CONFIGURACIÓN INICIAL EXISTE
-- ============================================
SELECT
  '3. CONFIGURACIÓN GLOBAL' as seccion,
  clave,
  valor,
  CASE
    WHEN clave IS NOT NULL THEN '✅ Configurado'
    ELSE '❌ Falta'
  END as estado
FROM public.configuracion
ORDER BY clave;

-- ============================================
-- 4. VERIFICAR SERVICIOS SEED
-- ============================================
SELECT
  '4. SERVICIOS INICIALES' as seccion,
  COUNT(*) as total_servicios,
  CASE
    WHEN COUNT(*) >= 3 THEN '✅ Servicios configurados'
    WHEN COUNT(*) > 0 THEN '⚠️ Pocos servicios'
    ELSE '❌ Sin servicios (ejecutar seed)'
  END as estado
FROM public.servicios;

-- Detalle de servicios
SELECT
  id,
  nombre,
  duracion_min,
  precio_eur,
  is_active
FROM public.servicios
ORDER BY orden;

-- ============================================
-- 5. VERIFICAR USUARIOS EXISTEN
-- ============================================
SELECT
  '5. USUARIOS DE PRUEBA' as seccion,
  COUNT(*) as total_usuarios,
  CASE
    WHEN COUNT(*) >= 3 THEN '✅ Usuarios creados'
    WHEN COUNT(*) > 0 THEN '⚠️ Faltan usuarios'
    ELSE '❌ Sin usuarios (crear en Auth)'
  END as estado
FROM public.profiles;

-- Detalle de usuarios
SELECT
  email,
  role,
  full_name,
  is_active,
  created_at
FROM public.profiles
ORDER BY role, created_at;

-- ============================================
-- 6. VERIFICAR STORAGE BUCKETS
-- ============================================
SELECT
  '6. STORAGE BUCKETS' as seccion,
  name as bucket_name,
  public as es_publico,
  CASE
    WHEN name = 'documentos' AND public = false THEN '✅ Correcto (privado)'
    WHEN name = 'avatars' AND public = true THEN '✅ Correcto (público)'
    ELSE '⚠️ Verificar configuración'
  END as estado
FROM storage.buckets
ORDER BY name;

-- ============================================
-- 7. VERIFICAR EMPRESAS (MULTI-TENANT)
-- ============================================
SELECT
  '7. EMPRESAS (MULTI-TENANT)' as seccion,
  COUNT(*) as total_empresas,
  CASE
    WHEN COUNT(*) >= 1 THEN '✅ Al menos 1 empresa'
    ELSE '❌ Sin empresas (crear default)'
  END as estado
FROM public.empresas;

-- Detalle empresas
SELECT
  nombre,
  ai_provider,
  is_active,
  created_at
FROM public.empresas
ORDER BY created_at;

-- ============================================
-- 8. VERIFICAR ENUMS EXISTEN
-- ============================================
SELECT
  '8. TIPOS ENUM' as seccion,
  typname as enum_name,
  '✅ Existe' as estado
FROM pg_type
WHERE typcategory = 'E'
  AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY typname;

-- ============================================
-- 9. VERIFICAR FUNCIONES/TRIGGERS
-- ============================================
SELECT
  '9. FUNCIONES PERSONALIZADAS' as seccion,
  routine_name as funcion,
  '✅ Existe' as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND routine_name LIKE '%handle%' OR routine_name LIKE '%clasificar%'
ORDER BY routine_name;

-- ============================================
-- 10. VERIFICAR VISTAS
-- ============================================
SELECT
  '10. VISTAS' as seccion,
  table_name as vista,
  '✅ Existe' as estado
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- RESUMEN FINAL
-- ============================================
SELECT
  '=== RESUMEN FINAL ===' as titulo,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tablas,
  (SELECT COUNT(*) FROM public.profiles) as total_usuarios,
  (SELECT COUNT(*) FROM public.servicios) as total_servicios,
  (SELECT COUNT(*) FROM public.empresas) as total_empresas,
  (SELECT COUNT(*) FROM storage.buckets) as total_buckets,
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') >= 14
      AND (SELECT COUNT(*) FROM public.servicios) >= 3
      AND (SELECT COUNT(*) FROM storage.buckets) >= 2
      THEN '✅ SETUP COMPLETO - LISTO PARA TESTING'
    ELSE '⚠️ SETUP INCOMPLETO - REVISAR SECCIONES ANTERIORES'
  END as estado_general;

-- ============================================
-- ACCIONES REQUERIDAS (si hay errores)
-- ============================================

/*
SI FALTAN TABLAS:
  → Ejecutar migraciones en orden desde supabase/migrations/

SI RLS DESHABILITADO:
  → Ejecutar: ALTER TABLE nombre_tabla ENABLE ROW LEVEL SECURITY;

SI FALTAN USUARIOS:
  → Dashboard → Authentication → Add user
  → Luego: UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@massflow.app';

SI FALTAN BUCKETS:
  → Dashboard → Storage → New bucket
  → Crear: 'documentos' (privado) y 'avatars' (público)

SI FALTAN SERVICIOS:
  → Ejecutar: supabase/migrations/20260507000004_seed.sql

SI FALTA EMPRESA:
  → Ejecutar:
    INSERT INTO public.empresas (nombre, ai_provider, is_active)
    VALUES ('MassFlow Demo', 'perplexity', true);
*/
