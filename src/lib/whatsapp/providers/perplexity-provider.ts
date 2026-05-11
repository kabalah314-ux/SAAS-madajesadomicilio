// Proveedor Perplexity AI

import type { ProveedorIAInterface, ClasificacionResult } from './tipos'

export class PerplexityProvider implements ProveedorIAInterface {
  nombre: 'perplexity' = 'perplexity'
  private apiKey: string
  private baseUrl = 'https://api.perplexity.ai'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async clasificar(mensaje: string, contexto: string): Promise<ClasificacionResult> {
    const prompt = `${contexto}\n\nMensaje del cliente: "${mensaje}"\n\nResponde ÚNICAMENTE con una de estas categorías:\nRESERVAR_CITA, CANCELAR_CITA, CONSULTAR_DISPONIBILIDAD, CONSULTAR_PRECIOS, CONSULTAR_SERVICIOS, CONSULTAR_ZONA, ESTADO_RESERVA, SALUDO, NO_ENTENDIDO`

    const payload = {
      model: 'llama-3.1-sonar-small-128k-online',
      max_tokens: 100,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        ...payload,
        model: 'sonar', // Modelo válido de Perplexity
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Perplexity error response:', errorText)
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const respuesta = data.choices?.[0]?.message?.content?.trim() || ''

    return {
      intencion: this.parseIntencion(respuesta),
      confianza: 0.85,
      proveedor: 'perplexity',
    }
  }

  async validarConfig(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'sonar',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }],
        }),
      })

      if (!response.ok) {
        console.error('Perplexity validation failed:', response.status, await response.text())
        return false
      }

      return true
    } catch (error) {
      console.error('Perplexity validation error:', error)
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
