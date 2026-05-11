// Factory para crear el proveedor de IA correcto

import type { ProveedorIA, ProveedorIAInterface, ConfigProveedorIA } from './tipos'
import { AnthropicProvider } from './anthropic-provider'
import { OpenAIProvider } from './openai-provider'
import { GeminiProvider } from './gemini-provider'
import { PerplexityProvider } from './perplexity-provider'

/**
 * Crea instancia del proveedor de IA seleccionado
 * Uso: const provider = crearProveedorIA(config)
 */
export function crearProveedorIA(config: ConfigProveedorIA): ProveedorIAInterface {
  switch (config.proveedor) {
    case 'anthropic':
      return new AnthropicProvider(config.apiKey)

    case 'openai':
      return new OpenAIProvider(config.apiKey)

    case 'gemini':
      return new GeminiProvider(config.apiKey)

    case 'perplexity':
      return new PerplexityProvider(config.apiKey)

    default:
      throw new Error(`Proveedor desconocido: ${config.proveedor}`)
  }
}

/**
 * Obtiene el proveedor configurado para una empresa
 */
export async function obtenerProveedorEmpresa(
  empresaId: string,
  supabaseAdmin: any
): Promise<ProveedorIAInterface> {
  const { data, error } = await supabaseAdmin
    .from('empresas')
    .select('proveedor_ia, api_key_ia')
    .eq('id', empresaId)
    .single()

  if (error || !data) {
    throw new Error(`Empresa no encontrada: ${empresaId}`)
  }

  const config: ConfigProveedorIA = {
    proveedor: data.proveedor_ia || 'anthropic',
    apiKey: data.api_key_ia || process.env.ANTHROPIC_API_KEY || '',
  }

  return crearProveedorIA(config)
}

/**
 * Mapeo de costos aproximados por proveedor
 * Para calcular facturación
 */
export const costosProveedores = {
  anthropic: {
    modelo: 'claude-haiku-4-5-20251001',
    precioInput: 0.80, // $ por 1M tokens
    precioOutput: 4.0,
    descripcion: 'Mejor calidad, multiidioma',
  },
  openai: {
    modelo: 'gpt-4o-mini',
    precioInput: 0.15, // $ por 1M tokens
    precioOutput: 0.6,
    descripcion: 'Muy barato, buena calidad',
  },
  gemini: {
    modelo: 'gemini-1.5-flash',
    precioInput: 0.075, // $ por 1M tokens
    precioOutput: 0.3,
    descripcion: 'Súper barato, calidad aceptable',
  },
  perplexity: {
    modelo: 'sonar',
    precioInput: 0.20, // $ por 1M tokens (estimado)
    precioOutput: 0.20,
    descripcion: 'Ligero y económico, con búsqueda web',
  },
}
