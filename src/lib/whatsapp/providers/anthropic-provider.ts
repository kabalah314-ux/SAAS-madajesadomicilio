// Proveedor Anthropic Claude

import Anthropic from '@anthropic-ai/sdk'
import type { ProveedorIAInterface, ClasificacionResult } from './tipos'

export class AnthropicProvider implements ProveedorIAInterface {
  nombre: 'anthropic' = 'anthropic'
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async clasificar(mensaje: string, contexto: string): Promise<ClasificacionResult> {
    const prompt = `${contexto}\n\nMensaje del cliente: "${mensaje}"\n\nResponde ÚNICAMENTE con una de estas categorías:\nRESERVAR_CITA, CANCELAR_CITA, CONSULTAR_DISPONIBILIDAD, CONSULTAR_PRECIOS, CONSULTAR_SERVICIOS, CONSULTAR_ZONA, ESTADO_RESERVA, SALUDO, NO_ENTENDIDO`

    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const respuesta = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    return {
      intencion: this.parseIntencion(respuesta),
      confianza: 0.85,
      proveedor: 'anthropic',
    }
  }

  async validarConfig(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      })
      return true
    } catch {
      return false
    }
  }

  private parseIntencion(respuesta: string): string {
    const intenciones = [
      'RESERVAR_CITA',
      'CANCELAR_CITA',
      'CONSULTAR_DISPONIBILIDAD',
      'CONSULTAR_PRECIOS',
      'CONSULTAR_SERVICIOS',
      'CONSULTAR_ZONA',
      'ESTADO_RESERVA',
      'SALUDO',
      'NO_ENTENDIDO',
    ]

    const respuestaUpper = respuesta.toUpperCase()
    return intenciones.find((i) => respuestaUpper.includes(i)) || 'NO_ENTENDIDO'
  }
}
