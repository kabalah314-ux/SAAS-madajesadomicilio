import { supabase } from '../lib/supabase';

export async function listTransferenciasMasajista(masajistaId: string) {
  const { data, error } = await supabase
    .from('transferencias')
    .select('*, ciclos_pago(*)')
    .eq('masajista_id', masajistaId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function listAllTransferencias() {
  const { data, error } = await supabase
    .from('transferencias')
    .select('*, ciclos_pago(*), masajistas(id, profiles(full_name))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createCicloPago(fechaInicio: string, fechaFin: string) {
  const { data, error } = await supabase
    .from('ciclos_pago')
    .insert({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createTransferencia(input: {
  ciclo_id: string;
  masajista_id: string;
  monto_eur: number;
  num_sesiones: number;
  referencia?: string;
}) {
  const { data, error } = await supabase
    .from('transferencias')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function marcarTransferenciaEnviada(id: string) {
  const { error } = await supabase
    .from('transferencias')
    .update({ estado: 'enviada', enviada_en: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function confirmarTransferencia(id: string) {
  const { error } = await supabase
    .from('transferencias')
    .update({ estado: 'confirmada', confirmada_en: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
