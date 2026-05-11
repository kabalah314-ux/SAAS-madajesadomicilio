import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from './rate-limit'
import {
  getConversationState,
  updateConversationState,
  captureData,
  getNextPhase,
  extractAllDataFromMessage,
  buildPhasePrompt,
  getQuickReplies,
} from './conversation-state'

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || ''
const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions'

const KNOWLEDGE_BASE = {
  services: [
    { name: 'Masaje Relajante 60 min', duration: 60, price: 55, description: 'Masaje sueco enfocado en relajación total' },
    { name: 'Masaje Descontracturante 60 min', duration: 60, price: 65, description: 'Trabajo profundo para aliviar tensiones' },
    { name: 'Masaje Deportivo 60 min', duration: 60, price: 70, description: 'Ideal para pre y post entreno' },
    { name: 'Masaje en Pareja 90 min', duration: 90, price: 140, description: 'Dos masajistas simultáneos' },
    { name: 'Drenaje Linfático 75 min', duration: 75, price: 80, description: 'Técnica suave para reducir retención' },
  ],
  zones: [
    { name: 'Madrid Centro', surcharge: 0 },
    { name: 'Chamberí', surcharge: 0 },
    { name: 'Salamanca', surcharge: 0 },
    { name: 'Retiro', surcharge: 0 },
    { name: 'Chamartín', surcharge: 5 },
    { name: 'Moncloa', surcharge: 5 },
  ],
}

interface ChatRequest {
  mensaje: string
  session_id?: string
}

function isPromptInjection(message: string): boolean {
  const patterns = [
    /ignora.*instrucciones/i,
    /olvida.*(?:todo|reglas|prompt)/i,
    /system.*prompt/i,
    /act(?:úa|ua)?\s+como/i,
    /dime.*(?:instrucciones|reglas)/i,
  ]
  return patterns.some(p => p.test(message))
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const rateCheck = checkRateLimit(ip)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Demasiados mensajes',
          respuesta: 'Has enviado demasiados mensajes. Por favor, espera un momento 🙏',
        },
        { status: 429 }
      )
    }

    const body: ChatRequest = await req.json()
    const { mensaje, session_id = `session_${Date.now()}_${Math.random().toString(36).slice(2)}` } = body

    if (!mensaje?.trim()) {
      return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })
    }

    // Sanitize
    const sanitizedMensaje = mensaje
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .slice(0, 1000)

    // Prompt injection detection
    if (isPromptInjection(sanitizedMensaje)) {
      return NextResponse.json({
        respuesta: '¡Hola! Estoy aquí para ayudarte con nuestros masajes a domicilio. ¿En qué puedo ayudarte? 😊',
        session_id,
        quick_replies: ['💰 Ver precios', '📍 Zonas', '📅 Reservar'],
      })
    }

    // Get conversation state
    const state = getConversationState(session_id)

    // Extract ALL possible data from message (captura fuera de orden) - SIEMPRE, incluso en CONFIRMACION
    const extracted = extractAllDataFromMessage(sanitizedMensaje)
    if (Object.keys(extracted).length > 0) {
      captureData(session_id, extracted)
    }

    // Determine next phase
    const nextPhase = getNextPhase(state, sanitizedMensaje)
    if (nextPhase !== state.phase) {
      updateConversationState(session_id, { phase: nextPhase })
    }

    // Get updated state after phase transition (incluye los nuevos datos capturados)
    const updatedState = getConversationState(session_id)

    // Build phase-specific prompt
    const phasePrompt = buildPhasePrompt(updatedState, KNOWLEDGE_BASE)

    // Call Perplexity or use fallback
    let respuesta: string

    // Usar fallback estricto para fases estructuradas
    const useFallback = ['BIENVENIDA', 'CAPTURA_DATOS', 'CONFIRMACION'].includes(updatedState.phase)

    if (PERPLEXITY_API_KEY && !useFallback) {
      try {
        const systemPrompt = `Eres Lía, asistente de MassFlow (masajes a domicilio en Madrid).

INSTRUCCIONES ESPECÍFICAS PARA ESTA FASE:
${phasePrompt}

REGLAS GLOBALES:
- Responde en 2-3 líneas máximo (salvo en CONFIRMACION)
- Usa emojis con moderación (1-2 por mensaje)
- Tono cercano, profesional, cálido
- Si el nombre del cliente es conocido: ${updatedState.capturedData.nombre || 'aún no lo sabes'}
- NUNCA pidas dos datos a la vez
- NUNCA uses la palabra "error", di "casi" o "¿lo revisamos?"
- Si te preguntan algo de la base de conocimiento, responde con datos reales

BASE DE CONOCIMIENTO:
Servicios: ${KNOWLEDGE_BASE.services.map(s => `${s.name} (${s.price}€)`).join(', ')}
Zonas: ${KNOWLEDGE_BASE.zones.map(z => z.name).join(', ')}
Horarios: Lunes a viernes 9-21h, sábados 10-18h, domingos cerrado`

        const response = await fetch(PERPLEXITY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: sanitizedMensaje },
            ],
            max_tokens: 300,
            temperature: 0.4,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          respuesta = data.choices?.[0]?.message?.content?.trim() || getFallbackResponse(updatedState)
        } else {
          respuesta = getFallbackResponse(updatedState)
        }
      } catch (error) {
        console.error('Perplexity error:', error)
        respuesta = getFallbackResponse(updatedState)
      }
    } else {
      respuesta = getFallbackResponse(updatedState)
    }

    // Get quick replies for current phase
    const quickReplies = getQuickReplies(updatedState.phase, updatedState.capturedData)

    // Check if booking is complete
    const isBookingComplete =
      updatedState.capturedData.nombre &&
      (updatedState.capturedData.zona || updatedState.capturedData.cp) &&
      updatedState.capturedData.telefono &&
      updatedState.capturedData.servicio

    const responseTime = Date.now() - startTime

    return NextResponse.json({
      respuesta,
      session_id,
      phase: updatedState.phase,
      captured_data: updatedState.capturedData,
      quick_replies: quickReplies,
      booking_complete: isBookingComplete,
      response_time_ms: responseTime,
    })
  } catch (error) {
    console.error('Error en /api/chat:', error)
    return NextResponse.json(
      {
        error: 'Error procesando mensaje',
        respuesta: 'Estamos teniendo problemas técnicos. ¿Me dejas tu teléfono y te llamamos? 📞',
      },
      { status: 500 }
    )
  }
}

