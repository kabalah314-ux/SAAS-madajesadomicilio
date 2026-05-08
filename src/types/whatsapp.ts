// Tipos para WhatsApp Integration

export type EstadoFlujo =
  | 'INICIO'
  | 'RESERVAR_PASO_1' // Pregunta tipo servicio
  | 'RESERVAR_PASO_2' // Pregunta fecha
  | 'RESERVAR_PASO_3' // Pregunta hora
  | 'RESERVAR_PASO_4' // Pregunta dirección
  | 'RESERVAR_PASO_5' // Pregunta confirmación
  | 'CANCELAR_PASO_1' // Lista citas a cancelar
  | 'CANCELAR_PASO_2' // Confirma cancelación
  | 'COMPLETADO';

export type Intencion =
  | 'RESERVAR_CITA'
  | 'CANCELAR_CITA'
  | 'CONSULTAR_DISPONIBILIDAD'
  | 'CONSULTAR_PRECIOS'
  | 'CONSULTAR_SERVICIOS'
  | 'CONSULTAR_ZONA'
  | 'ESTADO_RESERVA'
  | 'SALUDO'
  | 'NO_ENTENDIDO';

export interface ConversacionWhatsApp {
  id: string;
  cliente_id: string | null;
  numero_whatsapp: string;
  estado_flujo: EstadoFlujo;
  paso_actual: number;
  datos_temporales: {
    servicio_id?: string;
    tipo_servicio?: string;
    fecha?: string;
    hora?: string;
    direccion?: string;
    ciudad?: string;
    codigo_postal?: string;
    masajista_id?: string;
    reserva_id?: string;
    precio?: number;
    [key: string]: any;
  };
  intentos_no_entendido: number;
  requiere_humano: boolean;
  humano_asignado: string | null;
  ultima_interaccion: string;
  created_at: string;
  updated_at: string;
}

export interface MensajeWhatsApp {
  id: string;
  conversacion_id: string;
  tipo: 'entrante' | 'saliente';
  contenido: string;
  intencion_detectada: Intencion | null;
  confianza: number | null;
  error_processing: string | null;
  created_at: string;
}

export interface ConfiguracionWhatsApp {
  id: string;
  clave: string;
  valor: any;
  descripcion: string | null;
  admin_id: string | null;
  updated_at: string;
  created_at: string;
}

// Webhook payload de Meta WhatsApp Cloud API
export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: { body: string };
          type: string;
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

// Respuesta del clasificador (Claude)
export interface ClasificacionResponse {
  intencion: Intencion;
  confianza: number;
  contexto?: string;
}

// Request para enviar mensaje
export interface EnviarMensajeRequest {
  numero: string;
  mensaje: string;
  conversacion_id?: string;
}
