// API Route para enviar mensajes de WhatsApp (uso interno/admin)
import { NextRequest, NextResponse } from 'next/server';
import { enviarMensajeWhatsApp } from '@/lib/whatsapp/send-message';
import type { EnviarMensajeRequest } from '@/types/whatsapp';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'massflow_internal_2026';

/**
 * POST /api/whatsapp/send
 * Envía un mensaje de WhatsApp (requiere autenticación)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${INTERNAL_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: EnviarMensajeRequest = await request.json();

    // Validar campos
    if (!body.numero || !body.mensaje) {
      return NextResponse.json(
        { error: 'Campos requeridos: numero, mensaje' },
        { status: 400 }
      );
    }

    // Enviar mensaje
    const resultado = await enviarMensajeWhatsApp({
      numero: body.numero,
      mensaje: body.mensaje,
      conversacionId: body.conversacion_id,
    });

    if (!resultado.success) {
      return NextResponse.json({ error: resultado.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: resultado.messageId,
    });
  } catch (error: any) {
    console.error('Error en /api/whatsapp/send:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
