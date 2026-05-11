import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type Reserva = Database['public']['Tables']['reservas']['Row']
type PagoStripe = Database['public']['Tables']['pagos_stripe']['Row']
type Transferencia = Database['public']['Tables']['transferencias']['Row']

/**
 * Create a payment intent for a reservation
 */
export async function crearPaymentIntent(reservaId: string) {
  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: { reserva_id: reservaId },
  })

  if (error) throw error
  return data as { clientSecret: string; paymentIntentId: string }
}

/**
 * Get payment status for a reservation
 */
export async function obtenerEstadoPago(reservaId: string) {
  const { data, error } = await supabase
    .from('pagos_stripe')
    .select('*')
    .eq('reserva_id', reservaId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as PagoStripe | null
}

/**
 * Get masajista's payment history
 */
export async function obtenerHistorialPagosMasajista(masajistaId: string) {
  const { data, error } = await supabase
    .from('transferencias')
    .select('*')
    .eq('masajista_id', masajistaId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Transferencia[]
}

/**
 * Get pending earnings for a masajista (not yet transferred)
 */
export async function obtenerGananciasNoTransferidas(masajistaId: string) {
  const { data, error } = await supabase
    .rpc('get_masajista_pending_earnings', { masajista_id: masajistaId })

  if (error) throw error
  return data as { total_sesiones: number; monto_total: number } | null
}

/**
 * Start Stripe Connect onboarding for masajista
 */
export async function iniciarOnboardingStripeConnect() {
  const { data, error } = await supabase.functions.invoke(
    'stripe-connect-onboarding',
    { method: 'POST' }
  )

  if (error) throw error
  return data as { onboarding_url: string; account_id: string }
}

/**
 * Check if masajista completed onboarding
 */
export async function verificarOnboardingCompleto(masajistaId: string) {
  const { data, error } = await supabase
    .from('masajistas')
    .select('stripe_account_id')
    .eq('id', masajistaId)
    .single()

  if (error) throw error
  return !!data?.stripe_account_id
}

/**
 * Process monthly payouts for a cycle (admin only)
 */
export async function procesarPagosDelCiclo(cicloId: string) {
  const { data, error } = await supabase.functions.invoke(
    'process-masajista-payouts',
    { body: { ciclo_id: cicloId } }
  )

  if (error) throw error
  return data as {
    ciclo_id: string
    total_masajistas: number
    resultados: Array<{
      masajista_id: string
      estado: string
      monto?: number
      sesiones?: number
    }>
  }
}

/**
 * Get all payment cycles
 */
export async function obtenerCiclosPago() {
  const { data, error } = await supabase
    .from('ciclos_pago')
    .select('*')
    .order('fecha_inicio', { ascending: false })

  if (error) throw error
  return data as Array<Database['public']['Tables']['ciclos_pago']['Row']>
}

/**
 * Create a new payment cycle (admin only)
 */
export async function crearCicloPago(fechaInicio: string, fechaFin: string) {
  const { data, error } = await supabase
    .from('ciclos_pago')
    .insert({
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      is_closed: false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get payment dashboard metrics (admin only)
 */
export async function obtenerMetricasPagos() {
  const { data: pagados } = await supabase
    .from('pagos_stripe')
    .select('monto_eur')
    .eq('estado', 'pagado')

  const { data: transferidos } = await supabase
    .from('transferencias')
    .select('monto_eur')
    .eq('estado', 'confirmada')

  const totalRecaudado = (pagados || []).reduce(
    (sum, p) => sum + Number(p.monto_eur || 0),
    0
  )

  const totalTransferido = (transferidos || []).reduce(
    (sum, t) => sum + Number(t.monto_eur || 0),
    0
  )

  return {
    total_recaudado: totalRecaudado,
    total_transferido: totalTransferido,
    comisiones_retenidas: totalRecaudado - totalTransferido,
    pagos_procesados: pagados?.length || 0,
    masajistas_pagados: new Set(
      (transferidos || []).map((t) => t.masajista_id)
    ).size,
  }
}
