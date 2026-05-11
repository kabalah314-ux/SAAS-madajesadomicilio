#!/usr/bin/env node
/**
 * Script de pruebas exhaustivas para WhatsApp + Perplexity
 * Prueba 25+ casos de uso reales
 */

import crypto from 'crypto'

const WEBHOOK_URL = 'http://localhost:3000/api/whatsapp/webhook'
const WEBHOOK_VERIFY_TOKEN = 'massflow_verify_token_2026'
const WHATSAPP_ACCESS_TOKEN = 'test_token_secret_key'

interface TestCase {
  name: string
  message: string
  expectedIntent: string
  delay?: number
}

const testCases: TestCase[] = [
  // RESERVAR_CITA
  { name: '1. Reserva simple', message: 'Quiero reservar una cita', expectedIntent: 'RESERVAR_CITA', delay: 500 },
  { name: '2. Reserva con tipo', message: 'Me gustaría un masaje relajante', expectedIntent: 'RESERVAR_CITA', delay: 500 },
  { name: '3. Agendar', message: 'Necesito agendar una sesión de masaje', expectedIntent: 'RESERVAR_CITA', delay: 500 },
  { name: '4. Cita mañana', message: 'Quiero una cita para mañana', expectedIntent: 'RESERVAR_CITA', delay: 500 },

  // CANCELAR_CITA
  { name: '5. Cancelar directo', message: 'Cancelar mi reserva', expectedIntent: 'CANCELAR_CITA', delay: 500 },
  { name: '6. No puedo ir', message: 'No puedo ir a mi cita', expectedIntent: 'CANCELAR_CITA', delay: 500 },
  { name: '7. Quitar reserva', message: 'Quita mi reserva por favor', expectedIntent: 'CANCELAR_CITA', delay: 500 },

  // CONSULTAR_DISPONIBILIDAD
  { name: '8. ¿Disponibilidad?', message: '¿Tenéis disponibilidad?', expectedIntent: 'CONSULTAR_DISPONIBILIDAD', delay: 500 },
  { name: '9. ¿Horarios?', message: '¿A qué horas trabajáis?', expectedIntent: 'CONSULTAR_DISPONIBILIDAD', delay: 500 },
  { name: '10. Mañana libre', message: '¿Hay hueco mañana?', expectedIntent: 'CONSULTAR_DISPONIBILIDAD', delay: 500 },
  { name: '11. Próxima cita', message: '¿Cuándo me podéis atender?', expectedIntent: 'CONSULTAR_DISPONIBILIDAD', delay: 500 },

  // CONSULTAR_PRECIOS
  { name: '12. Precio simple', message: '¿Cuánto cuesta?', expectedIntent: 'CONSULTAR_PRECIOS', delay: 500 },
  { name: '13. Precio masaje', message: '¿Cuál es el precio del masaje?', expectedIntent: 'CONSULTAR_PRECIOS', delay: 500 },
  { name: '14. Coste relajante', message: '¿Cuánto cuesta el masaje relajante?', expectedIntent: 'CONSULTAR_PRECIOS', delay: 500 },
  { name: '15. Tarifa', message: '¿Cuál es vuestra tarifa?', expectedIntent: 'CONSULTAR_PRECIOS', delay: 500 },

  // CONSULTAR_SERVICIOS
  { name: '16. Qué ofrecen', message: '¿Qué servicios ofrecéis?', expectedIntent: 'CONSULTAR_SERVICIOS', delay: 500 },
  { name: '17. Tipos masaje', message: '¿Qué tipos de masaje hacen?', expectedIntent: 'CONSULTAR_SERVICIOS', delay: 500 },
  { name: '18. Opciones', message: '¿Cuáles son mis opciones?', expectedIntent: 'CONSULTAR_SERVICIOS', delay: 500 },

  // CONSULTAR_ZONA
  { name: '19. ¿Dónde van?', message: '¿A dónde llegáis?', expectedIntent: 'CONSULTAR_ZONA', delay: 500 },
  { name: '20. Zona cobertura', message: '¿Cuál es vuestra zona de cobertura?', expectedIntent: 'CONSULTAR_ZONA', delay: 500 },
  { name: '21. Madrid centro', message: '¿Vosotros vais a Madrid centro?', expectedIntent: 'CONSULTAR_ZONA', delay: 500 },

  // SALUDO
  { name: '22. Hola', message: 'Hola', expectedIntent: 'SALUDO', delay: 500 },
  { name: '23. Buenos días', message: 'Buenos días', expectedIntent: 'SALUDO', delay: 500 },
  { name: '24. Hey', message: 'Hey ¿qué tal?', expectedIntent: 'SALUDO', delay: 500 },

  // NO_ENTENDIDO
  { name: '25. Gibberish', message: 'asdfghjkl xyz 12345', expectedIntent: 'NO_ENTENDIDO', delay: 500 },
]

function createSignature(body: string, token: string): string {
  return 'sha256=' + crypto.createHmac('sha256', token).update(body).digest('hex')
}

function createWhatsAppPayload(message: string, fromNumber: string = '34666555444'): string {
  return JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'ENTRY_ID_123',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '34666666666',
                phone_number_id: 'PHONE_ID_123',
              },
              messages: [
                {
                  from: fromNumber,
                  id: `wamid.${Date.now()}`,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: 'text',
                  text: {
                    body: message,
                  },
                },
              ],
              contacts: [
                {
                  profile: {
                    name: 'Cliente Test',
                  },
                  wa_id: fromNumber,
                },
              ],
            },
            field: 'messages',
          },
        ],
        timestamp: Math.floor(Date.now() / 1000).toString(),
      },
    ],
  })
}

async function sendTestMessage(message: string, testName: string): Promise<boolean> {
  const payload = createWhatsAppPayload(message)
  const signature = createSignature(payload, WHATSAPP_ACCESS_TOKEN)

  console.log(`\n🧪 ${testName}`)
  console.log(`📨 "${message}"`)

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': signature,
      },
      body: payload,
    })

    if (response.ok) {
      console.log('✓ Enviado correctamente')
      return true
    } else {
      console.error(`✗ Error: ${response.status}`)
      return false
    }
  } catch (error) {
    console.error('✗ Error de conexión:', error)
    return false
  }
}

async function runAllTests(): Promise<void> {
  console.log('🚀 Iniciando tests exhaustivos de WhatsApp + Perplexity')
  console.log(`📍 Webhook URL: ${WEBHOOK_URL}`)
  console.log(`📊 Total de casos: ${testCases.length}\n`)

  let passed = 0
  let failed = 0

  for (const testCase of testCases) {
    const success = await sendTestMessage(testCase.message, testCase.name)
    if (success) {
      passed++
    } else {
      failed++
    }

    if (testCase.delay) {
      await new Promise((resolve) => setTimeout(resolve, testCase.delay))
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ Tests completados: ${passed}/${testCases.length} exitosos`)
  console.log(`❌ Fallidos: ${failed}`)
  console.log('='.repeat(60))

  console.log('\n📊 Verificar clasificaciones en los logs:')
  console.log('Get-Content ".next\\dev\\logs\\next-development.log" -Tail 100 | Select-String "Intención detectada"')
}

runAllTests().catch(console.error)
