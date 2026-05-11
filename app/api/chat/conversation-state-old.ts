// Sistema de estados de conversación para progressive disclosure

export type ConversationPhase =
  | 'BIENVENIDA'
  | 'DESCUBRIMIENTO'
  | 'CUALIFICACION'
  | 'INTENCION'
  | 'CAPTURA_NOMBRE'
  | 'CAPTURA_ZONA'
  | 'CAPTURA_SERVICIO'
  | 'CAPTURA_FECHA'
  | 'CAPTURA_HORA'
  | 'CAPTURA_DIRECCION'
  | 'CAPTURA_TELEFONO'
  | 'CAPTURA_EMAIL'
  | 'CONFIRMACION'
  | 'POST_VENTA'
  | 'CONVERSACION_LIBRE'

export interface CapturedData {
  nombre?: string
  zona?: string
  cp?: string
  servicio?: string
  fecha?: string
  hora?: string
  direccion?: string
  telefono?: string
  email?: string
}

export interface ConversationState {
  session_id: string
  phase: ConversationPhase
  capturedData: CapturedData
  messageCount: number
  hasBookingIntent: boolean
  lastMessageAt: Date
  createdAt: Date
}

// In-memory store (production: Redis)
const conversationStates = new Map<string, ConversationState>()

export function getConversationState(sessionId: string): ConversationState {
  if (!conversationStates.has(sessionId)) {
    conversationStates.set(sessionId, {
      session_id: sessionId,
      phase: 'BIENVENIDA',
      capturedData: {},
      messageCount: 0,
      hasBookingIntent: false,
      lastMessageAt: new Date(),
      createdAt: new Date(),
    })
  }
  const state = conversationStates.get(sessionId)!
  state.lastMessageAt = new Date()
  state.messageCount++
  return state
}

export function updateConversationState(sessionId: string, updates: Partial<ConversationState>) {
  const state = getConversationState(sessionId)
  Object.assign(state, updates)
  conversationStates.set(sessionId, state)
}

export function captureData(sessionId: string, data: Partial<CapturedData>) {
  const state = getConversationState(sessionId)
  state.capturedData = { ...state.capturedData, ...data }
  conversationStates.set(sessionId, state)
}

