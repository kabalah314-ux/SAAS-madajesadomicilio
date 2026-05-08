// Clasificador de intenciones usando Claude Haiku
import Anthropic from '@anthropic-ai/sdk';
import type { Intencion, ConversacionWhatsApp } from '@/types/whatsapp';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ClasificacionResult {
  intencion: Intencion;
  confianza: number;
}

/**
 * Clasifica la intención del mensaje del usuario usando Claude Haiku
 */
export async function clasificarIntencion(
  mensaje: string,
  conversacion: ConversacionWhatsApp
): Promise<ClasificacionResult> {
  const prompt = construirPrompt(mensaje, conversacion);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      temperature: 0.3, // Baja para ser más determinista
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const respuesta = response.content[0].type === 'text' ? response.content[0].text.trim() : '';

    // Parsear la respuesta
    const intencion = parsearIntencion(respuesta);
    const confianza = calcularConfianza(respuesta, mensaje, conversacion);

    return { intencion, confianza };
  } catch (error: any) {
    console.error('Error clasificando intención:', error.message);
    // En caso de error, asumir que no se entendió
    return { intencion: 'NO_ENTENDIDO', confianza: 0 };
  }
}

/**
 * Construye el prompt para Claude
 */
function construirPrompt(mensaje: string, conversacion: ConversacionWhatsApp): string {
  return `Eres el clasificador de intenciones de MassFlow, un servicio de masajes a domicilio en Madrid.

Dado el mensaje del cliente y el contexto actual, clasifica la intención en UNA de estas categorías EXACTAS:
- RESERVAR_CITA
- CANCELAR_CITA
- CONSULTAR_DISPONIBILIDAD
- CONSULTAR_PRECIOS
- CONSULTAR_SERVICIOS
- CONSULTAR_ZONA
- ESTADO_RESERVA
- SALUDO
- NO_ENTENDIDO

CONTEXTO ACTUAL:
- Estado del flujo: ${conversacion.estado_flujo}
- Paso actual: ${conversacion.paso_actual}
- Datos guardados: ${JSON.stringify(conversacion.datos_temporales)}

MENSAJE DEL CLIENTE: "${mensaje}"

REGLAS IMPORTANTES:
1. Si el cliente está en medio de un flujo de reserva (RESERVAR_PASO_X), y responde con datos válidos (fecha, hora, tipo de masaje), clasifica como RESERVAR_CITA
2. Si dice "sí", "si", "confirmar", "ok" después de una pregunta de confirmación, es parte del flujo actual
3. Si dice "no", "cancelar", "salir" en medio de un flujo, clasifica como SALUDO (para reiniciar)
4. Números como "1", "2", "3" en respuesta a opciones son parte del flujo actual
5. Solo usa NO_ENTENDIDO si realmente es ambiguo o fuera de contexto

RESPONDE ÚNICAMENTE CON UNA DE LAS CATEGORÍAS, SIN EXPLICACIÓN, SIN PUNTOS, SIN COMILLAS.`;
}

/**
 * Parsea la respuesta de Claude a una intención válida
 */
function parsearIntencion(respuesta: string): Intencion {
  const respuestaLimpia = respuesta.toUpperCase().trim();

  const intencionesValidas: Intencion[] = [
    'RESERVAR_CITA',
    'CANCELAR_CITA',
    'CONSULTAR_DISPONIBILIDAD',
    'CONSULTAR_PRECIOS',
    'CONSULTAR_SERVICIOS',
    'CONSULTAR_ZONA',
    'ESTADO_RESERVA',
    'SALUDO',
    'NO_ENTENDIDO',
  ];

  for (const intencion of intencionesValidas) {
    if (respuestaLimpia.includes(intencion)) {
      return intencion;
    }
  }

  // Si no coincide con ninguna, asumir NO_ENTENDIDO
  return 'NO_ENTENDIDO';
}

/**
 * Calcula la confianza de la clasificación (heurística simple)
 */
function calcularConfianza(
  respuesta: string,
  mensaje: string,
  conversacion: ConversacionWhatsApp
): number {
  let confianza = 0.7; // Base

  // Si está en medio de un flujo, más confianza
  if (conversacion.estado_flujo !== 'INICIO') {
    confianza += 0.2;
  }

  // Si el mensaje es corto y simple, menos confianza
  if (mensaje.trim().length < 5) {
    confianza -= 0.1;
  }

  // Si la respuesta es exactamente una de las intenciones, alta confianza
  if (respuesta.trim().toUpperCase().match(/^[A-Z_]+$/)) {
    confianza = 0.9;
  }

  return Math.min(Math.max(confianza, 0), 1);
}

/**
 * Clasificación rápida con heurísticas (fallback si Claude falla)
 */
export function clasificarConHeuristica(
  mensaje: string,
  conversacion: ConversacionWhatsApp
): ClasificacionResult {
  const mensajeLower = mensaje.toLowerCase().trim();

  // Si está en medio de un flujo de reserva, asumir que sigue en ese flujo
  if (conversacion.estado_flujo.startsWith('RESERVAR_PASO')) {
    return { intencion: 'RESERVAR_CITA', confianza: 0.8 };
  }

  if (conversacion.estado_flujo.startsWith('CANCELAR_PASO')) {
    return { intencion: 'CANCELAR_CITA', confianza: 0.8 };
  }

  // Saludos
  if (
    mensajeLower.match(/^(hola|buenos|buenas|hey|hi|ola|saludos)/i) ||
    mensajeLower === 'h' ||
    mensajeLower === 'hola'
  ) {
    return { intencion: 'SALUDO', confianza: 0.9 };
  }

  // Reservar
  if (
    mensajeLower.includes('reserv') ||
    mensajeLower.includes('cita') ||
    mensajeLower.includes('agendar') ||
    mensajeLower.includes('masaje')
  ) {
    return { intencion: 'RESERVAR_CITA', confianza: 0.7 };
  }

  // Cancelar
  if (mensajeLower.includes('cancelar') || mensajeLower.includes('cancel')) {
    return { intencion: 'CANCELAR_CITA', confianza: 0.8 };
  }

  // Precios
  if (
    mensajeLower.includes('precio') ||
    mensajeLower.includes('costo') ||
    mensajeLower.includes('cuanto') ||
    mensajeLower.includes('€') ||
    mensajeLower.includes('euro')
  ) {
    return { intencion: 'CONSULTAR_PRECIOS', confianza: 0.8 };
  }

  // Servicios
  if (
    mensajeLower.includes('servicio') ||
    mensajeLower.includes('tipo') ||
    mensajeLower.includes('que tienen') ||
    mensajeLower.includes('opciones')
  ) {
    return { intencion: 'CONSULTAR_SERVICIOS', confianza: 0.7 };
  }

  // Zona
  if (
    mensajeLower.includes('zona') ||
    mensajeLower.includes('llegan') ||
    mensajeLower.includes('cubren') ||
    mensajeLower.includes('atienden')
  ) {
    return { intencion: 'CONSULTAR_ZONA', confianza: 0.7 };
  }

  // Disponibilidad
  if (
    mensajeLower.includes('disponib') ||
    mensajeLower.includes('horario') ||
    mensajeLower.includes('cuando')
  ) {
    return { intencion: 'CONSULTAR_DISPONIBILIDAD', confianza: 0.7 };
  }

  // Estado
  if (mensajeLower.includes('estado') || mensajeLower.includes('mi reserva')) {
    return { intencion: 'ESTADO_RESERVA', confianza: 0.8 };
  }

  // Default
  return { intencion: 'NO_ENTENDIDO', confianza: 0.3 };
}
