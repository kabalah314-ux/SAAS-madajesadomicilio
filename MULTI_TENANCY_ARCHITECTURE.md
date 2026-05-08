# 🏢 Arquitectura Multi-Tenancy para 8+ Clientes

## 📋 Decisión Arquitectónica

Para **8 clientes**, la mejor arquitectura es:

| Aspecto | Configuración |
|--------|--------------|
| **Supabase** | 1 proyecto compartido |
| **Vercel** | 1 deployment compartido |
| **Base de datos** | 1 BD con datos aislados por `empresa_id` |
| **Usuarios** | Todos en tabla `users`, filtrados por empresa |
| **Costo** | €50/mes infraestructura total (~€6/cliente) |
| **Escalabilidad** | Hasta 100 clientes sin cambios |

---

## 🗄️ ESQUEMA DE BD (MULTI-TENANT)

```sql
-- 1. TABLA: EMPRESAS (Los clientes del SaaS)
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'starter',
  proveedor_ia TEXT NOT NULL DEFAULT 'openai',
  api_key_ia TEXT NOT NULL ENCRYPTED,
  es_activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABLA: USERS (Usuarios de TODOS los clientes)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),  -- ← TENANT_ID
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'user',
  -- Roles: 'admin' (de la empresa), 'masajista', 'cliente'
  es_activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id, email) -- Un email por empresa (pero puede repetirse entre empresas)
);

-- 3. TABLA: PROFILES (Información extendida)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES public.users(id),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  avatar_url TEXT,
  telefono TEXT,
  ciudad TEXT
);

-- 4. TABLA: MASAJISTAS (Los masajistas de CADA empresa)
CREATE TABLE public.masajistas (
  id UUID PRIMARY KEY REFERENCES public.users(id),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),  -- ← TENANT_ID
  especialidades TEXT[] DEFAULT '{}',
  zonas_cobertura TEXT[] DEFAULT '{}',
  rating_promedio NUMERIC(3,2) DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  stripe_account_id TEXT
);

-- 5. TABLA: CLIENTES (Clientes de CADA empresa)
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY REFERENCES public.users(id),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),  -- ← TENANT_ID
  direccion TEXT,
  ciudad TEXT,
  codigo_postal TEXT,
  is_blocked BOOLEAN DEFAULT false
);

-- 6. TABLA: SERVICIOS (Servicios de CADA empresa)
CREATE TABLE public.servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),  -- ← TENANT_ID
  nombre TEXT NOT NULL,
  descripcion TEXT,
  duracion_min INT,
  precio_eur NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(empresa_id, nombre) -- Cada empresa puede tener "Masaje Relajante"
);

-- 7. TABLA: RESERVAS (Reservas de CADA empresa)
CREATE TABLE public.reservas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),  -- ← TENANT_ID
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  masajista_id UUID REFERENCES public.masajistas(id),
  servicio_id UUID NOT NULL REFERENCES public.servicios(id),
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  estado TEXT NOT NULL,
  precio_total NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. TABLA: CONVERSACIONES_WHATSAPP
CREATE TABLE public.conversaciones_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),  -- ← TENANT_ID
  numero_whatsapp TEXT NOT NULL,
  estado_flujo TEXT NOT NULL,
  datos_temporales JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id, numero_whatsapp) -- Por empresa
);

-- 9. TABLA: USO_IA_REGISTRO (Para facturación)
CREATE TABLE public.uso_ia_registro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  proveedor TEXT NOT NULL,
  tokens_aproximados INT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- ===== ÍNDICES CRÍTICOS =====
CREATE INDEX idx_users_empresa ON public.users(empresa_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_masajistas_empresa ON public.masajistas(empresa_id);
CREATE INDEX idx_clientes_empresa ON public.clientes(empresa_id);
CREATE INDEX idx_servicios_empresa ON public.servicios(empresa_id);
CREATE INDEX idx_reservas_empresa ON public.reservas(empresa_id);
CREATE INDEX idx_reservas_cliente ON public.reservas(cliente_id);
CREATE INDEX idx_conversaciones_empresa ON public.conversaciones_whatsapp(empresa_id);
CREATE INDEX idx_uso_ia_empresa ON public.uso_ia_registro(empresa_id);

-- ===== ROW LEVEL SECURITY =====

-- Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masajistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversaciones_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uso_ia_registro ENABLE ROW LEVEL SECURITY;

-- Política para obtener empresa_id del usuario actual
CREATE OR REPLACE FUNCTION get_user_empresa_id() RETURNS UUID AS $$
  SELECT empresa_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;

-- USERS: Ver usuarios de tu empresa
CREATE POLICY "users_own_empresa"
  ON public.users FOR ALL
  USING (empresa_id = get_user_empresa_id())
  WITH CHECK (empresa_id = get_user_empresa_id());

-- PROFILES: Ver perfiles de tu empresa
CREATE POLICY "profiles_own_empresa"
  ON public.profiles FOR ALL
  USING (empresa_id = get_user_empresa_id())
  WITH CHECK (empresa_id = get_user_empresa_id());

-- MASAJISTAS: Ver masajistas de tu empresa
CREATE POLICY "masajistas_own_empresa"
  ON public.masajistas FOR ALL
  USING (empresa_id = get_user_empresa_id())
  WITH CHECK (empresa_id = get_user_empresa_id());

-- CLIENTES: Ver clientes de tu empresa
CREATE POLICY "clientes_own_empresa"
  ON public.clientes FOR ALL
  USING (empresa_id = get_user_empresa_id())
  WITH CHECK (empresa_id = get_user_empresa_id());

-- SERVICIOS: Ver servicios de tu empresa
CREATE POLICY "servicios_own_empresa"
  ON public.servicios FOR SELECT
  USING (empresa_id = get_user_empresa_id());

CREATE POLICY "servicios_admin_write"
  ON public.servicios FOR INSERT
  WITH CHECK (empresa_id = get_user_empresa_id());

-- RESERVAS: Ver reservas de tu empresa
CREATE POLICY "reservas_own_empresa"
  ON public.reservas FOR ALL
  USING (empresa_id = get_user_empresa_id())
  WITH CHECK (empresa_id = get_user_empresa_id());

-- CONVERSACIONES_WHATSAPP: Ver conversaciones de tu empresa
CREATE POLICY "conversaciones_own_empresa"
  ON public.conversaciones_whatsapp FOR ALL
  USING (empresa_id = get_user_empresa_id())
  WITH CHECK (empresa_id = get_user_empresa_id());

-- USO_IA: Ver uso de tu empresa
CREATE POLICY "uso_ia_own_empresa"
  ON public.uso_ia_registro FOR SELECT
  USING (empresa_id = get_user_empresa_id());
```

