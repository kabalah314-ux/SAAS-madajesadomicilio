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
import { 
  allUsers, 
  masajistas as initialMasajistas, 
  clientas as initialClientas,
  servicios as initialServicios,
  reservas as initialReservas,
  valoraciones as initialValoraciones,
  transferencias as initialTransferencias,
  configuracionInicial
} from './mockData';

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [masajistas, setMasajistas] = useState<Masajista[]>(initialMasajistas);
  const [clientas, setClientas] = useState<Clienta[]>(initialClientas);
  const [servicios] = useState<Servicio[]>(initialServicios);
  const [reservas, setReservas] = useState<Reserva[]>(initialReservas);
  const [valoraciones, setValoraciones] = useState<Valoracion[]>(initialValoraciones);
  const [transferencias, setTransferencias] = useState<Transferencia[]>(initialTransferencias);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [configuracion, setConfiguracion] = useState<Configuracion>(configuracionInicial);
  const [darkMode, setDarkMode] = useState(false);

  // Cargar usuario de localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('massflow_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      // Buscar usuario actualizado en los datos
      const user = allUsers.find(u => u.id === userData.id);
      if (user) {
        setCurrentUser(user);
      }
    }
  }, []);

  const login = (email: string, pin: string): boolean => {
    const user = allUsers.find(u => u.email === email && u.pin === pin && u.activo);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('massflow_user', JSON.stringify(user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('massflow_user');
  };

  const updateMasajista = (id: string, data: Partial<Masajista>) => {
    setMasajistas(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
  };

  const updateClienta = (id: string, data: Partial<Clienta>) => {
    setClientas(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const generateReservaCode = (): string => {
    const year = new Date().getFullYear();
    const num = (reservas.length + 1).toString().padStart(3, '0');
    return `MF-${year}-${num}`;
  };

  const createReserva = (data: Omit<Reserva, 'id' | 'codigo' | 'creada_en'>): Reserva => {
    const newReserva: Reserva = {
      ...data,
      id: `res-${Date.now()}`,
      codigo: generateReservaCode(),
      creada_en: new Date().toISOString()
    };
    setReservas(prev => [...prev, newReserva]);
    
    // Crear notificación para admin
    createNotificacion({
      usuario_id: 'admin-1',
      tipo: 'nueva_reserva',
      titulo: 'Nueva reserva pendiente',
      mensaje: `Reserva ${newReserva.codigo} - ${data.estado === 'pendiente_asignacion' ? 'Pendiente de asignación' : 'Creada'}`,
      leida: false,
      fecha: new Date().toISOString()
    });

    return newReserva;
  };

  const updateReserva = (id: string, data: Partial<Reserva>) => {
    setReservas(prev => prev.map(r => {
      if (r.id === id) {
        const updated = { ...r, ...data };
        
        // Notificaciones según el cambio de estado
        if (data.estado === 'confirmada' && r.estado !== 'confirmada') {
          // Notificar a la clienta
          createNotificacion({
            usuario_id: updated.clienta_id,
            tipo: 'reserva_confirmada',
            titulo: '¡Reserva confirmada!',
            mensaje: `Tu reserva ${updated.codigo} ha sido confirmada para el ${updated.fecha}`,
            leida: false,
            fecha: new Date().toISOString()
          });
        }
        
        if (data.estado === 'completada' && r.estado !== 'completada') {
          // Notificar a la masajista
          if (updated.masajista_id) {
            createNotificacion({
              usuario_id: updated.masajista_id,
              tipo: 'sesion_completada',
              titulo: 'Sesión completada',
              mensaje: `Sesión ${updated.codigo} marcada como completada`,
              leida: false,
              fecha: new Date().toISOString()
            });
          }
        }
        
        return updated;
      }
      return r;
    }));
  };

  const createValoracion = (data: Omit<Valoracion, 'id'>) => {
    const newVal: Valoracion = {
      ...data,
      id: `val-${Date.now()}`
    };
    setValoraciones(prev => [...prev, newVal]);
    
    // Actualizar rating de la masajista
    const masajistaVals = [...valoraciones, newVal].filter(v => v.masajista_id === data.masajista_id);
    const avgRating = masajistaVals.reduce((sum, v) => sum + v.estrellas, 0) / masajistaVals.length;
    updateMasajista(data.masajista_id, { 
      rating_promedio: Math.round(avgRating * 10) / 10,
      valoraciones: masajistaVals
    });

    // Notificar a la masajista
    createNotificacion({
      usuario_id: data.masajista_id,
      tipo: 'nueva_valoracion',
      titulo: 'Nueva valoración recibida',
      mensaje: `Has recibido ${data.estrellas} estrellas`,
      leida: false,
      fecha: new Date().toISOString()
    });
  };

  const aceptarSolicitud = (reservaId: string, masajistaId: string) => {
    updateReserva(reservaId, { 
      estado: 'confirmada', 
      masajista_id: masajistaId 
    });
    
    const reserva = reservas.find(r => r.id === reservaId);
    if (reserva) {
      createNotificacion({
        usuario_id: reserva.clienta_id,
        tipo: 'solicitud_aceptada',
        titulo: '¡Solicitud aceptada!',
        mensaje: `Tu reserva ${reserva.codigo} ha sido aceptada`,
        leida: false,
        fecha: new Date().toISOString()
      });
    }
  };

  const rechazarSolicitud = (reservaId: string, motivo: string) => {
    updateReserva(reservaId, { 
      estado: 'rechazada', 
      motivo_rechazo: motivo 
    });
    
    const reserva = reservas.find(r => r.id === reservaId);
    if (reserva) {
      createNotificacion({
        usuario_id: reserva.clienta_id,
        tipo: 'solicitud_rechazada',
        titulo: 'Solicitud no disponible',
        mensaje: `Tu reserva ${reserva.codigo} no pudo ser asignada. Te reembolsaremos el importe.`,
        leida: false,
        fecha: new Date().toISOString()
      });
    }
  };

  const marcarReservaCompletada = (reservaId: string) => {
    updateReserva(reservaId, { estado: 'completada' });
  };

  const cancelarReservaPorClienta = (reservaId: string) => {
    updateReserva(reservaId, { estado: 'cancelada_clienta' });
    
    const reserva = reservas.find(r => r.id === reservaId);
    if (reserva?.masajista_id) {
      createNotificacion({
        usuario_id: reserva.masajista_id,
        tipo: 'reserva_cancelada',
        titulo: 'Reserva cancelada',
        mensaje: `La clienta canceló la reserva ${reserva.codigo}`,
        leida: false,
        fecha: new Date().toISOString()
      });
    }
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

  const verificarDocumento = (masajistaId: string, documentoId: string, adminId: string) => {
    updateDocumento(masajistaId, documentoId, {
      estado: 'verificado',
      verificado_por: adminId,
      fecha_verificacion: new Date().toISOString().split('T')[0]
    });

    // Verificar si todos los documentos están verificados
    const masajista = masajistas.find(m => m.id === masajistaId);
    if (masajista) {
      const allVerified = masajista.documentos.every(d => {
        if (d.id === documentoId) return true; // Este acaba de verificarse
        return d.estado === 'verificado';
      });
      
      if (allVerified) {
        updateMasajista(masajistaId, { documentacion_ok: true });
        createNotificacion({
          usuario_id: masajistaId,
          tipo: 'documentacion_completa',
          titulo: '✅ Documentación verificada',
          mensaje: 'Toda tu documentación ha sido verificada. Ya puedes recibir asignaciones.',
          leida: false,
          fecha: new Date().toISOString()
        });
      }
    }
  };

  const createNotificacion = (data: Omit<Notificacion, 'id'>) => {
    const newNotif: Notificacion = {
      ...data,
      id: `notif-${Date.now()}`
    };
    setNotificaciones(prev => [...prev, newNotif]);
  };

  const marcarNotificacionLeida = (id: string) => {
    setNotificaciones(prev => prev.map(n => 
      n.id === id ? { ...n, leida: true } : n
    ));
  };

  const marcarTodasNotificacionesLeidas = (usuarioId: string) => {
    setNotificaciones(prev => prev.map(n => 
      n.usuario_id === usuarioId ? { ...n, leida: true } : n
    ));
  };

  const updateConfiguracion = (data: Partial<Configuracion>) => {
    setConfiguracion(prev => ({ ...prev, ...data }));
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

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
