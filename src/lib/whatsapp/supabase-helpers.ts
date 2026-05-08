// Helper functions para manejar datos de WhatsApp en Supabase
import { createClient } from '@supabase/supabase-js';
import type { ConversacionWhatsApp, MensajeWhatsApp, EstadoFlujo } from '@/types/whatsapp';

// Cliente Supabase con service_role key (bypasea RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Obtiene o crea una conversación de WhatsApp
 */
export async function getOrCreateConversacion(
  numeroWhatsapp: string
): Promise<ConversacionWhatsApp> {
  // Buscar conversación existente
  const { data: existente, error: errorBuscar } = await supabaseAdmin
    .from('conversaciones_whatsapp')
    .select('*')
    .eq('numero_whatsapp', numeroWhatsapp)
    .single();

  if (existente && !errorBuscar) {
    return existente as ConversacionWhatsApp;
  }

  // Crear nueva conversación
  const { data: nueva, error: errorCrear } = await supabaseAdmin
    .from('conversaciones_whatsapp')
    .insert({
      numero_whatsapp: numeroWhatsapp,
      estado_flujo: 'INICIO',
      paso_actual: 0,
      datos_temporales: {},
      intentos_no_entendido: 0,
      requiere_humano: false,
    })
    .select()
    .single();

  if (errorCrear || !nueva) {
    throw new Error(`Error creando conversación: ${errorCrear?.message}`);
  }

  return nueva as ConversacionWhatsApp;
}

/**
 * Actualiza el estado de una conversación
 */
export async function actualizarConversacion(
  conversacionId: string,
  updates: Partial<ConversacionWhatsApp>
): Promise<ConversacionWhatsApp> {
  const { data, error } = await supabaseAdmin
    .from('conversaciones_whatsapp')
    .update(updates)
    .eq('id', conversacionId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Error actualizando conversación: ${error?.message}`);
  }

  return data as ConversacionWhatsApp;
}

/**
 * Resetea el estado de una conversación al INICIO
 */
export async function resetearConversacion(conversacionId: string): Promise<void> {
  await supabaseAdmin
    .from('conversaciones_whatsapp')
    .update({
      estado_flujo: 'INICIO',
      paso_actual: 0,
      datos_temporales: {},
      intentos_no_entendido: 0,
    })
    .eq('id', conversacionId);
}

/**
 * Guarda un mensaje en el historial
 */
export async function guardarMensaje(
  conversacionId: string,
  tipo: 'entrante' | 'saliente',
  contenido: string,
  intencion?: string,
  confianza?: number,
  error?: string
): Promise<void> {
  await supabaseAdmin.from('mensajes_whatsapp').insert({
    conversacion_id: conversacionId,
    tipo,
    contenido,
    intencion_detectada: intencion || null,
    confianza: confianza || null,
    error_processing: error || null,
  });
}

/**
 * Obtiene configuración de WhatsApp por clave
 */
export async function getConfiguracion(clave: string): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from('configuracion_whatsapp')
    .select('valor')
    .eq('clave', clave)
    .single();

  if (error || !data) {
    console.error(`Error obteniendo configuración ${clave}:`, error);
    return null;
  }

  return data.valor;
}

/**
 * Obtiene todos los servicios disponibles
 */
export async function getServicios() {
  const { data, error } = await supabaseAdmin
    .from('servicios')
    .select('*')
    .eq('is_active', true)
    .order('orden');

  if (error) {
    throw new Error(`Error obteniendo servicios: ${error.message}`);
  }

  return data || [];
}

/**
 * Busca masajistas disponibles para una fecha/hora
 */
export async function buscarMasajistaDisponible(
  fecha: string,
  hora: string
): Promise<any | null> {
  // Simplificado: busca masajistas activas y verificadas
  // En producción debería consultar tabla de disponibilidad
  const { data, error } = await supabaseAdmin
    .from('masajistas')
    .select('id, profiles!inner(full_name, avatar_url)')
    .eq('is_verified', true)
    .eq('is_suspended', false)
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0];
}

/**
 * Crea una reserva en la base de datos
 */
export async function crearReserva(datos: {
  cliente_id: string;
  servicio_id: string;
  masajista_id: string | null;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  direccion_servicio: string;
  ciudad: string;
  codigo_postal?: string;
  precio_total: number;
  comision_pct: number;
}): Promise<any> {
  const comision_monto = (datos.precio_total * datos.comision_pct) / 100;
  const pago_masajista = datos.precio_total - comision_monto;

  const { data, error } = await supabaseAdmin
    .from('reservas')
    .insert({
      cliente_id: datos.cliente_id,
      servicio_id: datos.servicio_id,
      masajista_id: datos.masajista_id,
      fecha: datos.fecha,
      hora_inicio: datos.hora_inicio,
      duracion_min: datos.duracion_min,
      direccion_servicio: datos.direccion_servicio,
      ciudad: datos.ciudad,
      codigo_postal: datos.codigo_postal || null,
      estado: datos.masajista_id ? 'aceptada' : 'pendiente',
      precio_total: datos.precio_total,
      comision_pct: datos.comision_pct,
      comision_monto,
      pago_masajista,
      pago_estado: 'pendiente',
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Error creando reserva: ${error?.message}`);
  }

  return data;
}

