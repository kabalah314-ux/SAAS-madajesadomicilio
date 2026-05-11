#!/usr/bin/env node
/**
 * Script de prueba para WhatsApp (sin necesidad de API real de Meta)
 * Simula mensajes y verifica que el flujo funciona correctamente
 */

import crypto from 'crypto';

const WEBHOOK_URL = 'http://localhost:3000/api/whatsapp/webhook';
const WEBHOOK_VERIFY_TOKEN = 'massflow_verify_token_2026';
const WHATSAPP_ACCESS_TOKEN = 'test_token_secret_key'; // Para signature

interface TestCase {
  name: string;
  message: string;
  expectedIntent?: string;
  delay?: number;
}

const testCases: TestCase[] = [
  {
    name: 'Test 1: Cliente saluda',
    message: 'Hola, quiero hacer una cita',
    expectedIntent: 'RESERVAR_CITA',
    delay: 1000,
  },
  {
    name: 'Test 2: Cliente pregunta precio',
    message: 'Cuánto cuesta un masaje relajante?',
    expectedIntent: 'CONSULTAR_PRECIOS',
    delay: 2000,
  },
  {
    name: 'Test 3: Cliente pregunta disponibilidad',
    message: 'Tenéis disponibilidad mañana?',
    expectedIntent: 'CONSULTAR_DISPONIBILIDAD',
    delay: 3000,
  },
  {
    name: 'Test 4: Cliente cancela reserva',
    message: 'Quiero cancelar mi reserva',
    expectedIntent: 'CANCELAR_CITA',
    delay: 4000,
  },
  {
    name: 'Test 5: Cliente mensaje no entendido',
    message: 'asdfghjkl 12345 xxxxx',
    expectedIntent: 'NO_ENTENDIDO',
    delay: 5000,
  },
];

/**
 * Crear signature válida (como lo hace Meta)
 */
function createSignature(body: string, token: string): string {
  return 'sha256=' + crypto.createHmac('sha256', token).update(body).digest('hex');
}

/**
 * Construir payload de WhatsApp válido
 */
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
  });
}

/**
 * Enviar mensaje de prueba
 */
async function sendTestMessage(message: string, testName: string): Promise<void> {
  const payload = createWhatsAppPayload(message);
  const signature = createSignature(payload, WHATSAPP_ACCESS_TOKEN);

  console.log(`\n🧪 ${testName}`);
  console.log(`📨 Mensaje: "${message}"`);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': signature,
      },
      body: payload,
    });

    if (response.ok) {
      console.log('✓ Mensaje enviado correctamente (200)');
    } else {
      console.error(`✗ Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Respuesta:', text);
    }
  } catch (error) {
    console.error('✗ Error de conexión:', error);
  }
}

/**
 * Ejecutar todos los tests
 */
async function runAllTests(): Promise<void> {
  console.log('🚀 Iniciando tests de WhatsApp...');
  console.log(`📍 Webhook URL: ${WEBHOOK_URL}`);
  console.log(`🔑 Token: ${WEBHOOK_VERIFY_TOKEN}`);
  console.log('');

  // Verificar que el servidor está corriendo
  try {
    await fetch(`${WEBHOOK_URL}?hub.mode=subscribe&hub.verify_token=${WEBHOOK_VERIFY_TOKEN}&hub.challenge=test123`);
  } catch (error) {
    console.error('❌ Error: No se puede conectar al servidor');
    console.error('   Por favor ejecuta: npm run dev');
    process.exit(1);
  }

  for (const testCase of testCases) {
    await sendTestMessage(testCase.message, testCase.name);
    // Esperar entre tests
    if (testCase.delay) {
      await new Promise((resolve) => setTimeout(resolve, testCase.delay));
    }
  }

  console.log('\n✅ Tests completados');
  console.log('\n📊 Próximos pasos:');
  console.log('1. Revisa los logs en la terminal de Next.js (npm run dev)');
  console.log('2. Verifica en Supabase que se crearon conversaciones_whatsapp');
  console.log('3. Verifica en Supabase que se crearon mensajes_whatsapp');
  console.log('4. Verifica que las intenciones fueron clasificadas correctamente');
}

// Ejecutar
runAllTests().catch(console.error);