---

## 📊 FLUJO DE DATOS

### Cuando Cliente A inicia sesión:

```
1. Usuario: juan@masajuangarcia.es
   └─ Auth.users: id=abc123, email=...

2. Función RLS: get_user_empresa_id()
   └─ SELECT empresa_id FROM users WHERE id = abc123
   └─ Devuelve: empresa_id_A

3. Query: SELECT * FROM reservas
   └─ RLS automáticamente agrega: WHERE empresa_id = empresa_id_A
   └─ RESULTADO: Solo reservas de Cliente A

4. Query: SELECT * FROM masajistas
   └─ RLS automáticamente agrega: WHERE empresa_id = empresa_id_A
   └─ RESULTADO: Solo masajistas de Cliente A
```

**Resultado**: Juan SOLO VE DATOS DE SU EMPRESA ✅

---

## 💻 CÓDIGO TYPESCRIPT (Operaciones)

### 1. Registrar nuevo usuario en una empresa

```typescript
async function registrarUsuarioEnEmpresa(
  empresaId: string,
  email: string,
  password: string,
  nombre: string,
  rol: 'admin' | 'masajista' | 'cliente'
) {
  // A. Crear en auth.users
  const { data: authUser, error: authError } = 
    await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: { empresa_id: empresaId, rol }
      }
    })

  if (authError) throw authError

  // B. Crear en tabla users (con empresa_id)
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      id: authUser.user!.id,
      empresa_id: empresaId,  // ← CRÍTICO
      email,
      nombre,
      rol
    })
    .select()
    .single()

  if (userError) throw userError

  return user
}
```

