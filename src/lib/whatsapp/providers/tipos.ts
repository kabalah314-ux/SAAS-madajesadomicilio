// Tipos para proveedores de IA pluggables

export type ProveedorIA = 'anthropic' | 'openai' | 'gemini' | 'local'

export interface ClasificacionResult {
  intencion: string
  confianza: number
  proveedor: ProveedorIA
}

export interface ConfigProveedorIA {
  proveedor: ProveedorIA
  apiKey: string
  modelo?: string
  baseUrl?: string // Para local
}

export interface ProveedorIAInterface {
  nombre: ProveedorIA
  clasificar(mensaje: string, contexto: string): Promise<ClasificacionResult>
  validarConfig(): Promise<boolean>
}
