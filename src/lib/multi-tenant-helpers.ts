// Helpers para operaciones multi-tenant

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// ============ EMPRESAS ============

/**
 * Crear nueva empresa (nuevo cliente del SaaS)
 */
export async function crearEmpresa(datos: {
  nombre: string
  email: string
  telefono?: string
  plan?: string
  proveedor_ia?: string
  api_key_ia: string
}) {
  const { data, error } = await supabaseAdmin
    .from('empresas')
    .insert({
      nombre: datos.nombre,
      email: datos.email,
      telefono: datos.telefono,
      plan: datos.plan || 'starter',
      proveedor_ia: datos.proveedor_ia || 'openai',
      api_key_ia: datos.api_key_ia,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Obtener empresa por ID
 */
export async function obtenerEmpresa(empresaId: string) {
  const { data, error } = await supabaseAdmin
    .from('empresas')
    .select('*')
    .eq('id', empresaId)
    .single()

  if (error) throw error
  return data
}

// ============ USUARIOS ============

/**
 * Registrar nuevo usuario en una empresa
 */
export async function registrarUsuarioEnEmpresa(datos: {
  empresaId: string
  email: string
  password: string
  nombre: string
  rol: 'admin' | 'masajista' | 'cliente'
}) {
  // 1. Crear en auth.users
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: datos.email,
    password: datos.password,
    email_confirm: true,
    user_metadata: {
      empresa_id: datos.empresaId,
      rol: datos.rol,
      nombre: datos.nombre,
    },
  })

  if (authError) throw authError

  // 2. Crear en tabla users (con empresa_id)
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      id: authUser.user!.id,
      empresa_id: datos.empresaId,
      email: datos.email,
      nombre: datos.nombre,
      rol: datos.rol,
    })
    .select()
    .single()

  if (userError) throw userError

  // 3. Crear profile
  await supabaseAdmin.from('profiles').insert({
    id: authUser.user!.id,
    empresa_id: datos.empresaId,
  })

  // 4. Si es masajista, crear entrada en masajistas
  if (datos.rol === 'masajista') {
    await supabaseAdmin.from('masajistas').insert({
      id: authUser.user!.id,
      empresa_id: datos.empresaId,
    })
  }

  // 5. Si es cliente, crear entrada en clientes
  if (datos.rol === 'cliente') {
    await supabaseAdmin.from('clientes').insert({
      id: authUser.user!.id,
      empresa_id: datos.empresaId,
    })
  }

  return user
}

/**
 * Obtener usuarios de una empresa
 */
export async function obtenerUsuariosEmpresa(empresaId: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('empresa_id', empresaId)

  if (error) throw error
  return data
}

/**
 * Obtener masajistas de una empresa
 */
export async function obtenerMasajistasEmpresa(empresaId: string) {
  const { data, error } = await supabaseAdmin
    .from('masajistas')
    .select('*, profiles:profiles(*)')
    .eq('empresa_id', empresaId)

  if (error) throw error
  return data
}

/**
 * Obtener clientes de una empresa
 */
export async function obtenerClientesEmpresa(empresaId: string) {
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .select('*, profiles:profiles(*)')
    .eq('empresa_id', empresaId)

  if (error) throw error
  return data
}

// ============ SERVICIOS ============

/**
 * Crear servicio en una empresa
 */
