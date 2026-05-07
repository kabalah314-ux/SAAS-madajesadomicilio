import { supabase } from '../lib/supabase';

export async function listClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('*, profiles(full_name, email, phone, avatar_url, is_active)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getCliente(id: string) {
  const { data, error } = await supabase
    .from('clientes')
    .select('*, profiles(full_name, email, phone, avatar_url, is_active)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateCliente(id: string, input: {
  direccion?: string;
  ciudad?: string;
  codigo_postal?: string;
  preferencias?: Record<string, any>;
  is_blocked?: boolean;
  block_reason?: string;
  internal_notes?: string;
}) {
  const { data, error } = await supabase
    .from('clientes')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function bloquearCliente(id: string, reason: string) {
  const { error } = await supabase
    .from('clientes')
    .update({ is_blocked: true, block_reason: reason })
    .eq('id', id);
  if (error) throw error;
}

export async function desbloquearCliente(id: string) {
  const { error } = await supabase
    .from('clientes')
    .update({ is_blocked: false, block_reason: null })
    .eq('id', id);
  if (error) throw error;
}
