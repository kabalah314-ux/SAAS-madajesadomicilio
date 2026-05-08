-- =========================================================
-- MULTI-TENANCY SCHEMA
-- Para servir a múltiples clientes (8-100+) desde
-- 1 Supabase, 1 Vercel, 1 Base de datos
-- =========================================================

-- 1. Tabla EMPRESAS (los clientes del SaaS)
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  telefono TEXT,

  -- Configuración
  plan TEXT NOT NULL DEFAULT 'starter',
  proveedor_ia TEXT NOT NULL DEFAULT 'openai',
  api_key_ia TEXT NOT NULL,  -- ENCRYPTED en Supabase

  -- WhatsApp
  whatsapp_phone_number_id TEXT,
  whatsapp_access_token TEXT,

  -- Estado
  es_activo BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla USERS (usuarios de TODOS los clientes)
-- Nota: Referencia auth.users, pero añade empresa_id
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'user',
  es_activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Un email único POR EMPRESA (pero puede repetirse entre empresas)
  UNIQUE(empresa_id, email)
);

-- 3. Tabla PROFILES (extender usuarios)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  avatar_url TEXT,
  telefono TEXT,
  ciudad TEXT,
  direccion TEXT,
  codigo_postal TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabla MASAJISTAS (masajistas de CADA empresa)
CREATE TABLE IF NOT EXISTS public.masajistas (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  especialidades TEXT[] DEFAULT '{}',
  zonas_cobertura TEXT[] DEFAULT '{}',
  anos_experiencia INT DEFAULT 0,
  rating_promedio NUMERIC(3,2) DEFAULT 0,
  total_sesiones INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_suspended BOOLEAN DEFAULT false,
  stripe_account_id TEXT,
  iban TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabla CLIENTES (clientes de CADA empresa)
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  direccion TEXT,
  ciudad TEXT,
  codigo_postal TEXT,
  preferencias JSONB DEFAULT '{}'::jsonb,
  is_blocked BOOLEAN DEFAULT false,
  stripe_customer_id TEXT,
  total_reservas INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabla SERVICIOS (servicios de CADA empresa)
CREATE TABLE IF NOT EXISTS public.servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  duracion_min INT NOT NULL DEFAULT 60,
  precio_eur NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Cada empresa puede tener su propio "Masaje Relajante"
  UNIQUE(empresa_id, nombre)
);

-- 7. Tabla DISPONIBILIDAD (disponibilidad de masajistas)
CREATE TABLE IF NOT EXISTS public.disponibilidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  masajista_id UUID NOT NULL REFERENCES public.masajistas(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  disponible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(empresa_id, masajista_id, fecha, hora_inicio)
);

-- 8. Tabla RESERVAS (reservas de CADA empresa)
CREATE TABLE IF NOT EXISTS public.reservas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  masajista_id UUID REFERENCES public.masajistas(id) ON DELETE SET NULL,
  servicio_id UUID NOT NULL REFERENCES public.servicios(id) ON DELETE RESTRICT,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  duracion_min INT NOT NULL,
  direccion_servicio TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  codigo_postal TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  precio_total NUMERIC(10,2) NOT NULL,
  comision_pct NUMERIC(5,2) DEFAULT 25,
  comision_monto NUMERIC(10,2),
  pago_masajista NUMERIC(10,2),
  stripe_payment_intent_id TEXT,
  notas_cliente TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Tabla CONVERSACIONES_WHATSAPP
CREATE TABLE IF NOT EXISTS public.conversaciones_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  numero_whatsapp TEXT NOT NULL,
  estado_flujo TEXT NOT NULL DEFAULT 'INICIO',
  paso_actual INT DEFAULT 0,
  datos_temporales JSONB DEFAULT '{}'::jsonb,
  intentos_no_entendido INT DEFAULT 0,
  requiere_humano BOOLEAN DEFAULT false,
  ultima_interaccion TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Por empresa
  UNIQUE(empresa_id, numero_whatsapp)
);