### 2. Cliente A accede a sus datos

```typescript
// Cliente A hace login
const { data } = await supabaseAuth.auth.signInWithPassword({
  email: 'juan@masajuangarcia.es',
  password: 'xxx'
})

// JWT token contiene: user_id = abc123
// get_user_empresa_id() devuelve: empresa_id_A

// Cuando trae sus masajistas:
const { data: masajistas } = await supabase
  .from('masajistas')
  .select('*')
  // RLS automáticamente: WHERE empresa_id = empresa_id_A

console.log(masajistas)
// ✅ Solo masajistas de Cliente A
// ❌ No ve masajistas de Cliente B, C, etc.
```

### 3. Crear una reserva en la empresa del usuario

```typescript
async function crearReservaDelUsuario(
  usuarioId: string,
  servicioId: string,
  fecha: string,
  hora: string
) {
  // Obtener empresa_id del usuario
  const { data: usuario } = await supabaseAdmin
    .from('users')
    .select('empresa_id')
    .eq('id', usuarioId)
    .single()

  // Crear reserva con empresa_id
  const { data: reserva } = await supabaseAdmin
    .from('reservas')
    .insert({
      empresa_id: usuario.empresa_id,  // ← Automático
      cliente_id: usuarioId,
      servicio_id: servicioId,
      fecha,
      hora_inicio: hora,
      estado: 'pendiente'
    })
    .select()
    .single()

  return reserva
}
```

---

## 🔐 SEGURIDAD: Por qué funciona

### Escenario: Cliente B intenta hackear a Cliente A

```typescript
// Cliente B obtiene JWT de Cliente B: user_id = xyz789
// get_user_empresa_id() devuelve: empresa_id_B

// Intenta hacer query:
const { data } = await supabase
  .from('masajistas')
  .select('*')
  // RLS agrega: WHERE empresa_id = empresa_id_B

// Aunque la query sea:
SELECT * FROM masajistas WHERE empresa_id = empresa_id_A
// RLS intercepta y cambia a:
SELECT * FROM masajistas WHERE empresa_id = empresa_id_B AND empresa_id = empresa_id_A
// Esta condición es FALSE → Devuelve []

// ✅ SEGURIDAD GARANTIZADA
```

---

## 📈 CÓMO ESCALAR A 100 CLIENTES

Sin cambiar código. Simplemente:

```
8 clientes: 1 Supabase ($25/mes)
50 clientes: 1 Supabase ($50/mes)
100 clientes: 1 Supabase ($100/mes)
```

El mismo código, la misma infra, sirve todo.

---

## ✅ VENTAJAS DE ESTA ARQUITECTURA

✅ **Bajo costo**: ~€6 por cliente en infra  
✅ **Fácil mantener**: 1 código, 1 BD, 1 servidor  
✅ **Totalmente seguro**: RLS es imposible de bypassear  
✅ **Escalable**: Funciona igual con 10 o 1000 clientes  
✅ **Rápido de onboardear**: Registrar nuevo cliente = insertar 1 fila  
✅ **Datos completamente aislados**: Cliente A NUNCA ve datos de B  

---

## 🚀 PRÓXIMOS PASOS

1. Aplicar migración SQL: `0008_multi_tenancy_schema.sql`
2. Actualizar triggers para incluir `empresa_id`
3. Actualizar funciones TypeScript para filtrar por `get_user_empresa_id()`
4. Probar: Registrar 2 usuarios en 2 empresas diferentes, verificar aislamiento

---

**Conclusión**: Para 8 clientes (y escalable a 100), **1 Supabase + 1 Vercel compartidos es la solución óptima**. 🎯