/**
 * Obtiene reservas activas de un cliente por su número de WhatsApp
 */
export async function getReservasActivas(numeroWhatsapp: string): Promise<any[]> {
  // Primero obtener la conversación para sacar el cliente_id
  const { data: conversacion } = await supabaseAdmin
    .from('conversaciones_whatsapp')
    .select('cliente_id')
    .eq('numero_whatsapp', numeroWhatsapp)
    .single();

  if (!conversacion?.cliente_id) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('reservas')
    .select('*, servicio:servicios(nombre), masajista:masajistas(id, profiles!inner(full_name))')
    .eq('cliente_id', conversacion.cliente_id)
    .in('estado', ['pendiente', 'aceptada'])
    .order('fecha', { ascending: true });

  if (error) {
    console.error('Error obteniendo reservas:', error);
    return [];
  }

  return data || [];
}

/**
 * Cancela una reserva
 */
export async function cancelarReserva(reservaId: string, motivo: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('reservas')
    .update({
      estado: 'cancelada',
      cancelacion_motivo: motivo,
    })
    .eq('id', reservaId);

  if (error) {
    throw new Error(`Error cancelando reserva: ${error.message}`);
  }
}

/**
 * Obtiene o crea un cliente por número de WhatsApp
 */
export async function getOrCreateCliente(numeroWhatsapp: string, nombre?: string): Promise<string> {
  // Buscar conversación existente con cliente_id
  const { data: conversacion } = await supabaseAdmin
    .from('conversaciones_whatsapp')
    .select('cliente_id')
    .eq('numero_whatsapp', numeroWhatsapp)
    .single();

  if (conversacion?.cliente_id) {
    return conversacion.cliente_id;
  }

  // Crear nuevo cliente
  // Primero crear en auth.users (simplificado para WhatsApp)
  const email = `whatsapp_${numeroWhatsapp}@massflow.temp`;

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: nombre || `Cliente ${numeroWhatsapp.slice(-4)}`,
      role: 'cliente',
      phone: numeroWhatsapp,
    },
  });

  if (authError || !authUser.user) {
    throw new Error(`Error creando usuario: ${authError?.message}`);
  }

  // El trigger handle_new_user creará automáticamente el profile y cliente
  // Esperar un momento para que se complete
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Actualizar la conversación con el cliente_id
  await supabaseAdmin
    .from('conversaciones_whatsapp')
    .update({ cliente_id: authUser.user.id })
    .eq('numero_whatsapp', numeroWhatsapp);

  return authUser.user.id;
}
