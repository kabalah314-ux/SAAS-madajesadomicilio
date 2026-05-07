import { supabase } from '../lib/supabase';

async function callEdgeFunction(name: string, body: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No authenticated');

  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  if (error) throw error;
  return data;
}

export async function adminCreateUser(input: {
  email: string;
  password: string;
  full_name: string;
  role: 'cliente' | 'masajista' | 'admin';
  phone?: string;
}) {
  return callEdgeFunction('admin-actions', {
    action: 'create_user',
    payload: input,
  });
}

export async function adminDeleteUser(userId: string) {
  return callEdgeFunction('admin-actions', {
    action: 'delete_user',
    payload: { user_id: userId },
  });
}

export async function adminUpdateRole(userId: string, newRole: 'cliente' | 'masajista' | 'admin') {
  return callEdgeFunction('admin-actions', {
    action: 'update_role',
    payload: { user_id: userId, new_role: newRole },
  });
}

export async function adminCloseCiclo(fechaInicio: string, fechaFin: string) {
  return callEdgeFunction('admin-actions', {
    action: 'close_ciclo',
    payload: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
  });
}

export async function expireReservas() {
  return callEdgeFunction('expire-reservas', {});
}
