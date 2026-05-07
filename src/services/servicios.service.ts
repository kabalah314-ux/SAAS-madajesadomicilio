import { supabase } from '../lib/supabase';

export async function listServicios() {
  const { data, error } = await supabase
    .from('servicios')
    .select('*')
    .eq('is_active', true)
    .order('orden');
  if (error) throw error;
  return data;
}

export async function getServicio(id: string) {
  const { data, error } = await supabase
    .from('servicios')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createServicio(input: {
  nombre: string;
  descripcion?: string;
  duracion_min: number;
  precio_eur: number;
  orden?: number;
}) {
  const { data, error } = await supabase
    .from('servicios')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateServicio(id: string, input: {
  nombre?: string;
  descripcion?: string;
  duracion_min?: number;
  precio_eur?: number;
  is_active?: boolean;
  orden?: number;
}) {
  const { data, error } = await supabase
    .from('servicios')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteServicio(id: string) {
  const { error } = await supabase
    .from('servicios')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}