function getFallbackResponse(state: any): string {
  const { phase, capturedData } = state
  const nombre = capturedData.nombre || ''

  // Import helper here to avoid circular dependency
  const getMissingDataField = (data: any) => {
    if (!data.nombre) return 'nombre'
    if (!data.zona && !data.cp) return 'zona'
    if (!data.servicio) return 'servicio'
    if (!data.fecha) return 'fecha'
    if (!data.hora) return 'hora'
    if (!data.direccion) return 'direccion'
    if (!data.telefono) return 'telefono'
    return null
  }

  if (phase === 'CAPTURA_DATOS') {
    const missing = getMissingDataField(capturedData)

    switch (missing) {
      case 'nombre':
        return '¡Genial! 🙌 Para empezar, ¿cómo te llamas?'

      case 'zona':
        return `Encantada${nombre ? `, ${nombre}` : ''} 😊\n\n¿En qué zona o código postal te haríamos el masaje? Así te confirmo que llegamos.`

      case 'servicio':
        return `¡Genial, llegamos a ${capturedData.zona || 'esa zona'}! 🎯\n\n¿Qué masaje prefieres?\n\n💆 Relajante 60' – 55€\n💪 Descontracturante 60' – 65€\n✨ Deportivo 60' – 70€\n🌿 Drenaje 75' – 80€\n💑 Pareja 90' – 140€`

      case 'fecha':
        return `Perfecto, ${capturedData.servicio || 'ese servicio'} 🌿\n\n¿Qué día te viene bien?`

      case 'hora':
        return '¿A qué hora te encaja mejor? ⏰\n\n🌅 Mañana (9–13h)\n☀️ Tarde (14–18h)\n🌙 Noche (19–22h)'

      case 'direccion':
        return 'Vamos cerrando 🎉\n\n¿Cuál es la dirección exacta? (calle, número y piso)\n\n🔒 Solo se usará para esta reserva.'

      case 'telefono':
        return `Ya casi está${nombre ? `, ${nombre}` : ''} ✨\n\n¿Me dejas un teléfono? Es para que el masajista te confirme y avise al llegar.`

      default:
        return 'Perfecto, ya tengo todos tus datos. Pasamos a confirmar.'
    }
  }

  const responses: Record<string, string> = {
    BIENVENIDA: '👋 ¡Hola! Soy Lía, la asistente de MassFlow. Estoy aquí para resolverte dudas sobre nuestros masajes a domicilio o ayudarte a reservar 💆‍♀️\n\n¿Por dónde empezamos?',

    DESCUBRIMIENTO: 'Cuéntame, ¿qué tipo de masaje te apetece o qué te gustaría aliviar? 🌿\n\nSi no lo tienes claro, también te puedo recomendar.',

    CUALIFICACION: 'Por lo que me cuentas, te encajaría perfecto nuestro Masaje Descontracturante de 60 min — 65€ a domicilio 💆‍♀️\n\nTrabajo profundo para aliviar tensiones.\n\n¿Te suena bien?',

    INTENCION: '¡Genial! Me encantaría ayudarte a reservar. ¿Empezamos?',

    CONFIRMACION: `¡Perfecto${nombre ? `, ${nombre}` : ''}! Confirmamos tu reserva 🎉\n\n📋 Resumen:\n• Servicio: ${capturedData.servicio || 'Masaje'}\n• Día y hora: ${capturedData.fecha || 'Fecha'} a las ${capturedData.hora || 'Hora'}\n• Dirección: ${capturedData.direccion || 'Dirección'}\n• Teléfono: ${capturedData.telefono || 'Teléfono'}\n\nTe llamaremos en menos de 1 hora para confirmar 📞`,

    POST_VENTA: '¡Mil gracias por confiar en nosotros! 💛\n\nMientras tanto, tips:\n\n🌿 Hidrátate bien\n🛀 Ducha caliente previa\n📵 Móvil en silencio\n\n¿Algo más?',

    CONVERSACION_LIBRE: 'Estoy aquí para ayudarte con lo que necesites sobre nuestros masajes. ¿Qué te gustaría saber? 😊',
  }

  return responses[phase] || responses.CONVERSACION_LIBRE
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: 'v2-progressive-disclosure',
  })
}