export function getNextPhase(state: ConversationState, userMessage: string): ConversationPhase {
  const { phase, capturedData, hasBookingIntent, messageCount } = state

  // Detect booking intent
  const intentKeywords = /reserv|agend|quiero|me interesa|vale|perfecto|sí|si\b/i
  if (!hasBookingIntent && intentKeywords.test(userMessage)) {
    state.hasBookingIntent = true
  }

  // Phase transitions
  switch (phase) {
    case 'BIENVENIDA':
      // Stay in welcome if this is the very first message (saludos)
      if (messageCount <= 1 && /^(hola|hey|buenas|buenos|hi|hello)/i.test(userMessage.trim())) {
        return 'BIENVENIDA'
      }
      return 'DESCUBRIMIENTO'

    case 'DESCUBRIMIENTO':
      return 'CUALIFICACION'

    case 'CUALIFICACION':
      return 'INTENCION'

    case 'INTENCION':
      if (hasBookingIntent) return 'CAPTURA_NOMBRE'
      return 'CONVERSACION_LIBRE'

    case 'CAPTURA_NOMBRE':
      // Avanza si capturó el nombre O si el usuario responde algo razonable (no solo pregunta)
      if (capturedData.nombre || (userMessage.length > 2 && !/^(y|qué|cuál|cómo|dónde)/i.test(userMessage))) {
        return 'CAPTURA_ZONA'
      }
      return 'CAPTURA_NOMBRE'

    case 'CAPTURA_ZONA':
      // Avanza si capturó zona/CP O responde algo razonable
      if (capturedData.zona || capturedData.cp || (/\d{5}/.test(userMessage) || userMessage.length >= 4)) {
        return 'CAPTURA_SERVICIO'
      }
      return 'CAPTURA_ZONA'

    case 'CAPTURA_SERVICIO':
      // Avanza si capturó servicio O menciona un servicio conocido O responde afirmativamente
      if (capturedData.servicio ||
          /relajante|descontracturante|deportivo|pareja|drenaje/i.test(userMessage) ||
          /vale|sí|si\b|perfecto|ese|eso/i.test(userMessage)) {
        return 'CAPTURA_FECHA'
      }
      return 'CAPTURA_SERVICIO'

    case 'CAPTURA_FECHA':
      // Avanza si capturó fecha O responde algo temporal
      if (capturedData.fecha || /hoy|mañana|semana|lunes|martes|miércoles|jueves|viernes|sábado|domingo|\d+/i.test(userMessage)) {
        return 'CAPTURA_HORA'
      }
      return 'CAPTURA_FECHA'

    case 'CAPTURA_HORA':
      // Avanza si capturó hora O responde algo temporal
      if (capturedData.hora || /mañana|tarde|noche|\d{1,2}:\d{2}|\d{1,2}\s*h/i.test(userMessage)) {
        return 'CAPTURA_DIRECCION'
      }
      return 'CAPTURA_HORA'

    case 'CAPTURA_DIRECCION':
      // Avanza si capturó dirección O responde algo con calle/número
      if (capturedData.direccion || /calle|c\/|avenida|av\.|paseo|plaza|\d+/.test(userMessage.toLowerCase())) {
        return 'CAPTURA_TELEFONO'
      }
      return 'CAPTURA_DIRECCION'

    case 'CAPTURA_TELEFONO':
      // Avanza si capturó teléfono O responde números
      if (capturedData.telefono || /\d{6,}/.test(userMessage)) {
        return 'CAPTURA_EMAIL'
      }
      return 'CAPTURA_TELEFONO'

    case 'CAPTURA_EMAIL':
      // Avanza directamente a confirmación (email es opcional)
      return 'CONFIRMACION'

    case 'CONFIRMACION':
      return 'POST_VENTA'

    default:
      return 'CONVERSACION_LIBRE'
  }
}

