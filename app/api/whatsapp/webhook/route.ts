// Webhook para recibir mensajes de WhatsApp Cloud API
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import type { WhatsAppWebhookPayload } from '@/types/whatsapp';
import { getOrCreateConversacion, guardarMensaje } from '@/lib/whatsapp/supabase-helpers';
import { clasificarIntencion, clasificarConHeuristica } from '@/lib/whatsapp/clasificador';
import { procesarFlujo } from '@/lib/whatsapp/flujos';

const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'massflow_verify_token_2026';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

/**
 * GET - Handshake de verificación con Meta
 * Meta llama a este endpoint para verificar el webhook
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  console.log('Webhook verification request:', { mode, token });

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('✓ Webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  console.error('✗ Webhook verification failed');
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * POST - Recibe mensajes de WhatsApp
 * Meta envía los mensajes de los usuarios aquí
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Validar firma (seguridad)
    if (!validarFirma(body, signature)) {
      console.error('✗ Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload: WhatsAppWebhookPayload = JSON.parse(body);

    // Responder 200 OK INMEDIATAMENTE (requerido por Meta)
    const response = NextResponse.json({ success: true }, { status: 200 });

    // Procesar mensaje de forma asíncrona (non-blocking)
    procesarMensajeAsync(payload).catch((error) => {
      console.error('Error procesando mensaje:', error);
    });

    return response;
  } catch (error: any) {
    console.error('Error en webhook POST:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * Valida la firma de Meta para verificar autenticidad
 */
function validarFirma(body: string, signature: string | null): boolean {
  if (!signature || !WHATSAPP_ACCESS_TOKEN) {
    return false;
  }

  const expectedSignature =
    'sha256=' +
    crypto.createHmac('sha256', WHATSAPP_ACCESS_TOKEN).update(body).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

/**
 * Procesa el mensaje de forma asíncrona
 */
async function procesarMensajeAsync(payload: WhatsAppWebhookPayload): Promise<void> {
  try {
    // Extraer información del webhook
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages || value.messages.length === 0) {
      console.log('No hay mensajes en el webhook (probablemente un status update)');
      return;
    }

    const mensaje = value.messages[0];
    const numeroWhatsapp = mensaje.from;
    const textoMensaje = mensaje.text?.body || '';

    console.log(`📨 Mensaje recibido de ${numeroWhatsapp}: "${textoMensaje}"`);

    // Ignorar mensajes vacíos
    if (!textoMensaje.trim()) {
      console.log('Mensaje vacío, ignorando');
      return;
    }

    // 1. Obtener o crear conversación
    const conversacion = await getOrCreateConversacion(numeroWhatsapp);

    // 2. Guardar mensaje entrante
    await guardarMensaje(conversacion.id, 'entrante', textoMensaje);

    // 3. Clasificar intención con Claude Haiku
    let intencion, confianza;
    try {
      const clasificacion = await clasificarIntencion(textoMensaje, conversacion);
      intencion = clasificacion.intencion;
      confianza = clasificacion.confianza;
      console.log(`🧠 Intención detectada: ${intencion} (confianza: ${confianza})`);
    } catch (error) {
      console.error('Error clasificando con Claude, usando heurística:', error);
      const clasificacion = clasificarConHeuristica(textoMensaje, conversacion);
      intencion = clasificacion.intencion;
      confianza = clasificacion.confianza;
    }

    // 4. Actualizar mensaje con intención detectada
    await guardarMensaje(conversacion.id, 'entrante', textoMensaje, intencion, confianza);

    // 5. Procesar flujo según intención
    await procesarFlujo(conversacion, textoMensaje, intencion);

    console.log('✓ Mensaje procesado correctamente');
  } catch (error: any) {
    console.error('❌ Error procesando mensaje:', error.message);
    throw error;
  }
}
