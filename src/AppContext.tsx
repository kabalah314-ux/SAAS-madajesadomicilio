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
      loadReservasMasajista(currentUser.id);
      loadTransferenciasMasajista(currentUser.id);
    } else if (currentUser.role === 'clienta') {
      loadReservasCliente(currentUser.id);
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
    const { data } = await supabase.from('servicios').select('*').eq('is_active', true).order('orden');
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
      .select('*, profiles(full_name, email, phone, avatar_url, is_active)');
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
      .select('*, servicios(nombre)')
      .order('created_at', { ascending: false });
    if (data) {
      setReservas(data.map(r => mapReserva(r)));
    }
  }

  async function loadReservasMasajista(masajistaId: string) {
    const { data } = await supabase
      .from('reservas')
      .select('*, servicios(nombre)')
      .eq('masajista_id', masajistaId)
      .order('fecha', { ascending: false });
    if (data) {
      setReservas(data.map(r => mapReserva(r)));
    }
  }

  async function loadReservasCliente(clienteId: string) {
    const { data } = await supabase
      .from('reservas')
      .select('*, servicios(nombre)')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false });
    if (data) {
      setReservas(data.map(r => mapReserva(r)));
    }
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
      });
      cfg.pago_masajista_pct = 100 - (cfg.comision_plataforma_pct || 25);
      cfg.ciclo_pago = 'quincenal';
      cfg.presupuesto_meta_ads_pct = 10;
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
      activo: p?.is_active ?? true,
      bio: m.bio || undefined,
      especialidades: m.especialidades || [],
      zonas_cobertura: m.zonas_cobertura || [],
      tarifa_hora: undefined,
      iban: m.iban || undefined,
      documentacion_ok: m.is_verified,
      documentos: [],
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

  function mapReserva(r: any): Reserva {
    const estadoMap: Record<string, string> = {
      'pendiente': 'pendiente_asignacion',
      'aceptada': 'confirmada',
      'completada': 'completada',
      'rechazada': 'rechazada',
      'cancelada': 'cancelada_clienta',
      'expirada': 'cancelada_clienta',
    };
    return {
      id: r.id,
      codigo: r.codigo,
      clienta_id: r.cliente_id,
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
        barrio: '',
      },
      estado: (estadoMap[r.estado] || r.estado) as any,
      precio_total: Number(r.precio_total),
      pago_masajista: Number(r.pago_masajista),
      notas_clienta: r.notas_cliente || undefined,
      motivo_rechazo: r.rechazo_motivo || undefined,
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
    return {
      id: t.id,
      masajista_id: t.masajista_id,
      periodo_inicio: t.ciclos_pago?.fecha_inicio || '',
      periodo_fin: t.ciclos_pago?.fecha_fin || '',
      sesiones: t.num_sesiones,
      importe_bruto: Number(t.monto_eur),
      importe_neto: Number(t.monto_eur),
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
    const supaData: any = {};
    if (data.bio !== undefined) supaData.bio = data.bio;
    if (data.especialidades) supaData.especialidades = data.especialidades;
    if (data.zonas_cobertura) supaData.zonas_cobertura = data.zonas_cobertura;
    if (data.iban !== undefined) supaData.iban = data.iban;

    if (Object.keys(supaData).length > 0) {
      await supabase.from('masajistas').update(supaData).eq('id', id);
    }
    setMasajistas(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
  };

  const updateClienta = async (id: string, data: Partial<Clienta>) => {
    const supaData: any = {};
    if (data.direccion_habitual) {
      supaData.direccion = data.direccion_habitual.calle;
      supaData.ciudad = data.direccion_habitual.ciudad;
      supaData.codigo_postal = data.direccion_habitual.codigo_postal;
    }
    if (data.bloqueada !== undefined) supaData.is_blocked = data.bloqueada;
    if (data.notas_internas_admin !== undefined) supaData.internal_notes = data.notas_internas_admin;

    if (Object.keys(supaData).length > 0) {
      await supabase.from('clientes').update(supaData).eq('id', id);
    }
    setClientas(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const createReserva = (data: Omit<Reserva, 'id' | 'codigo' | 'creada_en'>): Reserva => {
    const newReserva: Reserva = {
      ...data,
      id: `res-${Date.now()}`,
      codigo: `MF-${new Date().getFullYear()}-${String(reservas.length + 1).padStart(3, '0')}`,
      creada_en: new Date().toISOString()
    };

    // Also write to Supabase
    const [h, m] = (data.hora_inicio || '00:00').split(':').map(Number);
    const duracion = data.hora_fin ? ((() => {
      const [h2, m2] = data.hora_fin.split(':').map(Number);
      return (h2 * 60 + m2) - (h * 60 + m);
    })()) : 60;

    supabase.from('reservas').insert({
      cliente_id: data.clienta_id,
      masajista_id: data.masajista_id || null,
      servicio_id: data.servicio_id,
      fecha: data.fecha,
      hora_inicio: data.hora_inicio,
      duracion_min: duracion,
      direccion_servicio: data.direccion?.calle || '',
      ciudad: data.direccion?.ciudad || 'Madrid',
      codigo_postal: data.direccion?.codigo_postal || '',
      notas_cliente: data.notas_clienta || null,
      precio_total: data.precio_total,
      comision_pct: configuracion.comision_plataforma_pct,
      comision_monto: +(data.precio_total * configuracion.comision_plataforma_pct / 100).toFixed(2),
      pago_masajista: data.pago_masajista,
      estado: 'pendiente',
    }).then(({ data: created }) => {
      if (created) {
        // Refresh reservas
        if (currentUser?.role === 'admin') loadAllReservas();
        else if (currentUser?.role === 'clienta') loadReservasCliente(currentUser.id);
      }
    });

    setReservas(prev => [...prev, newReserva]);
    return newReserva;
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
      await supabase.from('reservas').update(supaData).eq('id', id);
    }

    setReservas(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  };

  const createValoracion = async (data: Omit<Valoracion, 'id'>) => {
    const newVal: Valoracion = { ...data, id: `val-${Date.now()}` };

    await supabase.from('valoraciones').insert({
      reserva_id: data.reserva_id,
      cliente_id: data.clienta_id,
      masajista_id: data.masajista_id,
      puntuacion: data.estrellas,
      comentario: data.comentario || null,
    });

    setValoraciones(prev => [...prev, newVal]);
  };

  const aceptarSolicitud = async (reservaId: string, masajistaId: string) => {
    await updateReserva(reservaId, { estado: 'confirmada', masajista_id: masajistaId });
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
    await supabase.from('documentos').update({
      estado: 'verificado',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    }).eq('id', documentoId);

    updateDocumento(masajistaId, documentoId, {
      estado: 'verificado',
      verificado_por: adminId,
      fecha_verificacion: new Date().toISOString().split('T')[0]
    });
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
    if (data.comision_plataforma_pct !== undefined) {
      await supabase.from('configuracion').update({ valor: String(data.comision_plataforma_pct) }).eq('clave', 'comision_pct');
    }
    if (data.precio_maximo_sesion !== undefined) {
      await supabase.from('configuracion').update({ valor: String(data.precio_maximo_sesion) }).eq('clave', 'precio_maximo_eur');
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
    createReserva,
    updateReserva,
    createValoracion,
    aceptarSolicitud,
    rechazarSolicitud,
    marcarReservaCompletada,
    cancelarReservaPorClienta,
    updateDocumento,
    verificarDocumento,
    createNotificacion,
    marcarNotificacionLeida,
    marcarTodasNotificacionesLeidas,
    updateConfiguracion,
    darkMode,
    toggleDarkMode
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
