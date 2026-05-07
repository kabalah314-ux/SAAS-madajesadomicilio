import { supabase } from '../lib/supabase';

export async function listDisponibilidad(masajistaId: string) {
  const { data, error } = await supabase
    .from('disponibilidad')
    .select('*')
    .eq('masajista_id', masajistaId)
    .eq('is_active', true)
    .order('dia_semana')
    .order('hora_inicio');
  if (error) throw error;
  return data;
}

export async function createSlot(input: {
  masajista_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}) {
  const { data, error } = await supabase
    .from('disponibilidad')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSlot(id: string) {
  const { error } = await supabase
    .from('disponibilidad')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}

export async function updateSlot(id: string, input: {
  hora_inicio?: string;
  hora_fin?: string;
  is_active?: boolean;
}) {
  const { data, error } = await supabase
    .from('disponibilidad')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
