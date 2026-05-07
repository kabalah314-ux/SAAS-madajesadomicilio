import { supabase } from '../lib/supabase';

export async function getConfiguracion() {
  const { data, error } = await supabase
    .from('configuracion')
    .select('*');
  if (error) throw error;
  const config: Record<string, any> = {};
  data.forEach((row: any) => {
    config[row.clave] = row.valor;
  });
  return config;
}

export async function updateConfiguracion(clave: string, valor: any, updatedBy: string) {
  const { error } = await supabase
    .from('configuracion')
    .update({ valor: JSON.stringify(valor), updated_by: updatedBy })
    .eq('clave', clave);
  if (error) throw error;
}

export async function getAdminKpis() {
  const { data, error } = await supabase
    .from('v_admin_kpis')
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
