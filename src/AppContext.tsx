import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AppContextType,
  User,
  Masajista,
  Clienta,
  Servicio,
  Reserva,
  Valoracion,
  Transferencia,
  Notificacion,
  Configuracion,
  Documento
} from './types';
import { useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabase';

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { profile, loading: authLoading, signOut } = useAuth();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [masajistas, setMasajistas] = useState<Masajista[]>([]);
  const [clientas, setClientas] = useState<Clienta[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [valoraciones, setValoraciones] = useState<Valoracion[]>([]);
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [configuracion, setConfiguracion] = useState<Configuracion>({
    comision_plataforma_pct: 25,
    pago_masajista_pct: 75,
    precio_maximo_sesion: 200,
    ciclo_pago: 'quincenal',
    presupuesto_meta_ads_pct: 10,
    moneda: 'EUR'
  });
  const [darkMode, setDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState<string>('inicio');

  // Navegación interna por estado (no hay router de URL).
  const navigate = (view: string) => setCurrentView(view);

  // Map Supabase profile to legacy User type
  useEffect(() => {
    if (profile) {
      const mappedRole = profile.role === 'cliente' ? 'clienta' : profile.role;
      const nameParts = profile.full_name.split(' ');
      const mapped: User = {
        id: profile.id,
        email: profile.email,
        pin: '',
        role: mappedRole as User['role'],
        nombre: nameParts[0] || profile.full_name,
        apellidos: nameParts.slice(1).join(' ') || undefined,
        telefono: profile.phone || undefined,
        foto: profile.avatar_url || undefined,
        activo: profile.is_active,
      };
      setCurrentUser(mapped);
      // Vista inicial según el rol.
      setCurrentView(mappedRole === 'admin' ? 'dashboard' : mappedRole === 'masajista' ? 'calendario' : 'inicio');
    } else if (!authLoading) {
      setCurrentUser(null);
    }
  }, [profile, authLoading]);

  // Load data from Supabase when user changes
  useEffect(() => {
    if (!currentUser) return;
    loadServicios();
    loadNotificaciones();

    if (currentUser.role === 'admin') {
      loadAllMasajistas();
      loadAllClientas();
      loadAllReservas();
      loadAllTransferencias();
      loadConfiguracion();
    } else if (currentUser.role === 'masajista') {
      loadMiPerfilMasajista(currentUser.id);
      loadReservasMasajista(currentUser.id);
      loadTransferenciasMasajista(currentUser.id);
    } else if (currentUser.role === 'clienta') {
      loadMiPerfilClienta(currentUser.id);
      loadReservasCliente(currentUser.id);
      loadMasajistasPublicas();
    }
  }, [currentUser?.id, currentUser?.role]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel(`notif-${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones',
        filter: `user_id=eq.${currentUser.id}`,
      }, (payload) => {
        const n = payload.new as any;
        setNotificaciones(prev => [{
          id: n.id,
          usuario_id: n.user_id,
          tipo: n.tipo,
          titulo: n.titulo,
          mensaje: n.mensaje,
          leida: n.is_read,
          fecha: n.created_at,
        }, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  async function loadServicios() {
    // Sin filtro is_active: el admin ve todos; a los no-admin la RLS solo les deja los activos.
    const { data } = await supabase.from('servicios').select('*').order('orden');
    if (data) {
      setServicios(data.map(s => ({
        id: s.id,
        nombre: s.nombre,
        tipo: s.nombre.split(' ')[1] || s.nombre,
        duracion_minutos: s.duracion_min,
        precio: Number(s.precio_eur),
        descripcion: s.descripcion || '',
        emoji: getServiceEmoji(s.nombre),
        activo: s.is_active,
      })));
    }
  }

  async function loadNotificaciones() {
    if (!currentUser) return;
    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      setNotificaciones(data.map(n => ({
        id: n.id,
        usuario_id: n.user_id,
        tipo: n.tipo,
        titulo: n.titulo,
        mensaje: n.mensaje,
        leida: n.is_read,
        fecha: n.created_at,
      })));
    }
  }

  async function loadAllMasajistas() {
    const { data } = await supabase
      .from('masajistas')
      .select('*, profiles(full_name, email, phone, avatar_url, is_active), documentos(*)');
    if (data) {
      setMasajistas(data.map(m => mapMasajista(m)));
    }
  }

  async function loadAllClientas() {
    const { data } = await supabase
      .from('clientes')
      .select('*, profiles(full_name, email, phone, avatar_url, is_active)');
    if (data) {
      setClientas(data.map(c => mapClienta(c)));
    }
  }

  async function loadAllReservas() {
    const { data } = await supabase
      .from('reservas')
      .select('*, servicios(nombre), valoraciones(*)')
      .order('created_at', { ascending: false });
    if (data) {
      setReservas(data.map(r => mapReserva(r)));
    }
  }

  async function loadReservasMasajista(masajistaId: string) {
    // Perfil de la masajista para filtrar solicitudes por zona/especialidad.
    const { data: perfil } = await supabase
      .from('masajistas')
      .select('zonas_cobertura, especialidades')
      .eq('id', masajistaId)
      .single();
    const zonas = (perfil?.zonas_cobertura || []).map((z: string) => z.toLowerCase().trim()).filter(Boolean);
    const esp = (perfil?.especialidades || []).map((e: string) => e.toLowerCase().trim()).filter(Boolean);

    // 1) Reservas asignadas a esta masajista (cualquier estado) → calendario, historial, cobros.
    //    Embebemos el contacto del cliente (nombre/teléfono) — la RLS solo lo
    //    permite para clientes de SUS reservas asignadas (B4).
    const { data: asignadas } = await supabase
      .from('reservas')
      .select('*, servicios(nombre), valoraciones(*), clientes(profiles(full_name, phone))')
      .eq('masajista_id', masajistaId)
      .order('fecha', { ascending: false });

    // 2) Solicitudes abiertas: reservas pendientes SIN asignar (modelo "la primera que acepta").
    //    Sin esto, la masajista nunca veía solicitudes (bug histórico).
    const { data: abiertas } = await supabase
      .from('reservas')
      .select('*, servicios(nombre), valoraciones(*)')
      .is('masajista_id', null)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });

    // 2b) Filtrar las solicitudes abiertas a las que esta masajista puede servir:
    //     que el servicio encaje con sus especialidades Y la zona con su cobertura.
    //     Si no tiene especialidades/zonas configuradas, no se filtra por ese criterio.
    const matchesPerfil = (r: any): boolean => {
      const servName = (r.servicios?.nombre || '').toLowerCase();
      const matchEsp = esp.length === 0 || esp.some((e: string) => servName.includes(e));
      const loc = `${r.barrio || ''} ${r.ciudad || ''} ${r.direccion_servicio || ''} ${r.codigo_postal || ''}`.toLowerCase();
      const matchZona = zonas.length === 0 || zonas.some((z: string) => loc.includes(z));
      return matchEsp && matchZona;
    };
    const abiertasFiltradas = (abiertas || []).filter(matchesPerfil);

    // Combinar sin duplicados.
    const seen = new Set<string>();
    const merged = [...(asignadas || []), ...abiertasFiltradas].filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
    setReservas(merged.map(r => mapReserva(r)));
  }

  async function loadReservasCliente(clienteId: string) {
    const { data } = await supabase
      .from('reservas')
      .select('*, servicios(nombre), valoraciones(*)')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false });
    if (data) {
      setReservas(data.map(r => mapReserva(r)));
    }
  }

  // Masajistas verificadas y activas, visibles para la clienta al reservar.
  async function loadMasajistasPublicas() {
    const { data } = await supabase
      .from('masajistas')
      .select('*, profiles(full_name, email, phone, avatar_url, is_active)')
      .eq('is_verified', true)
      .eq('is_suspended', false);
    if (data) {
      setMasajistas(data.map(m => mapMasajista(m)));
    }
  }

  // Carga el registro 'masajistas' de la masajista logueada y lo fusiona en currentUser,
  // para que MiPerfil / Documentación / estadísticas dejen de salir vacíos.
  async function loadMiPerfilMasajista(id: string) {
    const { data: m } = await supabase.from('masajistas').select('*').eq('id', id).single();
    const { data: docs } = await supabase.from('documentos').select('*').eq('masajista_id', id);
    if (!m) return;
    const documentos = (docs || []).map(d => mapDocumento(d));
    setCurrentUser(prev => prev ? ({
      ...prev,
      bio: m.bio || undefined,
      especialidades: m.especialidades || [],
      zonas_cobertura: m.zonas_cobertura || [],
      iban: m.iban || undefined,
      documentacion_ok: m.is_verified,
      documentos,
      rating_promedio: Number(m.rating_promedio) || 0,
      total_sesiones: m.total_sesiones || 0,
      valoraciones: [],
    } as User) : prev);
  }

  // Carga la fila 'clientes' de la clienta logueada y la fusiona en currentUser,
  // para que MisDatos precargue dirección y preferencias reales.
  async function loadMiPerfilClienta(id: string) {
    const { data: c } = await supabase.from('clientes').select('*').eq('id', id).single();
    if (!c) return;
    const prefs = (c.preferencias || {}) as any;
    const dh = prefs.direccion_habitual || (c.direccion ? {
      calle: c.direccion, numero: '', piso: '', ciudad: c.ciudad || '', codigo_postal: c.codigo_postal || '', barrio: '', instrucciones_acceso: '',
    } : undefined);
    setCurrentUser(prev => prev ? ({
      ...prev,
      direccion_habitual: dh,
      servicio_favorito: prefs.servicio_favorito || undefined,
      masajista_preferida: prefs.masajista_preferida || undefined,
      notas_especiales: prefs.notas_especiales || undefined,
      intensidad_preferida: prefs.intensidad_preferida || undefined,
      total_sesiones: c.total_reservas || 0,
    } as User) : prev);
  }

  async function loadAllTransferencias() {
    const { data } = await supabase
      .from('transferencias')
      .select('*, ciclos_pago(*)')
      .order('created_at', { ascending: false });
    if (data) {
      setTransferencias(data.map(t => mapTransferencia(t)));
    }
  }

  async function loadTransferenciasMasajista(masajistaId: string) {
    const { data } = await supabase
      .from('transferencias')
      .select('*, ciclos_pago(*)')
      .eq('masajista_id', masajistaId)
      .order('created_at', { ascending: false });
    if (data) {
      setTransferencias(data.map(t => mapTransferencia(t)));
    }
  }

  async function loadConfiguracion() {
    const { data } = await supabase.from('configuracion').select('*');
    if (data) {
      const cfg: any = {};
      data.forEach((row: any) => {
        const val = row.valor;
        if (row.clave === 'comision_pct') cfg.comision_plataforma_pct = Number(val);
        if (row.clave === 'precio_maximo_eur') cfg.precio_maximo_sesion = Number(val);
        if (row.clave === 'moneda') cfg.moneda = String(val).replace(/"/g, '');
        if (row.clave === 'ciclo_pago') cfg.ciclo_pago = String(val).replace(/"/g, '');
        if (row.clave === 'meta_ads_pct') cfg.presupuesto_meta_ads_pct = Number(val);
      });
      cfg.pago_masajista_pct = 100 - (cfg.comision_plataforma_pct ?? 25);
      if (cfg.ciclo_pago === undefined) cfg.ciclo_pago = 'quincenal';
      if (cfg.presupuesto_meta_ads_pct === undefined) cfg.presupuesto_meta_ads_pct = 10;
      setConfiguracion(prev => ({ ...prev, ...cfg }));
    }
  }

  // MAPPERS: DB rows → legacy types
  function mapMasajista(m: any): Masajista {
    const p = m.profiles;
    const nameParts = (p?.full_name || '').split(' ');
    return {
      id: m.id,
      email: p?.email || '',
      pin: '',
      role: 'masajista',
      nombre: nameParts[0] || '',
      apellidos: nameParts.slice(1).join(' ') || '',
      telefono: p?.phone || undefined,
      foto: p?.avatar_url || undefined,
      activo: (p?.is_active ?? true) && !m.is_suspended,
      bio: m.bio || undefined,
      especialidades: m.especialidades || [],
      zonas_cobertura: m.zonas_cobertura || [],
      tarifa_hora: undefined,
      iban: m.iban || undefined,
      documentacion_ok: m.is_verified,
      documentos: (m.documentos || []).map((d: any) => mapDocumento(d)),
      rating_promedio: Number(m.rating_promedio) || 0,
      total_sesiones: m.total_sesiones || 0,
      valoraciones: [],
    };
  }

  function mapClienta(c: any): Clienta {
    const p = c.profiles;
    const nameParts = (p?.full_name || '').split(' ');
    return {
      id: c.id,
      email: p?.email || '',
      pin: '',
      role: 'clienta',
      nombre: nameParts[0] || '',
      apellidos: nameParts.slice(1).join(' ') || '',
      telefono: p?.phone || undefined,
      foto: p?.avatar_url || undefined,
      activo: p?.is_active ?? true,
      direccion_habitual: c.direccion ? { calle: c.direccion, numero: '', ciudad: c.ciudad || '', codigo_postal: c.codigo_postal || '', barrio: '' } : undefined,
      total_sesiones: c.total_reservas || 0,
      gasto_acumulado: 0,
      tipo_cliente: c.total_reservas > 10 ? 'vip' : c.total_reservas > 3 ? 'recurrente' : 'nuevo',
      bloqueada: c.is_blocked,
      motivo_bloqueo: c.block_reason || undefined,
      notas_internas_admin: c.internal_notes || undefined,
    };
  }

  function mapDocumento(d: any): Documento {
    const estadoMap: Record<string, string> = {
      'pendiente': 'pendiente_revision',
      'verificado': 'verificado',
      'rechazado': 'no_subido',
    };
    return {
      id: d.id,
      masajista_id: d.masajista_id,
      tipo: d.tipo,
      nombre: d.tipo,
      url: d.storage_path || undefined,
      estado: (estadoMap[d.estado] || 'no_subido') as any,
      fecha_subida: d.uploaded_at || undefined,
      verificado_por: d.reviewed_by || undefined,
      fecha_verificacion: d.reviewed_at ? String(d.reviewed_at).split('T')[0] : undefined,
    };
  }

  function mapValoracion(v: any): Valoracion {
    return {
      id: v.id,
      reserva_id: v.reserva_id,
      clienta_id: v.cliente_id,
      masajista_id: v.masajista_id,
      estrellas: v.puntuacion,
      comentario: v.comentario || undefined,
      fecha: v.created_at,
    };
  }

  function mapReserva(r: any): Reserva {
    const estadoMap: Record<string, string> = {
      'pendiente': 'pendiente_asignacion',
      'aceptada': 'confirmada',
      'completada': 'completada',
      'rechazada': 'rechazada',
      'cancelada': 'cancelada_clienta',
      'expirada': 'cancelada_clienta',
    };
    const valRow = Array.isArray(r.valoraciones) ? r.valoraciones[0] : r.valoraciones;
    // Contacto del cliente: solo viene embebido cuando la consulta lo pide
    // (reservas asignadas de la masajista). Ver loadReservasMasajista / B4.
    const cliRow = Array.isArray(r.clientes) ? r.clientes[0] : r.clientes;
    const cliProfile = cliRow?.profiles
      ? (Array.isArray(cliRow.profiles) ? cliRow.profiles[0] : cliRow.profiles)
      : undefined;
    return {
      id: r.id,
      codigo: r.codigo,
      clienta_id: r.cliente_id,
      cliente_nombre: cliProfile?.full_name || undefined,
      cliente_telefono: cliProfile?.phone || undefined,
      masajista_id: r.masajista_id || undefined,
      servicio_id: r.servicio_id,
      fecha: r.fecha,
      hora_inicio: r.hora_inicio,
      hora_fin: calcHoraFin(r.hora_inicio, r.duracion_min),
      direccion: {
        calle: r.direccion_servicio || '',
        numero: '',
        ciudad: r.ciudad || '',
        codigo_postal: r.codigo_postal || '',
        barrio: r.barrio || '',
      },
      estado: (estadoMap[r.estado] || r.estado) as any,
      precio_total: Number(r.precio_total),
      pago_masajista: Number(r.pago_masajista),
      notas_clienta: r.notas_cliente || undefined,
      motivo_rechazo: r.rechazo_motivo || undefined,
      valoracion: valRow ? mapValoracion(valRow) : undefined,
      pago_estado: r.pago_estado || undefined,
      creada_en: r.created_at,
    };
  }

  function mapTransferencia(t: any): Transferencia {
    const estadoMap: Record<string, string> = {
      'pendiente': 'pendiente',
      'enviada': 'enviada',
      'confirmada': 'confirmada',
      'fallida': 'error',
    };
    // B3: monto_eur es el NETO que cobra la masajista (precio - comisión). El bruto (valor
    // de las sesiones antes de comisión) no se almacena en la transferencia, así que se
    // reconstruye con la comisión global de configuración. Antes bruto==neto (engañoso).
    const neto = Number(t.monto_eur);
    const comision = configuracion.comision_plataforma_pct;
    const factorNeto = comision > 0 && comision < 100 ? 1 - comision / 100 : 1;
    return {
      id: t.id,
      masajista_id: t.masajista_id,
      periodo_inicio: t.ciclos_pago?.fecha_inicio || '',
      periodo_fin: t.ciclos_pago?.fecha_fin || '',
      sesiones: t.num_sesiones,
      importe_bruto: +(neto / factorNeto).toFixed(2),
      importe_neto: neto,
      estado: (estadoMap[t.estado] || t.estado) as any,
      fecha_transferencia: t.enviada_en || undefined,
      referencia_bancaria: t.referencia || undefined,
      reservas_incluidas: [],
    };
  }

  function calcHoraFin(horaInicio: string, duracionMin: number): string {
    if (!horaInicio) return '';
    const [h, m] = horaInicio.split(':').map(Number);
    const totalMin = h * 60 + m + duracionMin;
    const newH = Math.floor(totalMin / 60) % 24;
    const newM = totalMin % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  }

  function getServiceEmoji(name: string): string {
    if (name.toLowerCase().includes('relajante')) return '🌸';
    if (name.toLowerCase().includes('descontract')) return '💪';
    if (name.toLowerCase().includes('deportivo')) return '⚡';
    if (name.toLowerCase().includes('pareja')) return '💑';
    if (name.toLowerCase().includes('prenatal')) return '🤰';
    if (name.toLowerCase().includes('drenaje')) return '🧘';
    return '💆‍♀️';
  }

  // ACTIONS (write to Supabase + update local state)
  const login = (_email: string, _pin: string): boolean => false;

  const logout = () => {
    signOut();
    setCurrentUser(null);
  };

  const updateMasajista = async (id: string, data: Partial<Masajista>) => {
    const existing = (currentUser?.id === id ? currentUser : masajistas.find(m => m.id === id)) as any || {};

    // Datos personales viven en 'profiles'
    const profileData: any = {};
    if (data.nombre !== undefined || (data as any).apellidos !== undefined) {
      const nom = data.nombre ?? existing.nombre ?? '';
      const ape = (data as any).apellidos ?? existing.apellidos ?? '';
      const full = `${nom} ${ape}`.trim();
      if (full) profileData.full_name = full;
    }
    if (data.telefono !== undefined) profileData.phone = data.telefono || null;
    if (data.foto !== undefined) profileData.avatar_url = data.foto || null;
    if (Object.keys(profileData).length > 0) {
      const { error } = await supabase.from('profiles').update(profileData).eq('id', id);
      if (error) throw error;
    }

    // Datos de la tabla 'masajistas'
    const supaData: any = {};
    if (data.bio !== undefined) supaData.bio = data.bio;
    if (data.especialidades) supaData.especialidades = data.especialidades;
    if (data.zonas_cobertura) supaData.zonas_cobertura = data.zonas_cobertura;
    if (data.iban !== undefined) supaData.iban = data.iban;
    if ((data as any).activo !== undefined) supaData.is_suspended = !(data as any).activo; // suspender/activar
    if (Object.keys(supaData).length > 0) {
      const { error } = await supabase.from('masajistas').update(supaData).eq('id', id);
      if (error) throw error;
    }

    if (currentUser?.id === id) {
      setCurrentUser(p => p ? ({ ...p, ...data } as User) : p);
    }
    setMasajistas(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
  };

  const updateClienta = async (id: string, data: Partial<Clienta>) => {
    const prev = currentUser?.id === id ? (currentUser as any) : (clientas.find(c => c.id === id) as any) || {};

    // 1) Datos personales viven en 'profiles' (full_name, phone)
    const profileData: any = {};
    if (data.nombre !== undefined || data.apellidos !== undefined) {
      const nom = data.nombre ?? prev.nombre ?? '';
      const ape = data.apellidos ?? prev.apellidos ?? '';
      const full = `${nom} ${ape}`.trim();
      if (full) profileData.full_name = full;
    }
    if (data.telefono !== undefined) profileData.phone = data.telefono || null;
    if (Object.keys(profileData).length > 0) {
      const { error } = await supabase.from('profiles').update(profileData).eq('id', id);
      if (error) throw error;
    }

    // 2) Datos de la tabla 'clientes' (columnas + preferencias jsonb)
    const supaData: any = {};
    if (data.direccion_habitual) {
      supaData.direccion = data.direccion_habitual.calle;
      supaData.ciudad = data.direccion_habitual.ciudad;
      supaData.codigo_postal = data.direccion_habitual.codigo_postal;
    }
    if (data.bloqueada !== undefined) supaData.is_blocked = data.bloqueada;
    if (data.notas_internas_admin !== undefined) supaData.internal_notes = data.notas_internas_admin;
    // Consentimiento de datos de salud (Art. 9 RGPD) — B6
    if ((data as any).consentimiento_salud_en !== undefined) {
      supaData.consentimiento_salud_en = (data as any).consentimiento_salud_en;
      supaData.consentimiento_salud_version = (data as any).consentimiento_salud_version || null;
    }

    const prefKeys: (keyof Clienta)[] = ['servicio_favorito', 'masajista_preferida', 'notas_especiales', 'intensidad_preferida'];
    const touchesPrefs = data.direccion_habitual !== undefined || prefKeys.some(k => (data as any)[k] !== undefined);
    if (touchesPrefs) {
      supaData.preferencias = {
        servicio_favorito: (data as any).servicio_favorito ?? prev.servicio_favorito ?? null,
        masajista_preferida: (data as any).masajista_preferida ?? prev.masajista_preferida ?? null,
        notas_especiales: (data as any).notas_especiales ?? prev.notas_especiales ?? null,
        intensidad_preferida: (data as any).intensidad_preferida ?? prev.intensidad_preferida ?? null,
        direccion_habitual: data.direccion_habitual ?? prev.direccion_habitual ?? null,
      };
    }
    if (Object.keys(supaData).length > 0) {
      const { error } = await supabase.from('clientes').update(supaData).eq('id', id);
      if (error) throw error;
    }

    // 3) Estado local
    if (currentUser?.id === id) {
      setCurrentUser(p => p ? ({ ...p, ...data } as User) : p);
    }
    setClientas(prevList => prevList.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const changePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const createServicio = async (data: Partial<Servicio>) => {
    const { error } = await supabase.from('servicios').insert({
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      duracion_min: data.duracion_minutos ?? 60,
      precio_eur: data.precio ?? 0,
      is_active: data.activo ?? true,
      orden: servicios.length + 1,
    });
    if (error) throw error;
    await loadServicios();
  };

  const updateServicio = async (id: string, data: Partial<Servicio>) => {
    const supaData: any = {};
    if (data.nombre !== undefined) supaData.nombre = data.nombre;
    if (data.descripcion !== undefined) supaData.descripcion = data.descripcion;
    if (data.duracion_minutos !== undefined) supaData.duracion_min = data.duracion_minutos;
    if (data.precio !== undefined) supaData.precio_eur = data.precio;
    if (data.activo !== undefined) supaData.is_active = data.activo;
    if (Object.keys(supaData).length > 0) {
      const { error } = await supabase.from('servicios').update(supaData).eq('id', id);
      if (error) throw error;
    }
    await loadServicios();
  };

  const deleteServicio = async (id: string) => {
    const { error } = await supabase.from('servicios').delete().eq('id', id);
    if (error) throw error;
    await loadServicios();
  };

  // Disponibilidad de la masajista (franjas horarias por día)
  const getDisponibilidad = async (masajistaId: string) => {
    const { data } = await supabase
      .from('disponibilidad')
      .select('*')
      .eq('masajista_id', masajistaId)
      .order('dia_semana');
    return (data || []).map((d: any) => ({
      dia: d.dia_semana,
      hora_inicio: String(d.hora_inicio).slice(0, 5),
      hora_fin: String(d.hora_fin).slice(0, 5),
      activo: d.is_active,
    }));
  };

  const saveDisponibilidad = async (
    masajistaId: string,
    slots: { dia: number; hora_inicio: string; hora_fin: string; activo: boolean }[]
  ) => {
    // Reemplazo completo: borrar lo anterior e insertar lo actual.
    await supabase.from('disponibilidad').delete().eq('masajista_id', masajistaId);
    const rows = slots
      .filter(s => s.hora_fin > s.hora_inicio) // respeta el CHECK (hora_fin > hora_inicio)
      .map(s => ({
        masajista_id: masajistaId,
        dia_semana: s.dia,
        hora_inicio: s.hora_inicio,
        hora_fin: s.hora_fin,
        is_active: s.activo,
      }));
    if (rows.length > 0) {
      const { error } = await supabase.from('disponibilidad').insert(rows);
      if (error) throw error;
    }
  };

  const updateTransferencia = async (id: string, estado: Transferencia['estado'], referencia?: string) => {
    const estadoDB = estado === 'error' ? 'fallida' : estado;
    const supaData: any = { estado: estadoDB };
    if (estadoDB === 'enviada') {
      supaData.enviada_en = new Date().toISOString();
      if (referencia) supaData.referencia = referencia;
    }
    if (estadoDB === 'confirmada') supaData.confirmada_en = new Date().toISOString();
    const { error } = await supabase.from('transferencias').update(supaData).eq('id', id);
    if (error) throw error;
    await loadAllTransferencias();
  };

  // Cierra un ciclo de pago y genera las transferencias (Edge Function admin-actions).
  const cerrarCiclo = async (fechaInicio: string, fechaFin: string) => {
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action: 'close_ciclo', payload: { fecha_inicio: fechaInicio, fecha_fin: fechaFin } },
    });
    if (error) throw error;
    await loadAllTransferencias();
    return data;
  };

  // Invita a un masajista por email (admin-actions → genera enlace + lo envía por Resend).
  // (El alta directa con contraseña temporal se retiró: los masajistas solo se dan de
  // alta por invitación, ver GestionAccesos.tsx.)
  const inviteMasajista = async (email: string, full_name: string) => {
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action: 'invite_masajista', payload: { email, full_name, redirect_to: `${window.location.origin}/?setpw=1` } },
    });
    if (error) throw error;
    return data as { success: boolean; email_sent: boolean; email_error: string | null; action_link: string | null };
  };

  // Da rol de admin a una cuenta EXISTENTE (admin-actions → update_role).
  const promoteToAdmin = async (userId: string) => {
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action: 'update_role', payload: { user_id: userId, new_role: 'admin' } },
    });
    if (error) throw error;
    await loadAllMasajistas();
    return data;
  };

  const createReserva = async (data: Omit<Reserva, 'id' | 'codigo' | 'creada_en'>): Promise<Reserva> => {
    // Duración en minutos a partir de hora_inicio/hora_fin
    const [h, m] = (data.hora_inicio || '00:00').split(':').map(Number);
    const duracion = data.hora_fin ? ((() => {
      const [h2, m2] = data.hora_fin.split(':').map(Number);
      return (h2 * 60 + m2) - (h * 60 + m);
    })()) : 60;

    // Si la clienta eligió masajista, la reserva nace 'aceptada'; si no, 'pendiente' (sin asignar).
    const estadoDB = data.estado === 'confirmada' ? 'aceptada' : 'pendiente';
    const calle = `${data.direccion?.calle || ''} ${data.direccion?.numero || ''}`.trim();

    const { data: created, error } = await supabase.from('reservas').insert({
      cliente_id: data.clienta_id,
      masajista_id: data.masajista_id || null,
      servicio_id: data.servicio_id,
      fecha: data.fecha,
      hora_inicio: data.hora_inicio,
      duracion_min: duracion,
      direccion_servicio: calle,
      ciudad: data.direccion?.ciudad || 'Madrid',
      barrio: data.direccion?.barrio || null,
      codigo_postal: data.direccion?.codigo_postal || '',
      notas_cliente: data.notas_clienta || null,
      precio_total: data.precio_total,
      comision_pct: configuracion.comision_plataforma_pct,
      comision_monto: +(data.precio_total * configuracion.comision_plataforma_pct / 100).toFixed(2),
      pago_masajista: data.pago_masajista,
      estado: estadoDB,
    }).select('*, servicios(nombre), valoraciones(*)').single();

    if (error || !created) {
      throw error || new Error('No se pudo crear la reserva');
    }

    // Devolvemos la reserva REAL (con el código MF-NNNNNN que genera la BD).
    const nuevaReserva = mapReserva(created);
    setReservas(prev => [nuevaReserva, ...prev]);
    return nuevaReserva;
  };

  const updateReserva = async (id: string, data: Partial<Reserva>) => {
    const supaData: any = {};
    if (data.estado) {
      const reverseEstadoMap: Record<string, string> = {
        'pendiente_asignacion': 'pendiente',
        'confirmada': 'aceptada',
        'completada': 'completada',
        'rechazada': 'rechazada',
        'cancelada_clienta': 'cancelada',
        'cancelada_masajista': 'cancelada',
      };
      supaData.estado = reverseEstadoMap[data.estado] || data.estado;
    }
    if (data.masajista_id) supaData.masajista_id = data.masajista_id;
    if (data.motivo_rechazo) supaData.rechazo_motivo = data.motivo_rechazo;

    if (supaData.estado === 'aceptada') supaData.aceptada_en = new Date().toISOString();
    if (supaData.estado === 'completada') supaData.completada_en = new Date().toISOString();

    if (Object.keys(supaData).length > 0) {
      const { error } = await supabase.from('reservas').update(supaData).eq('id', id);
      if (error) throw error; // no fingir éxito: que la UI lo sepa
    }

    setReservas(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  };

  const createValoracion = async (data: Omit<Valoracion, 'id'>) => {
    const newVal: Valoracion = { ...data, id: `val-${Date.now()}` };

    const { error } = await supabase.from('valoraciones').insert({
      reserva_id: data.reserva_id,
      cliente_id: data.clienta_id,
      masajista_id: data.masajista_id,
      puntuacion: data.estrellas,
      comentario: data.comentario || null,
    });
    if (error) throw error;

    setValoraciones(prev => [...prev, newVal]);
  };

  // Claim ATÓMICO de una solicitud abierta: solo gana la primera masajista.
  // El UPDATE exige estado='pendiente' y masajista_id IS NULL; si otra ya la
  // tomó, no afecta filas → avisamos en vez de fingir que se aceptó.
  const aceptarSolicitud = async (reservaId: string, masajistaId: string) => {
    const { data, error } = await supabase
      .from('reservas')
      .update({ estado: 'aceptada', masajista_id: masajistaId, aceptada_en: new Date().toISOString() })
      .eq('id', reservaId)
      .eq('estado', 'pendiente')
      .is('masajista_id', null)
      .select('*, servicios(nombre), valoraciones(*), clientes(profiles(full_name, phone))');
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Esta solicitud ya fue tomada por otra masajista o ya no está disponible.');
    }
    const mapped = mapReserva(data[0]);
    setReservas(prev => prev.map(r => r.id === reservaId ? mapped : r));
  };

  const rechazarSolicitud = async (reservaId: string, motivo: string) => {
    await updateReserva(reservaId, { estado: 'rechazada', motivo_rechazo: motivo });
  };

  const marcarReservaCompletada = async (reservaId: string) => {
    await updateReserva(reservaId, { estado: 'completada' });
  };

  const cancelarReservaPorClienta = async (reservaId: string) => {
    await updateReserva(reservaId, { estado: 'cancelada_clienta' });
  };

  const updateDocumento = (masajistaId: string, documentoId: string, data: Partial<Documento>) => {
    setMasajistas(prev => prev.map(m => {
      if (m.id === masajistaId) {
        const updatedDocs = m.documentos.map(d =>
          d.id === documentoId ? { ...d, ...data } : d
        );
        return { ...m, documentos: updatedDocs };
      }
      return m;
    }));
  };

  const verificarDocumento = async (masajistaId: string, documentoId: string, adminId: string) => {
    const { error } = await supabase.from('documentos').update({
      estado: 'verificado',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    }).eq('id', documentoId);
    if (error) throw error;

    updateDocumento(masajistaId, documentoId, {
      estado: 'verificado',
      verificado_por: adminId,
      fecha_verificacion: new Date().toISOString().split('T')[0]
    });
  };

  // Aprueba a la masajista (is_verified=true) para que pueda aparecer en las
  // reservas. El admin puede hacerlo directamente: el trigger
  // masajistas_freeze_sensitive solo bloquea a NO-admin (ver migración _08).
  const verificarMasajista = async (masajistaId: string) => {
    const { error } = await supabase
      .from('masajistas')
      .update({ is_verified: true })
      .eq('id', masajistaId);
    if (error) throw error;
    await loadAllMasajistas();
  };

  // Sube un documento al bucket 'documentos' y registra/actualiza su fila.
  const uploadDocumento = async (masajistaId: string, tipo: string, file: File) => {
    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
    const path = `${masajistaId}/${tipo}_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('documentos').upload(path, file, { upsert: true });
    if (upErr) throw upErr;
    const { error } = await supabase.from('documentos').upsert(
      { masajista_id: masajistaId, tipo, storage_path: path, estado: 'pendiente' },
      { onConflict: 'masajista_id,tipo' }
    );
    if (error) throw error;
    if (currentUser?.id === masajistaId) await loadMiPerfilMasajista(masajistaId);
  };

  // URL firmada temporal para ver un documento privado.
  const getDocumentoUrl = async (storagePath: string) => {
    const { data, error } = await supabase.storage.from('documentos').createSignedUrl(storagePath, 120);
    if (error) throw error;
    return data.signedUrl;
  };

  // Sube la foto de perfil al bucket público 'avatars' y la guarda en profiles.
  const uploadAvatar = async (file: File) => {
    if (!currentUser) return;
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${currentUser.id}/avatar_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = pub.publicUrl;
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', currentUser.id);
    setCurrentUser(p => p ? ({ ...p, foto: url } as User) : p);
  };

  // Pagos con Stripe (opcional: solo activo si hay clave publishable en el .env).
  const stripeEnabled = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const crearCheckoutReserva = async (reservaId: string) => {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { reserva_id: reservaId, success_url: window.location.origin + '/?pago=ok', cancel_url: window.location.origin + '/?pago=cancelado' },
    });
    if (error) throw error;
    if (data?.url) window.location.href = data.url;
  };

  const createNotificacion = (data: Omit<Notificacion, 'id'>) => {
    const newNotif: Notificacion = { ...data, id: `notif-${Date.now()}` };
    setNotificaciones(prev => [newNotif, ...prev]);
  };

  const marcarNotificacionLeida = async (id: string) => {
    await supabase.from('notificaciones').update({ is_read: true }).eq('id', id);
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  };

  const marcarTodasNotificacionesLeidas = async (usuarioId: string) => {
    await supabase.from('notificaciones').update({ is_read: true }).eq('user_id', usuarioId).eq('is_read', false);
    setNotificaciones(prev => prev.map(n => n.usuario_id === usuarioId ? { ...n, leida: true } : n));
  };

  const updateConfiguracion = async (data: Partial<Configuracion>) => {
    const rows: { clave: string; valor: any }[] = [];
    if (data.comision_plataforma_pct !== undefined) rows.push({ clave: 'comision_pct', valor: data.comision_plataforma_pct });
    if (data.precio_maximo_sesion !== undefined) rows.push({ clave: 'precio_maximo_eur', valor: data.precio_maximo_sesion });
    if (data.ciclo_pago !== undefined) rows.push({ clave: 'ciclo_pago', valor: data.ciclo_pago });
    if (data.presupuesto_meta_ads_pct !== undefined) rows.push({ clave: 'meta_ads_pct', valor: data.presupuesto_meta_ads_pct });
    if (data.moneda !== undefined) rows.push({ clave: 'moneda', valor: data.moneda });
    if (rows.length > 0) {
      const { error } = await supabase.from('configuracion').upsert(rows, { onConflict: 'clave' });
      if (error) throw error;
    }
    setConfiguracion(prev => ({ ...prev, ...data }));
  };

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  const value: AppContextType = {
    currentUser,
    login,
    logout,
    masajistas,
    clientas,
    servicios,
    reservas,
    valoraciones,
    transferencias,
    notificaciones,
    configuracion,
    updateMasajista,
    updateClienta,
    changePassword,
    createServicio,
    updateServicio,
    deleteServicio,
    getDisponibilidad,
    saveDisponibilidad,
    updateTransferencia,
    cerrarCiclo,
    inviteMasajista,
    promoteToAdmin,
    uploadDocumento,
    getDocumentoUrl,
    uploadAvatar,
    stripeEnabled,
    crearCheckoutReserva,
    createReserva,
    loadReservasCliente,
    updateReserva,
    createValoracion,
    aceptarSolicitud,
    rechazarSolicitud,
    marcarReservaCompletada,
    cancelarReservaPorClienta,
    updateDocumento,
    verificarDocumento,
    verificarMasajista,
    createNotificacion,
    marcarNotificacionLeida,
    marcarTodasNotificacionesLeidas,
    updateConfiguracion,
    darkMode,
    toggleDarkMode,
    currentView,
    navigate,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