export async function crearServicioEnEmpresa(datos: {
  empresaId: string
  nombre: string
  descripcion?: string
  duracion_min: number
  precio_eur: number
}) {
  const { data, error } = await supabaseAdmin
    .from('servicios')
    .insert({
      empresa_id: datos.empresaId,
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      duracion_min: datos.duracion_min,
      precio_eur: datos.precio_eur,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Obtener servicios de una empresa
 */
export async function obtenerServiciosEmpresa(empresaId: string) {
  const { data, error } = await supabaseAdmin
    .from('servicios')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('is_active', true)
    .order('orden')

  if (error) throw error
  return data
}

// ============ RESERVAS ============

/**
 * Crear reserva en una empresa
 */
export async function crearReservaEnEmpresa(datos: {
  empresaId: string
  clienteId: string
  servicioId: string
  masajistaId?: string
  fecha: string
  hora_inicio: string
  duracion_min: number
  direccion_servicio: string
  ciudad: string
  precio_total: number
}) {
  const comision_pct = 25
  const comision_monto = (datos.precio_total * comision_pct) / 100
  const pago_masajista = datos.precio_total - comision_monto

  const { data, error } = await supabaseAdmin
    .from('reservas')
    .insert({
      empresa_id: datos.empresaId,
      cliente_id: datos.clienteId,
      servicio_id: datos.servicioId,
      masajista_id: datos.masajistaId,
      fecha: datos.fecha,
      hora_inicio: datos.hora_inicio,
      duracion_min: datos.duracion_min,
      direccion_servicio: datos.direccion_servicio,
      ciudad: datos.ciudad,
      estado: 'pendiente',
      precio_total: datos.precio_total,
      comision_pct,
      comision_monto,
      pago_masajista,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Obtener reservas de una empresa
 */
export async function obtenerReservasEmpresa(empresaId: string) {
  const { data, error } = await supabaseAdmin
    .from('reservas')
    .select('*, cliente:clientes(*), masajista:masajistas(*), servicio:servicios(*)')
    .eq('empresa_id', empresaId)
    .order('fecha', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Obtener reservas de un cliente en una empresa
 */
export async function obtenerReservasCliente(empresaId: string, clienteId: string) {
  const { data, error } = await supabaseAdmin
    .from('reservas')
    .select('*, masajista:masajistas(*), servicio:servicios(*)')
    .eq('empresa_id', empresaId)
    .eq('cliente_id', clienteId)
    .order('fecha', { ascending: false })

  if (error) throw error
  return data
}

// ============ WHATSAPP ============

/**
 * Obtener conversación WhatsApp de una empresa
 */
export async function obtenerConversacionWhatsApp(
  empresaId: string,
  numeroWhatsapp: string
) {
  const { data, error } = await supabaseAdmin
    .from('conversaciones_whatsapp')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('numero_whatsapp', numeroWhatsapp)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return data
}

/**
 * Obtener todas las conversaciones de una empresa
 */
export async function obtenerConversacionesEmpresa(empresaId: string) {
  const { data, error } = await supabaseAdmin
    .from('conversaciones_whatsapp')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('ultima_interaccion', { ascending: false })

  if (error) throw error
  return data
}

// ============ FACTURACIÓN ============

/**
 * Obtener resumen de uso de IA de una empresa
 */
export async function obtenerUsoIAEmpresa(
  empresaId: string,
  diasUltimos: number = 30
) {
  const fechaInicio = new Date()
  fechaInicio.setDate(fechaInicio.getDate() - diasUltimos)

  const { data, error } = await supabaseAdmin
    .from('uso_ia_registro')
    .select('proveedor, tokens_aproximados')
    .eq('empresa_id', empresaId)
    .gte('timestamp', fechaInicio.toISOString())

  if (error) throw error

  // Agrupar por proveedor
  const resumen = (data || []).reduce(
    (acc: any, registro: any) => {
      if (!acc[registro.proveedor]) {
        acc[registro.proveedor] = { llamadas: 0, tokens: 0 }
      }
      acc[registro.proveedor].llamadas++
      acc[registro.proveedor].tokens += registro.tokens_aproximados || 0
      return acc
    },
    {}
  )

  return resumen
}

/**
 * Registrar uso de IA
 */
export async function registrarUsoIA(
  empresaId: string,
  proveedor: string,
  tokens: number
) {
  await supabaseAdmin.from('uso_ia_registro').insert({
    empresa_id: empresaId,
    proveedor,
    tokens_aproximados: tokens,
  })
}

// ============ VALIDACIONES ============

/**
 * Verificar que un usuario pertenece a una empresa
 */
export async function verificarUsuarioEnEmpresa(userId: string, empresaId: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('empresa_id')
    .eq('id', userId)
    .single()

  if (error) return false
  return data?.empresa_id === empresaId
}
