// Clasificador multi-tenant que soporta múltiples proveedores de IA

import { createClient } from '@supabase/supabase-js'
import { obtenerProveedorEmpresa } from './providers/factory'
import { clasificarConHeuristica } from './clasificador'
import type { ConversacionWhatsApp, Intencion } from '@/types/whatsapp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

interface ClasificacionResultado {
  intencion: Intencion
  confianza: number
  proveedor: string
}

/**
 * Clasifica la intención usando el proveedor configurado para la empresa
 * @param mensaje - Mensaje del cliente
 * @param conversacion - Contexto de la conversación
 * @param empresaId - ID de la empresa (cliente)
 */
export async function clasificarIntencionMultiTenant(
  mensaje: string,
  conversacion: ConversacionWhatsApp,
  empresaId: string
): Promise<ClasificacionResultado> {
  try {
    // 1. Obtener proveedor de IA de la empresa
    const proveedor = await obtenerProveedorEmpresa(empresaId, supabaseAdmin)

    // 2. Construir contexto
    const contexto = construirContexto(conversacion)

    // 3. Clasificar con el proveedor
    const resultado = await proveedor.clasificar(mensaje, contexto)

    // 4. Registrar uso para facturación
    await registrarUsoIA(empresaId, resultado.proveedor, mensaje.length)

    return resultado as ClasificacionResultado
  } catch (error: any) {
    console.error('Error clasificando (usando fallback heurístico):', error.message)

    // Fallback: usar heurística local (sin costo)
    const resultado = clasificarConHeuristica(mensaje, conversacion)
    return {
      ...resultado,
      proveedor: 'heuristica_fallback',
    }
  }
}

/**
 * Construye el contexto para enviar al modelo de IA
 */
function construirContexto(conversacion: ConversacionWhatsApp): string {
  return `Eres el clasificador de intenciones de MassFlow, servicio de masajes a domicilio.

CONTEXTO ACTUAL:
- Estado del flujo: ${conversacion.estado_flujo}
- Paso actual: ${conversacion.paso_actual}
- Datos guardados: ${JSON.stringify(conversacion.datos_temporales)}
- Intentos fallidos: ${conversacion.intentos_no_entendido}

Clasifica la intención en UNA de estas categorías EXACTAS:
RESERVAR_CITA, CANCELAR_CITA, CONSULTAR_DISPONIBILIDAD, CONSULTAR_PRECIOS,
CONSULTAR_SERVICIOS, CONSULTAR_ZONA, ESTADO_RESERVA, SALUDO, NO_ENTENDIDO

REGLAS:
1. Si el cliente está en medio de un flujo y responde datos válidos, continúa ese flujo
2. "Sí/SI" en confirmaciones es parte del flujo actual
3. Números (1,2,3) en respuesta a opciones son parte del flujo
4. Solo usa NO_ENTENDIDO si es realmente ambiguo`
}

/**
 * Registra el uso de IA para facturación
 */
async function registrarUsoIA(
  empresaId: string,
  proveedor: string,
  tokensAproximados: number
): Promise<void> {
  try {
    await supabaseAdmin.from('uso_ia_registro').insert({
      empresa_id: empresaId,
      proveedor,
      tokens_aproximados: tokensAproximados,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.warn('No se pudo registrar uso de IA (no crítico)', error)
  }
}

/**
 * Obtiene resumen de uso de IA para una empresa
 */
export async function obtenerResumenUsoIA(
  empresaId: string,
  diasUltimos: number = 30
): Promise<any> {
  const fechaInicio = new Date()
  fechaInicio.setDate(fechaInicio.getDate() - diasUltimos)

  const { data, error } = await supabaseAdmin
    .from('uso_ia_registro')
    .select('proveedor, tokens_aproximados')
    .eq('empresa_id', empresaId)
    .gte('timestamp', fechaInicio.toISOString())

  if (error) {
    console.error('Error obteniendo uso de IA:', error)
    return null
  }

  // Agrupar por proveedor
  const resumen = (data || []).reduce((acc: any, registro: any) => {
    if (!acc[registro.proveedor]) {
      acc[registro.proveedor] = { llamadas: 0, tokens: 0 }
    }
    acc[registro.proveedor].llamadas++
    acc[registro.proveedor].tokens += registro.tokens_aproximados
    return acc
  }, {})

  return resumen
}
