-- =========================================================
-- WHATSAPP INTEGRATION SCHEMA
-- =========================================================

-- 1. Tabla de conversaciones WhatsApp (mantiene estado del flujo)
CREATE TABLE IF NOT EXISTS public.conversaciones_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  numero_whatsapp TEXT NOT NULL UNIQUE,
  estado_flujo TEXT NOT NULL DEFAULT 'INICIO',
  -- Estados: INICIO, RESERVAR_PASO_1, RESERVAR_PASO_2, RESERVAR_PASO_3, RESERVAR_PASO_4, RESERVAR_PASO_5, RESERVAR_PASO_6
  paso_actual INT NOT NULL DEFAULT 0,
  datos_temporales JSONB NOT NULL DEFAULT '{}',
  -- Guarda: {tipo_servicio, fecha, hora, direccion, masajista_id, etc}
  intentos_no_entendido INT NOT NULL DEFAULT 0,
  requiere_humano BOOLEAN NOT NULL DEFAULT false,
  humano_asignado UUID REFERENCES public.profiles(id),
  ultima_interaccion TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de mensajes WhatsApp (logging completo)
CREATE TABLE IF NOT EXISTS public.mensajes_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id UUID NOT NULL REFERENCES public.conversaciones_whatsapp(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrante', 'saliente')),
  contenido TEXT NOT NULL,
  intencion_detectada TEXT,
  confianza DECIMAL(3,2),
  error_processing TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de configuración WhatsApp (respuestas configurables)
CREATE TABLE IF NOT EXISTS public.configuracion_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT NOT NULL UNIQUE,
  valor JSONB NOT NULL,
  descripcion TEXT,
  admin_id UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_conversaciones_numero ON public.conversaciones_whatsapp(numero_whatsapp);
CREATE INDEX IF NOT EXISTS idx_conversaciones_cliente ON public.conversaciones_whatsapp(cliente_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion ON public.mensajes_whatsapp(conversacion_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_fecha ON public.mensajes_whatsapp(created_at DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_conversacion_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.ultima_interaccion = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_conversaciones_updated
  BEFORE UPDATE ON public.conversaciones_whatsapp
  FOR EACH ROW EXECUTE FUNCTION update_conversacion_timestamp();

-- RLS Policies
ALTER TABLE public.conversaciones_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_whatsapp ENABLE ROW LEVEL SECURITY;

-- Admin puede ver todo
CREATE POLICY "conversaciones_admin_all"
  ON public.conversaciones_whatsapp FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "mensajes_admin_all"
  ON public.mensajes_whatsapp FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "config_admin_all"
  ON public.configuracion_whatsapp FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Service role puede hacer todo (para el backend)
-- (Las queries desde el backend usan service_role_key que bypasea RLS)

-- Insertar configuraciones iniciales
INSERT INTO public.configuracion_whatsapp (clave, valor, descripcion) VALUES
  ('mensaje_bienvenida', '"¡Hola! 👋 Bienvenido a MassFlow. ¿En qué puedo ayudarte?\n\n1️⃣ Reservar una cita\n2️⃣ Consultar precios\n3️⃣ Ver servicios\n4️⃣ Cancelar una cita\n5️⃣ Consultar disponibilidad"', 'Mensaje de bienvenida inicial'),

  ('respuesta_precios', '"💰 Nuestros precios:\n\n🌸 Masaje Relajante 60min - 55€\n💪 Masaje Descontracturante 60min - 65€\n⚡ Masaje Deportivo 60min - 70€\n🤰 Masaje Prenatal 60min - 58€\n👥 Masaje en Pareja 90min - 140€\n🌿 Drenaje Linfático 75min - 80€\n\n¿Te gustaría reservar alguno?"', 'Respuesta para CONSULTAR_PRECIOS'),

  ('respuesta_servicios', '"🌺 Nuestros servicios:\n\n🌸 Relajante: Masaje sueco enfocado en relajación\n💪 Descontracturante: Trabajo profundo de tensiones musculares\n⚡ Deportivo: Ideal pre/post entrenamiento\n🤰 Prenatal: Especial para embarazadas\n👥 Pareja: 2 masajistas simultáneos\n🌿 Drenaje: Técnica suave de drenaje linfático\n\nTodos a domicilio en Madrid. ¿Cuál te interesa?"', 'Respuesta para CONSULTAR_SERVICIOS'),

  ('zonas_cobertura', '["Centro", "Chamartín", "Salamanca", "Retiro", "Chamberí", "Moncloa", "Argüelles", "Tetuán", "Ciudad Lineal"]', 'Zonas de cobertura en Madrid'),

  ('mensaje_no_entendido', '"🤔 Disculpa, no entendí tu mensaje. Por favor selecciona una opción:\n\n1️⃣ Reservar cita\n2️⃣ Consultar precios\n3️⃣ Ver servicios\n4️⃣ Cancelar cita\n5️⃣ Hablar con un asesor"', 'Mensaje cuando no se entiende la intención'),

  ('mensaje_escalado_humano', '"Un momento, estoy conectando con un asesor que te ayudará personalmente. 🙋‍♀️"', 'Mensaje cuando se escala a humano')
ON CONFLICT (clave) DO NOTHING;
