// Proveedor OpenAI GPT

import OpenAI from 'openai'
import type { ProveedorIAInterface, ClasificacionResult } from './tipos'

export class OpenAIProvider implements ProveedorIAInterface {
  nombre: 'openai' = 'openai'
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async clasificar(mensaje: string, contexto: string): Promise<ClasificacionResult> {
    const prompt = `${contexto}\n\nMensaje del cliente: "${mensaje}"\n\nResponde ÚNICAMENTE con una de estas categorías:\nRESERVAR_CITA, CANCELAR_CITA, CONSULTAR_DISPONIBILIDAD, CONSULTAR_PRECIOS, CONSULTAR_SERVICIOS, CONSULTAR_ZONA, ESTADO_RESERVA, SALUDO, NO_ENTENDIDO`

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini', // Muy barato: ~$0.15 por 1M tokens
      max_tokens: 100,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const respuesta = response.choices[0].message.content?.trim() || ''

    return {
      intencion: this.parseIntencion(respuesta),
      confianza: 0.80,
      proveedor: 'openai',
    }
  }

  async validarConfig(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
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
