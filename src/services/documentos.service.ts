import { supabase } from '../lib/supabase';

export async function listDocumentosMasajista(masajistaId: string) {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('masajista_id', masajistaId)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function subirDocumento(masajistaId: string, tipo: string, file: File) {
  const ext = file.name.split('.').pop();
  const path = `${masajistaId}/${tipo}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('documentos')
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('documentos')
    .upsert({
      masajista_id: masajistaId,
      tipo,
      storage_path: path,
      estado: 'pendiente',
    }, { onConflict: 'masajista_id,tipo' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function verificarDocumento(documentoId: string, reviewerId: string) {
  const { error } = await supabase
    .from('documentos')
    .update({
      estado: 'verificado',
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq('id', documentoId);
  if (error) throw error;
}

export async function rechazarDocumento(documentoId: string, reviewerId: string, motivo: string) {
  const { error } = await supabase
    .from('documentos')
    .update({
      estado: 'rechazado',
      rechazo_motivo: motivo,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq('id', documentoId);
  if (error) throw error;
}

export function getDocumentoUrl(storagePath: string) {
  const { data } = supabase.storage
    .from('documentos')
    .getPublicUrl(storagePath);
  return data.publicUrl;
}
