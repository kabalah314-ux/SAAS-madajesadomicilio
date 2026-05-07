import { supabase } from '../lib/supabase';

export async function listNotificaciones(userId: string) {
  const { data, error } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function marcarLeida(id: string) {
  const { error } = await supabase
    .from('notificaciones')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function marcarTodasLeidas(userId: string) {
  const { error } = await supabase
    .from('notificaciones')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
}

export async function countUnread(userId: string) {
  const { count, error } = await supabase
    .from('notificaciones')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
  return count ?? 0;
}

export function subscribeNotificaciones(userId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`notif-${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notificaciones',
      filter: `user_id=eq.${userId}`,
    }, callback)
    .subscribe();
}
