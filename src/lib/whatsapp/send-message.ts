// Módulo para enviar mensajes a WhatsApp Cloud API
import { guardarMensaje } from './supabase-helpers';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

interface SendMessageOptions {
  numero: string;
  mensaje: string;
  conversacionId?: string;
}

/**
 * Envía un mensaje de texto a WhatsApp
 * Con reintentos automáticos y rate limiting
 */
export async function enviarMensajeWhatsApp(
  options: SendMessageOptions,
  intentos = 3
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { numero, mensaje, conversacionId } = options;

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    const error = 'Faltan credenciales de WhatsApp (PHONE_NUMBER_ID o ACCESS_TOKEN)';
    console.error(error);
    return { success: false, error };
  }

  // Formatear número (remover + y espacios)
  const numeroLimpio = numero.replace(/[^\d]/g, '');

  const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: numeroLimpio,
    type: 'text',
    text: {
      preview_url: false,
      body: mensaje,
    },
  };

  for (let intento = 1; intento <= intentos; intento++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          `WhatsApp API error: ${data.error?.message || JSON.stringify(data)}`
        );
      }

      // Guardar mensaje enviado en BD
      if (conversacionId) {
        await guardarMensaje(conversacionId, 'saliente', mensaje);
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      };
    } catch (error: any) {
      console.error(`Intento ${intento}/${intentos} falló:`, error.message);

      if (intento === intentos) {
        // Guardar error si hay conversación
        if (conversacionId) {
          await guardarMensaje(
            conversacionId,
            'saliente',
            mensaje,
            undefined,
            undefined,
            error.message
          );
        }

        return {
          success: false,
          error: error.message,
        };
      }

      // Backoff exponencial: 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, intento - 1)));
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Envía un mensaje con botones (opcional, para futuro)
 */
export async function enviarMensajeConBotones(
  numero: string,
  mensaje: string,
  botones: Array<{ id: string; title: string }>,
  conversacionId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    return { success: false, error: 'Faltan credenciales de WhatsApp' };
  }

  const numeroLimpio = numero.replace(/[^\d]/g, '');
  const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: numeroLimpio,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: mensaje,
      },
      action: {
        buttons: botones.slice(0, 3).map((btn) => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title.slice(0, 20), // Max 20 chars
          },
        })),
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${data.error?.message || JSON.stringify(data)}`);
    }

    if (conversacionId) {
      await guardarMensaje(conversacionId, 'saliente', mensaje);
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error: any) {
    console.error('Error enviando mensaje con botones:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}
