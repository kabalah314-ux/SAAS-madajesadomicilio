import { supabase } from '../lib/supabase';

export async function getProfile(id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(id: string, input: {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}) {
  const { data, error } = await supabase
    .from('profiles')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadAvatar(userId: string, file: File) {
  const ext = file.name.split('.').pop();
  const path = `${userId}/profile.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(path);

  await updateProfile(userId, { avatar_url: urlData.publicUrl });
  return urlData.publicUrl;
}
