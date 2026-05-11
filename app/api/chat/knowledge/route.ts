import { NextRequest, NextResponse } from 'next/server'

// In-memory knowledge base (editable from admin)
let knowledgeBase = {
  services: [
    { name: 'Masaje Relajante 60 min', duration: 60, price: 55, description: 'Masaje sueco enfocado en relajación total del cuerpo' },
    { name: 'Masaje Descontracturante 60 min', duration: 60, price: 65, description: 'Trabajo profundo para aliviar tensiones musculares' },
    { name: 'Masaje Deportivo 60 min', duration: 60, price: 70, description: 'Ideal para pre y post entreno' },
    { name: 'Masaje en Pareja 90 min', duration: 90, price: 140, description: 'Dos masajistas simultáneos para experiencia compartida' },
    { name: 'Drenaje Linfático 75 min', duration: 75, price: 80, description: 'Técnica suave para reducir retención de líquidos' },
  ],
  zones: [
    { name: 'Madrid Centro', surcharge: 0 },
    { name: 'Chamberí', surcharge: 0 },
    { name: 'Salamanca', surcharge: 0 },
    { name: 'Retiro', surcharge: 0 },
    { name: 'Chamartín', surcharge: 5 },
    { name: 'Moncloa', surcharge: 5 },
    { name: 'Arganzuela', surcharge: 0 },
    { name: 'Tetuán', surcharge: 5 },
  ],
  schedules: {
    monday: { open: '09:00', close: '21:00' },
    tuesday: { open: '09:00', close: '21:00' },
    wednesday: { open: '09:00', close: '21:00' },
    thursday: { open: '09:00', close: '21:00' },
    friday: { open: '09:00', close: '21:00' },
    saturday: { open: '10:00', close: '18:00' },
    sunday: null as null | { open: string; close: string },
  },
  cancellation_policy: 'Puedes cancelar o modificar tu reserva sin coste hasta 24 horas antes de la cita. Cancelaciones con menos de 24h de antelación tienen un cargo del 50% del servicio. No-shows se cobran al 100%.',
  faqs: [
    { question: '¿Necesito algo especial?', answer: 'Solo necesitas una cama o camilla y toallas. Nuestros masajistas llevan todo lo necesario.' },
    { question: '¿Cuánto dura la sesión?', answer: 'La duración indicada es de masaje efectivo. Añade unos 10-15 minutos para preparación.' },
    { question: '¿Puedo elegir masajista?', answer: 'Sí, puedes solicitar uno específico si tiene disponibilidad.' },
    { question: '¿Qué métodos de pago aceptáis?', answer: 'Tarjeta, Bizum y efectivo. El pago se realiza tras el servicio.' },
    { question: '¿Ofrecéis bonos?', answer: 'Sí, bonos de 5 sesiones (-10%) y 10 sesiones (-15%).' },
  ],
  welcome_message: '¡Hola! 👋 Soy el asistente de MassFlow. Estoy aquí para ayudarte con información sobre nuestros masajes a domicilio, precios, disponibilidad o para reservar una cita. ¿En qué puedo ayudarte?',
  chat_tone: 'cercano y profesional',
}

export function getKnowledgeBase() {
  return knowledgeBase
}

export async function GET() {
  return NextResponse.json(knowledgeBase)
}

export async function PUT(req: NextRequest) {
  const body = await req.json()

  // Validate required fields
  if (body.services) knowledgeBase.services = body.services
  if (body.zones) knowledgeBase.zones = body.zones
  if (body.schedules) knowledgeBase.schedules = body.schedules
  if (body.cancellation_policy !== undefined) knowledgeBase.cancellation_policy = body.cancellation_policy
  if (body.faqs) knowledgeBase.faqs = body.faqs
  if (body.welcome_message) knowledgeBase.welcome_message = body.welcome_message
  if (body.chat_tone) knowledgeBase.chat_tone = body.chat_tone

  return NextResponse.json({ success: true, knowledge_base: knowledgeBase })
}

// PATCH for partial updates (e.g., add a service, update a zone)
export async function PATCH(req: NextRequest) {
  const { action, data } = await req.json()

  switch (action) {
    case 'add_service':
      knowledgeBase.services.push(data)
      break
    case 'remove_service':
      knowledgeBase.services = knowledgeBase.services.filter(s => s.name !== data.name)
      break
    case 'update_service':
      const sIdx = knowledgeBase.services.findIndex(s => s.name === data.original_name)
      if (sIdx >= 0) knowledgeBase.services[sIdx] = data.service
      break
    case 'add_zone':
      knowledgeBase.zones.push(data)
      break
    case 'remove_zone':
      knowledgeBase.zones = knowledgeBase.zones.filter(z => z.name !== data.name)
      break
    case 'add_faq':
      knowledgeBase.faqs.push(data)
      break
    case 'remove_faq':
      knowledgeBase.faqs = knowledgeBase.faqs.filter(f => f.question !== data.question)
      break
    default:
      return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
  }

  return NextResponse.json({ success: true, knowledge_base: knowledgeBase })
}
