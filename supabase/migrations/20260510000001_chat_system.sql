-- =========================================================
-- CHAT AUTÓNOMO - Schema completo
-- Sistema de chat con knowledge base, leads, bookings
-- =========================================================

-- =========================================================
-- TABLA: knowledge_base
-- Un solo registro por empresa con toda la info del negocio
-- =========================================================
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  zones jsonb NOT NULL DEFAULT '[]'::jsonb,
  schedules jsonb NOT NULL DEFAULT '{}'::jsonb,
  cancellation_policy text NOT NULL DEFAULT '',
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  welcome_message text NOT NULL DEFAULT '¡Hola! Soy el asistente virtual. ¿En qué puedo ayudarte?',
  chat_tone text NOT NULL DEFAULT 'cercano y profesional',
  blacklisted_topics text[] NOT NULL DEFAULT ARRAY['política', 'religión', 'contenido sexual', 'diagnóstico médico'],
  max_messages_before_lead int NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_empresa ON public.knowledge_base(empresa_id);

-- =========================================================
-- TABLA: chat_conversations
-- Historial de conversaciones del chat
-- =========================================================
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  lead_captured boolean NOT NULL DEFAULT false,
  booking_created boolean NOT NULL DEFAULT false,
  message_count int NOT NULL DEFAULT 0,
  language text NOT NULL DEFAULT 'es',
  source text NOT NULL DEFAULT 'widget',
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_conv_empresa ON public.chat_conversations(empresa_id);
CREATE INDEX idx_chat_conv_session ON public.chat_conversations(session_id);
CREATE INDEX idx_chat_conv_created ON public.chat_conversations(created_at DESC);

-- =========================================================
-- TABLA: chat_messages
-- Mensajes individuales de cada conversación
-- =========================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  intent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_msg_conv ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_msg_created ON public.chat_messages(created_at);

-- =========================================================
-- TABLA: chat_leads
-- Leads capturados por el chat
-- =========================================================
CREATE TABLE IF NOT EXISTS public.chat_leads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  name text,
  phone text,
  email text,
  service_interest text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'lost')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_leads_empresa ON public.chat_leads(empresa_id);
CREATE INDEX idx_chat_leads_status ON public.chat_leads(status);
CREATE INDEX idx_chat_leads_created ON public.chat_leads(created_at DESC);

-- =========================================================
-- TABLA: chat_bookings
-- Reservas pendientes creadas por el chat
-- =========================================================
CREATE TABLE IF NOT EXISTS public.chat_bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.chat_leads(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  service text NOT NULL,
  preferred_date text,
  preferred_time text,
  address text,
  zone text,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_bookings_empresa ON public.chat_bookings(empresa_id);
CREATE INDEX idx_chat_bookings_status ON public.chat_bookings(status);
CREATE INDEX idx_chat_bookings_created ON public.chat_bookings(created_at DESC);

-- =========================================================
-- TABLA: chat_analytics
-- Métricas diarias agregadas
-- =========================================================
CREATE TABLE IF NOT EXISTS public.chat_analytics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_conversations int NOT NULL DEFAULT 0,
  total_messages int NOT NULL DEFAULT 0,
  leads_captured int NOT NULL DEFAULT 0,
  bookings_created int NOT NULL DEFAULT 0,
  avg_response_time_ms int,
  peak_hour int,
  UNIQUE(empresa_id, date)
);

CREATE INDEX idx_chat_analytics_empresa_date ON public.chat_analytics(empresa_id, date DESC);

-- =========================================================
-- TRIGGERS
-- =========================================================

-- Auto update updated_at
CREATE TRIGGER trg_kb_updated BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_chat_conv_updated BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_chat_leads_updated BEFORE UPDATE ON public.chat_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_chat_bookings_updated BEFORE UPDATE ON public.chat_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- SEED: Knowledge base de ejemplo para demo
-- =========================================================
INSERT INTO public.knowledge_base (
  id, services, zones, schedules, cancellation_policy, faqs, welcome_message
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '[
    {"name": "Masaje Relajante 60 min", "duration": 60, "price": 55, "description": "Masaje sueco enfocado en relajación total del cuerpo"},
    {"name": "Masaje Descontracturante 60 min", "duration": 60, "price": 65, "description": "Trabajo profundo para aliviar tensiones musculares"},
    {"name": "Masaje Deportivo 60 min", "duration": 60, "price": 70, "description": "Ideal para pre y post entreno"},
    {"name": "Masaje en Pareja 90 min", "duration": 90, "price": 140, "description": "Dos masajistas simultáneos para una experiencia compartida"},
    {"name": "Drenaje Linfático 75 min", "duration": 75, "price": 80, "description": "Técnica suave de drenaje para reducir retención de líquidos"}
  ]'::jsonb,
  '[
    {"name": "Madrid Centro", "surcharge": 0},
    {"name": "Chamberí", "surcharge": 0},
    {"name": "Salamanca", "surcharge": 0},
    {"name": "Retiro", "surcharge": 0},
    {"name": "Chamartín", "surcharge": 5},
    {"name": "Moncloa", "surcharge": 5},
    {"name": "Arganzuela", "surcharge": 0},
    {"name": "Tetuán", "surcharge": 5}
  ]'::jsonb,
  '{"monday": {"open": "09:00", "close": "21:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "friday": {"open": "09:00", "close": "21:00"}, "saturday": {"open": "10:00", "close": "18:00"}, "sunday": null}'::jsonb,
  'Puedes cancelar o modificar tu reserva sin coste hasta 24 horas antes de la cita. Cancelaciones con menos de 24h de antelación tienen un cargo del 50% del servicio. No-shows se cobran al 100%.',
  '[
    {"question": "¿Necesito algo especial para el masaje a domicilio?", "answer": "Solo necesitas una cama o camilla y toallas. Nuestros masajistas llevan todo lo necesario: aceites, música relajante y camilla portátil si la necesitas."},
    {"question": "¿Cuánto dura la sesión completa?", "answer": "La duración indicada es de masaje efectivo. Añade unos 10-15 minutos para preparación y recogida."},
    {"question": "¿Puedo elegir masajista?", "answer": "Sí, puedes solicitar un masajista específico si tiene disponibilidad. También puedes indicar preferencia de género."},
    {"question": "¿Qué métodos de pago aceptáis?", "answer": "Aceptamos tarjeta de crédito/débito, Bizum y efectivo. El pago se realiza tras el servicio."},
    {"question": "¿Ofrecéis bonos o descuentos?", "answer": "Sí, tenemos bonos de 5 y 10 sesiones con descuentos del 10% y 15% respectivamente. Pregúntanos para más detalles."}
  ]'::jsonb,
  '¡Hola! 👋 Soy el asistente de MassFlow. Estoy aquí para ayudarte con información sobre nuestros masajes a domicilio, precios, disponibilidad o para reservar una cita. ¿En qué puedo ayudarte?'
) ON CONFLICT DO NOTHING;