-- 10. Tabla MENSAJES_WHATSAPP (historial)
CREATE TABLE IF NOT EXISTS public.mensajes_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  conversacion_id UUID NOT NULL REFERENCES public.conversaciones_whatsapp(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrante', 'saliente')),
  contenido TEXT NOT NULL,
  intencion_detectada TEXT,
  confianza DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Tabla USO_IA_REGISTRO (para facturación)
CREATE TABLE IF NOT EXISTS public.uso_ia_registro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  proveedor TEXT NOT NULL,
  tokens_aproximados INT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- ===== ÍNDICES =====
CREATE INDEX IF NOT EXISTS idx_users_empresa ON public.users(empresa_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_empresa ON public.profiles(empresa_id);
CREATE INDEX IF NOT EXISTS idx_masajistas_empresa ON public.masajistas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON public.clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_servicios_empresa ON public.servicios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_empresa ON public.disponibilidad(empresa_id);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_masajista ON public.disponibilidad(masajista_id);
CREATE INDEX IF NOT EXISTS idx_reservas_empresa ON public.reservas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_reservas_cliente ON public.reservas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_reservas_masajista ON public.reservas(masajista_id);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha ON public.reservas(fecha);
CREATE INDEX IF NOT EXISTS idx_conversaciones_empresa ON public.conversaciones_whatsapp(empresa_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_empresa ON public.mensajes_whatsapp(empresa_id);
CREATE INDEX IF NOT EXISTS idx_uso_ia_empresa ON public.uso_ia_registro(empresa_id);

-- ===== RLS POLICIES =====

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masajistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversaciones_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uso_ia_registro ENABLE ROW LEVEL SECURITY;

-- Función helper: obtener empresa_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS UUID AS $$
  SELECT empresa_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;

-- USERS: Ver usuarios de tu empresa
CREATE POLICY "users_own_empresa"
  ON public.users FOR ALL
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());

-- PROFILES: Ver perfiles de tu empresa
CREATE POLICY "profiles_own_empresa"
  ON public.profiles FOR ALL
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());

-- MASAJISTAS: Ver masajistas de tu empresa
CREATE POLICY "masajistas_own_empresa"
  ON public.masajistas FOR ALL
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());

-- CLIENTES: Ver clientes de tu empresa
CREATE POLICY "clientes_own_empresa"
  ON public.clientes FOR ALL
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());

-- SERVICIOS: Ver servicios de tu empresa
CREATE POLICY "servicios_own_empresa"
  ON public.servicios FOR SELECT
  USING (empresa_id = public.get_user_empresa_id());

CREATE POLICY "servicios_own_empresa_write"
  ON public.servicios FOR INSERT
  WITH CHECK (empresa_id = public.get_user_empresa_id());

-- DISPONIBILIDAD: Ver disponibilidad de tu empresa
CREATE POLICY "disponibilidad_own_empresa"
  ON public.disponibilidad FOR ALL
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());

-- RESERVAS: Ver reservas de tu empresa
CREATE POLICY "reservas_own_empresa"
  ON public.reservas FOR ALL
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());

-- CONVERSACIONES_WHATSAPP: Ver conversaciones de tu empresa
CREATE POLICY "conversaciones_own_empresa"
  ON public.conversaciones_whatsapp FOR ALL
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());

-- MENSAJES_WHATSAPP: Ver mensajes de tu empresa
CREATE POLICY "mensajes_own_empresa"
  ON public.mensajes_whatsapp FOR ALL
  USING (empresa_id = public.get_user_empresa_id())
  WITH CHECK (empresa_id = public.get_user_empresa_id());

-- USO_IA_REGISTRO: Ver uso de tu empresa
CREATE POLICY "uso_ia_own_empresa"
  ON public.uso_ia_registro FOR SELECT
  USING (empresa_id = public.get_user_empresa_id());

-- ===== TRIGGERS =====

-- Trigger: Actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_empresas_updated
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER trg_masajistas_updated
  BEFORE UPDATE ON public.masajistas
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER trg_clientes_updated
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER trg_servicios_updated
  BEFORE UPDATE ON public.servicios
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER trg_reservas_updated
  BEFORE UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER trg_conversaciones_updated
  BEFORE UPDATE ON public.conversaciones_whatsapp
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
