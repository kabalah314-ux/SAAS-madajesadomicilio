// Tipos del sistema MassFlow

export type UserRole = 'admin' | 'masajista' | 'clienta';

export type ReservaEstado = 
  | 'pendiente_asignacion' 
  | 'confirmada' 
  | 'completada' 
  | 'cancelada_clienta' 
  | 'cancelada_masajista'
  | 'rechazada';

export type DocumentoEstado = 'no_subido' | 'pendiente_revision' | 'verificado' | 'vencido';

export type PagoEstado = 'pendiente' | 'cobrado' | 'cancelado';

export type TransferenciaEstado = 'pendiente' | 'enviada' | 'confirmada' | 'error';

export type TipoServicio = 
  | 'Relajante' 
  | 'Descontracturante' 
  | 'Deportivo' 
  | 'Prenatal' 
  | 'Ayurveda' 
  | 'Parejas';

export type TipoCliente = 'nuevo' | 'recurrente' | 'vip';

export interface User {
  id: string;
  email: string;
  pin: string;
  role: UserRole;
  nombre: string;
  apellidos?: string;
  telefono?: string;
  foto?: string;
  activo: boolean;
}

export interface Masajista extends User {
  role: 'masajista';
  bio?: string;
  especialidades: TipoServicio[];
  zonas_cobertura: string[];
  radio_cobertura_km?: number;
  tarifa_hora?: number;
  iban?: string;
  documentacion_ok: boolean;
  documentos: Documento[];
  rating_promedio: number;
  total_sesiones: number;
  valoraciones: Valoracion[];
}

export interface Clienta extends User {
  role: 'clienta';
  direccion_habitual?: Direccion;
  servicio_favorito?: TipoServicio;
  masajista_preferida?: string;
  notas_especiales?: string;
  intensidad_preferida?: 'suave' | 'media' | 'fuerte';
  total_sesiones: number;
  gasto_acumulado: number;
  tipo_cliente: TipoCliente;
  bloqueada: boolean;
  motivo_bloqueo?: string;
  notas_internas_admin?: string;
}

export interface Admin extends User {
  role: 'admin';
}

export interface Direccion {
  calle: string;
  numero: string;
  piso?: string;
  ciudad: string;
  codigo_postal: string;
  barrio: string;
  instrucciones_acceso?: string;
}

export interface Servicio {
  id: string;
  nombre: string;
  tipo: TipoServicio;
  duracion_minutos: number;
  precio: number;
  descripcion: string;
  emoji: string;
  activo: boolean;
}

export interface Reserva {
  id: string;
  codigo: string;
  clienta_id: string;
  masajista_id?: string;
  servicio_id: string;
  fecha: string; // ISO date
  hora_inicio: string; // HH:mm
  hora_fin: string; // HH:mm
  direccion: Direccion;
  estado: ReservaEstado;
  precio_total: number;
  pago_masajista: number; // 60% del total
  notas_clienta?: string;
  motivo_rechazo?: string;
  valoracion?: Valoracion;
  creada_en: string; // ISO datetime
}

export interface Valoracion {
  id: string;
  reserva_id: string;
  clienta_id: string;
  masajista_id: string;
  estrellas: number; // 1-5
  comentario?: string;
  fecha: string; // ISO date
}

export interface Documento {
  id: string;
  masajista_id: string;
  tipo: 'autonoma' | 'seguro' | 'dni';
  nombre: string;
  url?: string;
  estado: DocumentoEstado;
  fecha_subida?: string;
  fecha_vencimiento?: string;
  verificado_por?: string; // admin_id
  fecha_verificacion?: string;
}

export interface DisponibilidadSlot {
  id: string;
  masajista_id: string;
  dia_semana: number; // 0-6 (domingo-sábado)
  hora_inicio: string; // HH:mm
  hora_fin: string; // HH:mm
  activo: boolean;
}

export interface Transferencia {
  id: string;
  masajista_id: string;
  periodo_inicio: string; // ISO date
  periodo_fin: string; // ISO date
  sesiones: number;
  importe_bruto: number;
  importe_neto: number; // 60% del bruto
  estado: TransferenciaEstado;
  fecha_transferencia?: string;
  referencia_bancaria?: string;
  reservas_incluidas: string[]; // array de reserva_ids
}

export interface Notificacion {
  id: string;
  usuario_id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha: string; // ISO datetime
  link?: string;
}

export interface Configuracion {
  comision_plataforma_pct: number; // default 40
  pago_masajista_pct: number; // default 60
  precio_maximo_sesion: number; // default 60
  ciclo_pago: 'semanal' | 'quincenal';
  presupuesto_meta_ads_pct: number; // default 10
  moneda: string; // EUR
}

export interface AppContextType {
  // Auth
  currentUser: User | null;
  login: (email: string, pin: string) => boolean;
  logout: () => void;
  
  // Data
  masajistas: Masajista[];
  clientas: Clienta[];
  servicios: Servicio[];
  reservas: Reserva[];
  valoraciones: Valoracion[];
  transferencias: Transferencia[];
  notificaciones: Notificacion[];
  configuracion: Configuracion;
  
  // Actions
  updateMasajista: (id: string, data: Partial<Masajista>) => void;
  updateClienta: (id: string, data: Partial<Clienta>) => void;
  createReserva: (data: Omit<Reserva, 'id' | 'codigo' | 'creada_en'>) => Reserva;
  updateReserva: (id: string, data: Partial<Reserva>) => void;
  createValoracion: (data: Omit<Valoracion, 'id'>) => void;
  aceptarSolicitud: (reservaId: string, masajistaId: string) => void;
  rechazarSolicitud: (reservaId: string, motivo: string) => void;
  marcarReservaCompletada: (reservaId: string) => void;
  cancelarReservaPorClienta: (reservaId: string) => void;
  updateDocumento: (masajistaId: string, documentoId: string, data: Partial<Documento>) => void;
  verificarDocumento: (masajistaId: string, documentoId: string, adminId: string) => void;
  createNotificacion: (data: Omit<Notificacion, 'id'>) => void;
  marcarNotificacionLeida: (id: string) => void;
  marcarTodasNotificacionesLeidas: (usuarioId: string) => void;
  updateConfiguracion: (data: Partial<Configuracion>) => void;
  
  // UI State
  darkMode: boolean;
  toggleDarkMode: () => void;
}
