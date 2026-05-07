import { supabase } from '../lib/supabase';

export async function listReservasCliente(clienteId: string) {
  const { data, error } = await supabase
    .from('reservas')
    .select('*, servicios(*)')
    .eq('cliente_id', clienteId)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data;
}

export async function listReservasMasajista(masajistaId: string) {
  const { data, error } = await supabase
    .from('reservas')
    .select('*, servicios(*), clientes(id, profiles(full_name, phone))')
    .eq('masajista_id', masajistaId)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data;
}

export async function listAllReservas() {
  const { data, error } = await supabase
    .from('reservas')
    .select('*, servicios(*), clientes(id, profiles(full_name)), masajistas(id, profiles(full_name))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function crearReserva(input: {
  cliente_id: string;
  servicio_id: string;
  masajista_id?: string;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  direccion_servicio: string;
  ciudad: string;
  codigo_postal?: string;
  notas_cliente?: string;
  precio_total: number;
}) {
  const { data: cfg } = await supabase
    .from('configuracion')
    .select('valor')
    .eq('clave', 'comision_pct')
    .single();
  const comision_pct = Number(cfg?.valor ?? 25);
  const comision_monto = +(input.precio_total * comision_pct / 100).toFixed(2);
  const pago_masajista = +(input.precio_total - comision_monto).toFixed(2);

  const { data, error } = await supabase
    .from('reservas')
    .insert({
      ...input,
      comision_pct,
      comision_monto,
      pago_masajista,
      estado: 'pendiente',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function aceptarReserva(id: string) {
  const { error } = await supabase
    .from('reservas')
    .update({ estado: 'aceptada', aceptada_en: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function rechazarReserva(id: string, motivo: string) {
  const { error } = await supabase
    .from('reservas')
    .update({ estado: 'rechazada', rechazo_motivo: motivo })
    .eq('id', id);
  if (error) throw error;
}

export async function cancelarReserva(id: string, motivo: string, userId: string) {
  const { error } = await supabase
    .from('reservas')
    .update({ estado: 'cancelada', cancelacion_motivo: motivo, cancelado_por: userId })
    .eq('id', id);
  if (error) throw error;
}

export async function completarReserva(id: string) {
  const { error } = await supabase
    .from('reservas')
    .update({ estado: 'completada', completada_en: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function asignarMasajista(reservaId: string, masajistaId: string) {
  const { error } = await supabase
    .from('reservas')
    .update({ masajista_id: masajistaId, estado: 'aceptada', aceptada_en: new Date().toISOString() })
    .eq('id', reservaId);
  if (error) throw error;
}