export function extractDataFromMessage(message: string, phase: ConversationPhase): Partial<CapturedData> {
  const extracted: Partial<CapturedData> = {}

  // Extracción de servicio (funciona en cualquier fase si menciona uno)
  if (/relajante/i.test(message)) {
    extracted.servicio = 'Masaje Relajante 60 min'
  } else if (/descontracturante/i.test(message)) {
    extracted.servicio = 'Masaje Descontracturante 60 min'
  } else if (/deportivo/i.test(message)) {
    extracted.servicio = 'Masaje Deportivo 60 min'
  } else if (/pareja/i.test(message)) {
    extracted.servicio = 'Masaje en Pareja 90 min'
  } else if (/drenaje|linfático/i.test(message)) {
    extracted.servicio = 'Drenaje Linfático 75 min'
  }

  switch (phase) {
    case 'CAPTURA_NOMBRE':
      const nameMatch = message.match(/(?:me llamo|soy|mi nombre es)\s+([\p{L}]+(?:\s+[\p{L}]+)?)/iu)
      if (nameMatch) {
        extracted.nombre = nameMatch[1].trim()
      } else if (/^[\p{L}\s]+$/u.test(message.trim()) && message.trim().length >= 2) {
        extracted.nombre = message.trim()
      }
      break

    case 'CAPTURA_ZONA':
      const cpMatch = message.match(/\b(28\d{3})\b/)
      if (cpMatch) {
        extracted.cp = cpMatch[1]
        extracted.zona = 'Madrid' // Default for 28xxx
      } else {
        const zonaNormalized = message.trim()
        if (zonaNormalized.length >= 3) {
          extracted.zona = zonaNormalized
        }
      }
      break

    case 'CAPTURA_FECHA':
      if (/hoy/i.test(message)) {
        extracted.fecha = 'hoy'
      } else if (/mañana|mañana/i.test(message)) {
        extracted.fecha = 'mañana'
      } else if (/esta\s+semana/i.test(message)) {
        extracted.fecha = 'esta semana'
      } else {
        const dateMatch = message.match(/\d{1,2}[-/]\d{1,2}/)
        if (dateMatch) extracted.fecha = dateMatch[0]
        else if (message.trim().length > 3) extracted.fecha = message.trim()
      }
      break

    case 'CAPTURA_HORA':
      const timeMatch = message.match(/(\d{1,2})(?::(\d{2}))?/)
      if (timeMatch) {
        const hour = parseInt(timeMatch[1])
        if (hour >= 9 && hour <= 22) {
          extracted.hora = `${hour}:${timeMatch[2] || '00'}`
        }
      } else if (/mañana/i.test(message)) {
        extracted.hora = 'mañana (9-13h)'
      } else if (/tarde/i.test(message)) {
        extracted.hora = 'tarde (14-18h)'
      } else if (/noche/i.test(message)) {
        extracted.hora = 'noche (19-22h)'
      }
      break

    case 'CAPTURA_DIRECCION':
      if (message.trim().length > 10) {
        extracted.direccion = message.trim()
      }
      break

    case 'CAPTURA_TELEFONO':
      const phoneMatch = message.match(/(?:\+?34)?[\s.-]?([6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{3})/)
      if (phoneMatch) {
        extracted.telefono = phoneMatch[1].replace(/[\s.-]/g, '')
      }
      break

    case 'CAPTURA_EMAIL':
      const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
      if (emailMatch) {
        extracted.email = emailMatch[0]
      }
      break
  }

  return extracted
}

export function buildPhasePrompt(state: ConversationState, knowledgeBase: any): string {
  const { phase, capturedData } = state

  const nombre = capturedData.nombre || 'el cliente'

  switch (phase) {
    case 'BIENVENIDA':
      return `Responde EXACTAMENTE así (copia literal):

"👋 ¡Hola! Soy Lía, la asistente de MassFlow. Estoy aquí para resolverte dudas sobre nuestros masajes a domicilio o ayudarte a reservar 💆‍♀️

¿Por dónde empezamos?"`

    case 'DESCUBRIMIENTO':
      return `El cliente acaba de escribir. Responde de forma natural y cálida preguntando qué tipo de masaje necesita o qué le gustaría aliviar. Usa 2-3 líneas máximo. Ejemplo:

"Cuéntame, ¿qué tipo de masaje te apetece o qué te gustaría aliviar? 🌿

Si no lo tienes claro, también te puedo recomendar."`

    case 'CUALIFICACION':
      return `El cliente ha expresado una necesidad. Ahora recomienda el servicio MÁS ADECUADO de la lista:
${knowledgeBase.services.map((s: any) => `• ${s.name}: ${s.price}€ (${s.duration} min) — ${s.description}`).join('\n')}

Formato de respuesta:
"Por lo que me cuentas ([resumir necesidad]), te encajaría nuestro [SERVICIO] de [DURACIÓN] min — [PRECIO]€ a domicilio en Madrid 💆‍♀️

[Breve descripción del beneficio específico para su caso]

¿Te suena bien? 👇"`

    case 'INTENCION':
      return `El cliente parece interesado. Detecta si quiere reservar ya o solo está mirando. Si parece que quiere reservar, di algo como "¡Genial! 🙌 Para empezar, ¿cómo te llamas?". Si solo está mirando, ofrece enviarle info sin compromiso.`

    case 'CAPTURA_NOMBRE':
      return `Necesitas el NOMBRE del cliente. Pregunta de forma amigable:

"¡Genial! 🙌 Para empezar, ¿cómo te llamas?"`

    case 'CAPTURA_ZONA':
      return `Ya tienes el nombre: ${nombre}. Ahora necesitas la ZONA o CP. Pregunta así:

"Encantada, ${nombre} 😊

¿En qué zona o código postal te haríamos el masaje? Así te confirmo que llegamos y si hay recargo."`

    case 'CAPTURA_SERVICIO':
      return `Ya tienes nombre (${nombre}) y zona. Muestra los servicios con BOTONES claros incluyendo precio:

"¡Genial, llegamos a [zona]! 🎯

¿Qué masaje prefieres?

💆 Relajante 60' – 55€
💪 Descontracturante 60' – 65€
✨ Deportivo 60' – 70€
🌿 Drenaje Linfático 75' – 80€
💑 Pareja 90' – 140€"`

    case 'CAPTURA_FECHA':
      return `Ya tienes nombre, zona y servicio. Pregunta la FECHA con opciones:

"Perfecto, ${capturedData.servicio || 'ese servicio'} 🌿

¿Qué día te viene bien?

🟢 Hoy
📅 Mañana
📆 Esta semana
🗓️ Otro día"`

    case 'CAPTURA_HORA':
      return `Ya tienes fecha. Pregunta la HORA por franjas:

"¿A qué hora te encaja mejor? ⏰

🌅 Mañana (9–13h)
☀️ Tarde (14–18h)
🌙 Noche (19–22h)"`

    case 'CAPTURA_DIRECCION':
      return `Ya casi todo. Pide la DIRECCIÓN con disclaimer de privacidad:

"Vamos cerrando 🎉

¿Cuál es la dirección exacta? (calle, número y piso)

🔒 Solo se usará para esta reserva."`

    case 'CAPTURA_TELEFONO':
      return `Casi está. Pide el TELÉFONO justificándolo:

"Ya casi está, ${nombre} ✨

¿Me dejas un teléfono? Es solo para que el masajista te confirme y avise al llegar."`

    case 'CAPTURA_EMAIL':
      return `Opcional: pregunta si quiere confirmación por EMAIL:

"Última cosita: ¿quieres que te mande la confirmación por email también?

📧 Sí, claro
❌ No hace falta"`

    case 'CONFIRMACION':
      return `Genera un RESUMEN COMPLETO de la reserva con todos los datos capturados:

"¡Perfecto, ${nombre}! Confirmamos tu reserva 🎉

📋 Resumen:
• Servicio: ${capturedData.servicio || 'Masaje'}
• Día y hora: ${capturedData.fecha || 'Fecha'} a las ${capturedData.hora || 'Hora'}
• Dirección: ${capturedData.direccion || 'Dirección'}
• Precio: [precio]€ (pago al masajista)
• Teléfono: ${capturedData.telefono || 'Teléfono'}

Te llamaremos en menos de 1 hora para confirmar definitivamente 📞

✅ Todo correcto
✏️ Quiero cambiar algo"`

    case 'POST_VENTA':
      return `Cierra con calidez y tips útiles:

"¡Mil gracias por confiar en nosotros! 💛

Mientras tanto, un par de tips para sacarle el máximo provecho:

🌿 Hidrátate bien antes y después
🛀 Una ducha caliente previa relaja la musculatura
📵 Apaga el móvil durante la sesión

¿Algo más en lo que pueda ayudarte?"`

    default:
      return `Eres Lía, asistente de MassFlow. Responde de forma natural, cálida y breve (2-3 líneas). Si te preguntan algo de la base de conocimiento, responde con los datos reales. Si detectas intención de reserva, ofrece ayudar.`
  }
}

export function getQuickReplies(phase: ConversationPhase): string[] {
  switch (phase) {
    case 'BIENVENIDA':
      return ['💰 Ver precios', '📍 Zonas', '📅 Reservar', '❓ Otra duda']

    case 'CUALIFICACION':
      return ['✅ Sí, me interesa', '🔄 Ver otras opciones', '💬 Tengo más dudas']

    case 'CAPTURA_FECHA':
      return ['🟢 Hoy', '📅 Mañana', '📆 Esta semana', '🗓️ Otro día']

    case 'CAPTURA_HORA':
      return ['🌅 Mañana (9–13h)', '☀️ Tarde (14–18h)', '🌙 Noche (19–22h)']

    case 'CAPTURA_EMAIL':
      return ['📧 Sí, claro', 'No hace falta']

    case 'CONFIRMACION':
      return ['✅ Todo correcto', '✏️ Quiero cambiar algo']

    case 'POST_VENTA':
      return ['🙏 No, gracias', '💬 Otra duda']

    default:
      return []
  }
}
