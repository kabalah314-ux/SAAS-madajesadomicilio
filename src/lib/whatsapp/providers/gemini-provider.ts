// Proveedor Google Gemini

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ProveedorIAInterface, ClasificacionResult } from './tipos'

export class GeminiProvider implements ProveedorIAInterface {
  nombre: 'gemini' = 'gemini'
  private client: GoogleGenerativeAI

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey)
  }

  async clasificar(mensaje: string, contexto: string): Promise<ClasificacionResult> {
    const model = this.client.getGenerativeModel({
      model: 'gemini-1.5-flash', // Muy barato: ~$0.075 por 1M tokens
    })

    const prompt = `${contexto}\n\nMensaje del cliente: "${mensaje}"\n\nResponde ÚNICAMENTE con una de estas categorías:\nRESERVAR_CITA, CANCELAR_CITA, CONSULTAR_DISPONIBILIDAD, CONSULTAR_PRECIOS, CONSULTAR_SERVICIOS, CONSULTAR_ZONA, ESTADO_RESERVA, SALUDO, NO_ENTENDIDO`

    const result = await model.generateContent(prompt)
    const respuesta = result.response.text().trim()

    return {
      intencion: this.parseIntencion(respuesta),
      confianza: 0.78,
      proveedor: 'gemini',
    }
  }

  async validarConfig(): Promise<boolean> {
    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' })
      await model.generateContent('test')
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
