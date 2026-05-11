// Sistema de estados de conversación MEJORADO - captura fuera de orden

export type ConversationPhase =
  | 'BIENVENIDA'
  | 'DESCUBRIMIENTO'
  | 'CUALIFICACION'
  | 'INTENCION'
  | 'CAPTURA_DATOS'
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
  // Solo actualizar campos que NO estén ya capturados (evita sobrescribir nombre con servicios, etc.)
  const newData: Partial<CapturedData> = {}
  for (const [key, value] of Object.entries(data)) {
    if (!state.capturedData[key as keyof CapturedData] && value) {
      newData[key as keyof CapturedData] = value as any
    }
  }
  state.capturedData = { ...state.capturedData, ...newData }
  conversationStates.set(sessionId, state)
}

// Extracción universal de datos - intenta extraer TODO lo posible del mensaje
export function extractAllDataFromMessage(message: string): Partial<CapturedData> {
  const extracted: Partial<CapturedData> = {}

  // Lista de palabras/frases comunes que NO son nombres
  const greetings = /^(hola|hey|buenas|buenos|hi|hello|ola|que tal|buen día|buenas tardes|buenas noches)$/i
  const timeExpressions = /^(hoy|mañana|pasado mañana|por la mañana|por la tarde|por la noche|esta semana|deportivo|relajante|descontracturante)$/i

  // Nombre (frases como "me llamo X" o "soy X", o simplemente un nombre cuando es apropiado)
  const nameMatch = message.match(/(?:me llamo|soy|mi nombre es)\s+([\p{L}]+(?:\s+[\p{L}]+)?)/iu)
  if (nameMatch) {
    extracted.nombre = nameMatch[1].trim()
  } else if (/^[\p{L}]+(?:\s+[\p{L}]+)?$/u.test(message.trim()) &&
             message.trim().length >= 2 &&
             message.trim().length <= 40 &&
             !greetings.test(message.trim()) &&
             !timeExpressions.test(message.trim())) {
    // Si el mensaje es solo un nombre (2-40 chars, solo letras), NO es saludo ni expresión temporal
    extracted.nombre = message.trim()
  }

  // Código postal (28XXX)
  const cpMatch = message.match(/\b(28\d{3})\b/)
  if (cpMatch) {
    extracted.cp = cpMatch[1]
    extracted.zona = 'Madrid'
  }

  // Teléfono (formato español)
  const phoneMatch = message.match(/(?:\+?34)?[\s.-]?([6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{3})/)
  if (phoneMatch) {
    extracted.telefono = phoneMatch[1].replace(/[\s.-]/g, '')
  }

  // Email
  const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  if (emailMatch) {
    extracted.email = emailMatch[0]
  }

  // Servicio mencionado
  const lowerMsg = message.toLowerCase()
  if (lowerMsg.includes('relajante') || lowerMsg.includes('relax')) {
    extracted.servicio = 'Masaje Relajante 60 min'
  } else if (lowerMsg.includes('descontracturante') || lowerMsg.includes('contractura')) {
    extracted.servicio = 'Masaje Descontracturante 60 min'
  } else if (lowerMsg.match(/\bdeportivo\b/)) {
    // Captura "deportivo" si es una palabra completa (no parte de otra)
    extracted.servicio = 'Masaje Deportivo 60 min'
  } else if (lowerMsg.includes('pareja')) {
    extracted.servicio = 'Masaje en Pareja 90 min'
  } else if (lowerMsg.includes('drenaje') || lowerMsg.includes('linfático')) {
    extracted.servicio = 'Drenaje Linfático 75 min'
  }

  // Fecha (chequear patrones más específicos primero)
  if (/\bhoy\b/i.test(message)) {
    extracted.fecha = 'hoy'
  } else if (/pasado\s+mañana/i.test(message)) {
    // Más específico primero
    extracted.fecha = 'pasado mañana'
  } else if (/\bmañana\b/i.test(message) && !/por\s+la\s+mañana|en\s+la\s+mañana/i.test(message)) {
    // Solo captura "mañana" como fecha si NO es parte de "por la mañana"
    extracted.fecha = 'mañana'
  } else if (/esta\s+semana/i.test(message)) {
    extracted.fecha = 'esta semana'
  } else if (/próxima\s+semana|la\s+semana\s+que\s+viene/i.test(message)) {
    extracted.fecha = 'próxima semana'
  } else {
    const dateMatch = message.match(/\d{1,2}[-/]\d{1,2}/)
    if (dateMatch) extracted.fecha = dateMatch[0]
  }

  // Hora o franja (verificar que no sea teléfono primero - teléfonos tienen 9 dígitos)
  const phonePattern = /\b[6-9]\d{8}\b/
  const timeMatch = message.match(/(?:^|\s)(\d{1,2})(?::(\d{2}))?\s*(?:h|hs|horas?)?(?:\s|$)/i)
  if (timeMatch && !phonePattern.test(message)) {
    const hour = parseInt(timeMatch[1])
    if (hour >= 9 && hour <= 22) {
      extracted.hora = `${hour}:${timeMatch[2] || '00'}`
    }
  }

  // Franjas horarias (mañana, tarde, noche)
  if (/\bpor\s+la\s+mañana\b/i.test(message)) {
    extracted.hora = 'mañana (9-13h)'
  } else if (/\btarde\b/i.test(message) && !/\bmañana\s+por\s+la\s+tarde\b/i.test(message)) {
    extracted.hora = 'tarde (14-18h)'
  } else if (/\bnoche\b/i.test(message)) {
    extracted.hora = 'noche (19-22h)'
  }

  // Dirección (debe tener al menos calle + número)
  const addressMatch = message.match(/(?:calle|c\/|avenida|av\.|paseo|plaza|glorieta|ronda|via)\s+[\p{L}\sñáéíóú]+\s*\d+/iu)
  if (addressMatch) {
    extracted.direccion = message.trim()
  } else if (/\d+\s*,\s*\d+[A-Z]?/i.test(message) && message.length > 10) {
    // Formato "Calle X 45, 3A"
    extracted.direccion = message.trim()
  } else if (/^[\p{L}ñáéíóú]+(?:\s+[\p{L}ñáéíóú]+)+\s+\d+/iu.test(message.trim()) && message.split(/\s+/).length >= 3) {
    // Formato genérico: "América 100" o "Gran Vía 28" (debe empezar con nombre + número)
    extracted.direccion = message.trim()
  }

  return extracted
}

// Determinar qué dato falta pedir basándose en lo que ya se tiene
export function getMissingDataField(capturedData: CapturedData): keyof CapturedData | null {
  // Orden de prioridad de captura
  if (!capturedData.nombre) return 'nombre'
  if (!capturedData.zona && !capturedData.cp) return 'zona'
  if (!capturedData.servicio) return 'servicio'
  if (!capturedData.fecha) return 'fecha'
  if (!capturedData.hora) return 'hora'
  if (!capturedData.direccion) return 'direccion'
  if (!capturedData.telefono) return 'telefono'
  // email es opcional, no lo pedimos si ya tienen todo lo demás
  return null
}

export function getNextPhase(state: ConversationState, userMessage: string): ConversationPhase {
  const { phase, capturedData, hasBookingIntent, messageCount } = state

  // Detectar intención de reserva
  const intentKeywords = /reserv|agend|quiero|me interesa|vale|perfecto|sí|si\b/i
  if (!hasBookingIntent && intentKeywords.test(userMessage)) {
    state.hasBookingIntent = true
  }

  // Si ya tiene todos los datos mínimos, ir a confirmación
  const hasMinimumData =
    capturedData.nombre &&
    (capturedData.zona || capturedData.cp) &&
    capturedData.servicio &&
    capturedData.telefono

  if (hasMinimumData && phase !== 'CONFIRMACION' && phase !== 'POST_VENTA') {
    return 'CONFIRMACION'
  }

  // Flujo principal
  switch (phase) {
    case 'BIENVENIDA':
      // Stay in welcome if this is the very first message (saludos)
      if (messageCount <= 1 && /^(hola|hey|buenas|buenos|hi|hello)/i.test(userMessage.trim())) {
        return 'BIENVENIDA'
      }
      // Si ya hay intención, saltar directo a captura
      if (hasBookingIntent) return 'CAPTURA_DATOS'
      return 'DESCUBRIMIENTO'

    case 'DESCUBRIMIENTO':
      // Si detectamos intención clara, saltar fases intermedias
      if (hasBookingIntent) return 'CAPTURA_DATOS'
      return 'CUALIFICACION'

    case 'CUALIFICACION':
      // Si ya hay datos capturados o intención explícita, ir a captura
      if (hasBookingIntent || capturedData.nombre || capturedData.servicio) {
        return 'CAPTURA_DATOS'
      }
      return 'INTENCION'

    case 'INTENCION':
      if (hasBookingIntent) return 'CAPTURA_DATOS'
      return 'CONVERSACION_LIBRE'

    case 'CAPTURA_DATOS':
      // Permanecer en captura hasta tener datos mínimos
      if (!hasMinimumData) return 'CAPTURA_DATOS'
      return 'CONFIRMACION'

    case 'CONFIRMACION':
      // Si usuario confirma, ir a post-venta
      if (/correcto|sí|si\b|perfecto|vale|ok|todo bien/i.test(userMessage)) {
        return 'POST_VENTA'
      }
      // Si quiere cambiar algo, volver a captura
      if (/cambiar|modificar|editar|no\s+/i.test(userMessage)) {
        return 'CAPTURA_DATOS'
      }
      return 'CONFIRMACION'

    case 'POST_VENTA':
      // Ya terminó, conversación libre
      return 'CONVERSACION_LIBRE'

    default:
      return 'CONVERSACION_LIBRE'
  }
}

export function buildPhasePrompt(state: ConversationState, knowledgeBase: any): string {
  const { phase, capturedData } = state
  const nombre = capturedData.nombre || ''

  switch (phase) {
    case 'BIENVENIDA':
      return `Responde EXACTAMENTE así:

"👋 ¡Hola! Soy Lía, la asistente de MassFlow. Estoy aquí para resolverte dudas sobre nuestros masajes a domicilio o ayudarte a reservar 💆‍♀️

¿Por dónde empezamos?"`

    case 'DESCUBRIMIENTO':
      return `El cliente acaba de iniciar. Pregunta de forma natural qué tipo de masaje necesita o qué le gustaría aliviar. 2-3 líneas máximo.

"Cuéntame, ¿qué tipo de masaje te apetece o qué te gustaría aliviar? 🌿

Si no lo tienes claro, también te puedo recomendar."`

    case 'CUALIFICACION':
      return `El cliente ha expresado una necesidad. Recomienda el servicio MÁS ADECUADO de:
${knowledgeBase.services.map((s: any) => `• ${s.name}: ${s.price}€ (${s.duration} min)`).join('\n')}

Formato:
"Por lo que me cuentas ([necesidad]), te encajaría nuestro [SERVICIO] — [PRECIO]€ 💆‍♀️

[Breve beneficio específico]

¿Te suena bien?"`

    case 'INTENCION':
      return `Detecta si quiere reservar ya o solo mira. Si quiere reservar: "¡Genial! 🙌 Para empezar, ¿cómo te llamas?". Si solo mira: ofrece enviarle info.`

    case 'CAPTURA_DATOS': {
      // Determinar qué falta
      const missingField = getMissingDataField(capturedData)

      switch (missingField) {
        case 'nombre':
          return `Necesitas el NOMBRE. Pregunta: "¡Genial! 🙌 Para empezar, ¿cómo te llamas?"`

        case 'zona':
          return `Ya tienes: ${nombre}. Necesitas ZONA/CP:

"Encantada${nombre ? `, ${nombre}` : ''} 😊

¿En qué zona o código postal te haríamos el masaje? Así te confirmo que llegamos."`

        case 'servicio':
          return `Ya tienes nombre y zona. Muestra servicios:

"¡Genial, llegamos a ${capturedData.zona || 'esa zona'}! 🎯

¿Qué masaje prefieres?

💆 Relajante 60' – 55€
💪 Descontracturante 60' – 65€
✨ Deportivo 60' – 70€
🌿 Drenaje 75' – 80€
💑 Pareja 90' – 140€"`

        case 'fecha':
          return `Necesitas FECHA:

"Perfecto, ${capturedData.servicio || 'ese servicio'} 🌿

¿Qué día te viene bien?"`

        case 'hora':
          return `Necesitas HORA:

"¿A qué hora te encaja mejor? ⏰

🌅 Mañana (9–13h)
☀️ Tarde (14–18h)
🌙 Noche (19–22h)"`

        case 'direccion':
          return `Necesitas DIRECCIÓN:

"Vamos cerrando 🎉

¿Cuál es la dirección exacta? (calle, número y piso)

🔒 Solo se usará para esta reserva."`

        case 'telefono':
          return `Último dato, TELÉFONO:

"Ya casi está${nombre ? `, ${nombre}` : ''} ✨

¿Me dejas un teléfono? Es para que el masajista te confirme y avise al llegar."`

        default:
          return `Ya tienes todos los datos necesarios. Ve directo a confirmación.`
      }
    }

    case 'CONFIRMACION':
      return `Genera resumen completo:

"¡Perfecto${nombre ? `, ${nombre}` : ''}! Confirmamos tu reserva 🎉

📋 Resumen:
• Servicio: ${capturedData.servicio || 'Masaje'}
• Día y hora: ${capturedData.fecha || 'Fecha'} a las ${capturedData.hora || 'Hora'}
• Dirección: ${capturedData.direccion || 'Dirección'}
• Precio: [precio]€ (pago al masajista)
• Teléfono: ${capturedData.telefono || 'Teléfono'}

Te llamaremos en menos de 1 hora para confirmar 📞"`

    case 'POST_VENTA':
      return `Cierra con tips:

"¡Mil gracias por confiar en nosotros! 💛

Mientras tanto:

🌿 Hidrátate bien antes y después
🛀 Ducha caliente previa relaja
📵 Móvil en silencio

¿Algo más?"`

    default:
      return `Eres Lía, asistente de MassFlow. Responde natural, cálido, breve (2-3 líneas). Si preguntan de la base de conocimiento, responde con datos reales.`
  }
}

export function getQuickReplies(phase: ConversationPhase, capturedData: CapturedData): string[] {
  switch (phase) {
    case 'BIENVENIDA':
      return ['💰 Ver precios', '📍 Zonas', '📅 Reservar', '❓ Otra duda']

    case 'CUALIFICACION':
      return ['✅ Sí, me interesa', '🔄 Ver otras opciones', '💬 Tengo más dudas']

    case 'CAPTURA_DATOS': {
      const missing = getMissingDataField(capturedData)
      if (missing === 'fecha') {
        return ['🟢 Hoy', '📅 Mañana', '📆 Esta semana', '🗓️ Otro día']
      }
      if (missing === 'hora') {
        return ['🌅 Mañana (9–13h)', '☀️ Tarde (14–18h)', '🌙 Noche (19–22h)']
      }
      return []
    }

    case 'CONFIRMACION':
      return ['✅ Todo correcto', '✏️ Quiero cambiar algo']

    case 'POST_VENTA':
      return ['🙏 No, gracias', '💬 Otra duda']

    default:
      return []
  }
}
