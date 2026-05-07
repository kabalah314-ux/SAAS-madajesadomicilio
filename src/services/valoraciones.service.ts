import { supabase } from '../lib/supabase';

export async function listValoracionesMasajista(masajistaId: string) {
  const { data, error } = await supabase
    .from('valoraciones')
    .select('*, clientes(profiles(full_name))')
    .eq('masajista_id', masajistaId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function crearValoracion(input: {
  reserva_id: string;
  cliente_id: string;
  masajista_id: string;
  puntuacion: number;
  comentario?: string;
}) {
  const { data, error } = await supabase
    .from('valoraciones')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}
