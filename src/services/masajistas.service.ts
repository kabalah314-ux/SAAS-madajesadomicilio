import { supabase } from '../lib/supabase';

export async function listMasajistas() {
  const { data, error } = await supabase
    .from('masajistas')
    .select('*, profiles(full_name, email, phone, avatar_url, is_active)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getMasajista(id: string) {
  const { data, error } = await supabase
    .from('masajistas')
    .select('*, profiles(full_name, email, phone, avatar_url, is_active)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateMasajista(id: string, input: {
  bio?: string;
  especialidades?: string[];
  zonas_cobertura?: string[];
  anos_experiencia?: number;
  iban?: string;
  is_verified?: boolean;
  is_suspended?: boolean;
  suspension_reason?: string;
}) {
  const { data, error } = await supabase
    .from('masajistas')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listMasajistasActivas() {
  const { data, error } = await supabase
    .from('masajistas')
    .select('*, profiles(full_name, email, phone, avatar_url)')
    .eq('is_verified', true)
    .eq('is_suspended', false);
  if (error) throw error;
  return data;
}

export async function verificarMasajista(id: string) {
  const { error } = await supabase
    .from('masajistas')
    .update({ is_verified: true })
    .eq('id', id);
  if (error) throw error;
}

export async function suspenderMasajista(id: string, reason: string) {
  const { error } = await supabase
    .from('masajistas')
    .update({ is_suspended: true, suspension_reason: reason })
    .eq('id', id);
  if (error) throw error;
}
