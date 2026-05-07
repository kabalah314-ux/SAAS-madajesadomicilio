import { 
  Masajista, 
  Clienta, 
  Admin, 
  Servicio, 
  Reserva, 
  Valoracion,
  Transferencia,
  Configuracion
} from './types';

// USUARIOS
export const adminUser: Admin = {
  id: 'admin-1',
  email: 'admin@massflow.com',
  pin: '1111',
  role: 'admin',
  nombre: 'Admin',
  apellidos: 'Sistema',
  activo: true
};

export const masajistas: Masajista[] = [
  {
    id: 'mas-1',
    email: 'laura@massflow.com',
    pin: '2222',
    role: 'masajista',
    nombre: 'Laura',
    apellidos: 'García',
    telefono: '+34 612 345 678',
    foto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    bio: 'Especialista en masaje terapéutico con 8 años de experiencia. Certificada en técnicas ayurvédicas y deportivas.',
    especialidades: ['Relajante', 'Descontracturante', 'Ayurveda'],
    zonas_cobertura: ['Centro', 'Chamartín', 'Salamanca'],
    radio_cobertura_km: 5,
    tarifa_hora: 45,
    iban: 'ES79 2100 0813 4101 2345 6789',
    documentacion_ok: true,
    documentos: [
      {
        id: 'doc-1',
        masajista_id: 'mas-1',
        tipo: 'autonoma',
        nombre: 'Certificado de Autónoma',
        estado: 'verificado',
        url: '/docs/autonoma-laura.pdf',
        fecha_subida: '2024-01-15',
        verificado_por: 'admin-1',
        fecha_verificacion: '2024-01-16'
      },
      {
        id: 'doc-2',
        masajista_id: 'mas-1',
        tipo: 'seguro',
        nombre: 'Seguro RC',
        estado: 'verificado',
        url: '/docs/seguro-laura.pdf',
        fecha_subida: '2024-01-15',
        fecha_vencimiento: '2025-01-15',
        verificado_por: 'admin-1',
        fecha_verificacion: '2024-01-16'
      },
      {
        id: 'doc-3',
        masajista_id: 'mas-1',
        tipo: 'dni',
        nombre: 'DNI',
        estado: 'verificado',
        url: '/docs/dni-laura.pdf',
        fecha_subida: '2024-01-15',
        verificado_por: 'admin-1',
        fecha_verificacion: '2024-01-16'
      }
    ],
    activo: true,
    rating_promedio: 4.8,
    total_sesiones: 127,
    valoraciones: []
  },
  {
    id: 'mas-2',
    email: 'sofia@massflow.com',
    pin: '3333',
    role: 'masajista',
    nombre: 'Sofía',
    apellidos: 'Martínez',
    telefono: '+34 623 456 789',
    foto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    bio: 'Fisioterapeuta y masajista deportiva. Trabajo con atletas profesionales y personas con lesiones.',
    especialidades: ['Deportivo', 'Descontracturante'],
    zonas_cobertura: ['Retiro', 'Salamanca', 'Chamberí'],
    radio_cobertura_km: 7,
    tarifa_hora: 50,
    iban: 'ES79 2100 0813 4501 2345 6789',
    documentacion_ok: true,
    documentos: [
      {
        id: 'doc-4',
        masajista_id: 'mas-2',
        tipo: 'autonoma',
        nombre: 'Certificado de Autónoma',
        estado: 'verificado',
        url: '/docs/autonoma-sofia.pdf',
        fecha_subida: '2024-02-01',
        verificado_por: 'admin-1',
        fecha_verificacion: '2024-02-02'
      },
      {
        id: 'doc-5',
        masajista_id: 'mas-2',
        tipo: 'seguro',
        nombre: 'Seguro RC',
        estado: 'pendiente_revision',
        url: '/docs/seguro-sofia.pdf',
        fecha_subida: '2024-05-10',
        fecha_vencimiento: '2025-05-10'
      },
      {
        id: 'doc-6',
        masajista_id: 'mas-2',
        tipo: 'dni',
        nombre: 'DNI',
        estado: 'verificado',
        url: '/docs/dni-sofia.pdf',
        fecha_subida: '2024-02-01',
        verificado_por: 'admin-1',
        fecha_verificacion: '2024-02-02'
      }
    ],
    activo: true,
    rating_promedio: 4.9,
    total_sesiones: 89,
    valoraciones: []
  },
  {
    id: 'mas-3',
    email: 'carmen@massflow.com',
    pin: '4444',
    role: 'masajista',
    nombre: 'Carmen',
    apellidos: 'López',
    telefono: '+34 634 567 890',
    foto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    bio: 'Especialista en masaje prenatal y postparto. Acompaño a mujeres en su camino hacia el bienestar.',
    especialidades: ['Prenatal', 'Relajante'],
    zonas_cobertura: ['Chamberí', 'Moncloa', 'Argüelles'],
    radio_cobertura_km: 6,
    tarifa_hora: 48,
    iban: 'ES79 2100 0813 4701 2345 6789',
    documentacion_ok: false,
    documentos: [
      {
        id: 'doc-7',
        masajista_id: 'mas-3',
        tipo: 'autonoma',
        nombre: 'Certificado de Autónoma',
        estado: 'verificado',
        url: '/docs/autonoma-carmen.pdf',
        fecha_subida: '2024-03-01',
        verificado_por: 'admin-1',
        fecha_verificacion: '2024-03-02'
      },
      {
        id: 'doc-8',
        masajista_id: 'mas-3',
        tipo: 'seguro',
        nombre: 'Seguro RC',
        estado: 'no_subido'
      },
      {
        id: 'doc-9',
        masajista_id: 'mas-3',
        tipo: 'dni',
        nombre: 'DNI',
        estado: 'verificado',
        url: '/docs/dni-carmen.pdf',
        fecha_subida: '2024-03-01',
        verificado_por: 'admin-1',
        fecha_verificacion: '2024-03-02'
      }
    ],
    activo: true,
    rating_promedio: 5.0,
    total_sesiones: 45,
    valoraciones: []
  }
];

export const clientas: Clienta[] = [
  {
    id: 'cli-1',
    email: 'ana@email.com',
    pin: '5555',
    role: 'clienta',
    nombre: 'Ana',
    apellidos: 'Rodríguez',
    telefono: '+34 645 678 901',
    direccion_habitual: {
      calle: 'Calle Alcalá',
      numero: '123',
      piso: '3º A',
      ciudad: 'Madrid',
      codigo_postal: '28009',
      barrio: 'Salamanca',
      instrucciones_acceso: 'Portal verde, llamar al 3A'
    },
    servicio_favorito: 'Relajante',
    masajista_preferida: 'mas-1',
    notas_especiales: 'Alergia a aceites de almendra. Prefiero presión media.',
    intensidad_preferida: 'media',
    activo: true,
    total_sesiones: 12,
    gasto_acumulado: 660,
    tipo_cliente: 'vip',
    bloqueada: false
  },
  {
    id: 'cli-2',
    email: 'maria@email.com',
    pin: '6666',
    role: 'clienta',
    nombre: 'María',
    apellidos: 'González',
    telefono: '+34 656 789 012',
    direccion_habitual: {
      calle: 'Calle Serrano',
      numero: '45',
      piso: '1º B',
      ciudad: 'Madrid',
      codigo_postal: '28001',
      barrio: 'Salamanca',
      instrucciones_acceso: 'Portero automático, piso 1B'
    },
    servicio_favorito: 'Descontracturante',
    intensidad_preferida: 'fuerte',
    activo: true,
    total_sesiones: 5,
    gasto_acumulado: 275,
    tipo_cliente: 'recurrente',
    bloqueada: false
  },
  {
    id: 'cli-3',
    email: 'lucia@email.com',
    pin: '7777',
    role: 'clienta',
    nombre: 'Lucía',
    apellidos: 'Fernández',
    telefono: '+34 667 890 123',
    activo: true,
    total_sesiones: 1,
    gasto_acumulado: 55,
    tipo_cliente: 'nuevo',
    bloqueada: false
  }
];

// SERVICIOS
export const servicios: Servicio[] = [
  {
    id: 'serv-1',
    nombre: 'Masaje Relajante',
    tipo: 'Relajante',
    duracion_minutos: 60,
    precio: 55,
    descripcion: 'Masaje suave para relajar cuerpo y mente',
    emoji: '🌸',
    activo: true
  },
  {
    id: 'serv-2',
    nombre: 'Masaje Descontracturante',
    tipo: 'Descontracturante',
    duracion_minutos: 60,
    precio: 60,
    descripcion: 'Masaje profundo para eliminar tensiones musculares',
    emoji: '💪',
    activo: true
  },
  {
    id: 'serv-3',
    nombre: 'Masaje Deportivo',
    tipo: 'Deportivo',
    duracion_minutos: 90,
    precio: 60,
    descripcion: 'Recuperación muscular para deportistas',
    emoji: '⚡',
    activo: true
  },
  {
    id: 'serv-4',
    nombre: 'Masaje Prenatal',
    tipo: 'Prenatal',
    duracion_minutos: 60,
    precio: 58,
    descripcion: 'Masaje especializado para embarazadas',
    emoji: '🤰',
    activo: true
  },
  {
    id: 'serv-5',
    nombre: 'Masaje Ayurveda',
    tipo: 'Ayurveda',
    duracion_minutos: 75,
    precio: 60,
    descripcion: 'Técnicas ancestrales de la India',
    emoji: '🧘',
    activo: true
  },
  {
    id: 'serv-6',
    nombre: 'Masaje en Pareja',
    tipo: 'Parejas',
    duracion_minutos: 90,
    precio: 60,
    descripcion: 'Experiencia relajante para dos personas',
    emoji: '💑',
    activo: true
  }
];

// RESERVAS
export const reservas: Reserva[] = [
  {
    id: 'res-1',
    codigo: 'MF-2024-001',
    clienta_id: 'cli-1',
    masajista_id: 'mas-1',
    servicio_id: 'serv-1',
    fecha: '2024-05-20',
    hora_inicio: '10:00',
    hora_fin: '11:00',
    direccion: {
      calle: 'Calle Alcalá',
      numero: '123',
      piso: '3º A',
      ciudad: 'Madrid',
      codigo_postal: '28009',
      barrio: 'Salamanca',
      instrucciones_acceso: 'Portal verde, llamar al 3A'
    },
    estado: 'confirmada',
    precio_total: 55,
    pago_masajista: 33,
    notas_clienta: 'Por favor, traer aceite sin aroma',
    creada_en: '2024-05-15T09:00:00Z'
  },
  {
    id: 'res-2',
    codigo: 'MF-2024-002',
    clienta_id: 'cli-2',
    masajista_id: 'mas-2',
    servicio_id: 'serv-2',
    fecha: '2024-05-18',
    hora_inicio: '16:00',
    hora_fin: '17:00',
    direccion: {
      calle: 'Calle Serrano',
      numero: '45',
      piso: '1º B',
      ciudad: 'Madrid',
      codigo_postal: '28001',
      barrio: 'Salamanca'
    },
    estado: 'completada',
    precio_total: 60,
    pago_masajista: 36,
    creada_en: '2024-05-12T14:00:00Z'
  },
  {
    id: 'res-3',
    codigo: 'MF-2024-003',
    clienta_id: 'cli-1',
    servicio_id: 'serv-1',
    fecha: '2024-05-22',
    hora_inicio: '18:00',
    hora_fin: '19:00',
    direccion: {
      calle: 'Calle Alcalá',
      numero: '123',
      piso: '3º A',
      ciudad: 'Madrid',
      codigo_postal: '28009',
      barrio: 'Salamanca'
    },
    estado: 'pendiente_asignacion',
    precio_total: 55,
    pago_masajista: 33,
    creada_en: '2024-05-18T10:00:00Z'
  },
  {
    id: 'res-4',
    codigo: 'MF-2024-004',
    clienta_id: 'cli-3',
    masajista_id: 'mas-1',
    servicio_id: 'serv-2',
    fecha: '2024-05-21',
    hora_inicio: '14:00',
    hora_fin: '15:00',
    direccion: {
      calle: 'Calle Velázquez',
      numero: '78',
      ciudad: 'Madrid',
      codigo_postal: '28001',
      barrio: 'Salamanca'
    },
    estado: 'confirmada',
    precio_total: 60,
    pago_masajista: 36,
    creada_en: '2024-05-16T11:00:00Z'
  }
];

// VALORACIONES
export const valoraciones: Valoracion[] = [
  {
    id: 'val-1',
    reserva_id: 'res-2',
    clienta_id: 'cli-2',
    masajista_id: 'mas-2',
    estrellas: 5,
    comentario: 'Excelente profesional, muy atenta y técnica impecable. Repetiré sin duda.',
    fecha: '2024-05-18'
  }
];

// TRANSFERENCIAS
export const transferencias: Transferencia[] = [
  {
    id: 'trans-1',
    masajista_id: 'mas-1',
    periodo_inicio: '2024-05-01',
    periodo_fin: '2024-05-15',
    sesiones: 8,
    importe_bruto: 440,
    importe_neto: 264,
    estado: 'confirmada',
    fecha_transferencia: '2024-05-16',
    referencia_bancaria: 'TRF-2024-05-001',
    reservas_incluidas: ['res-1']
  },
  {
    id: 'trans-2',
    masajista_id: 'mas-2',
    periodo_inicio: '2024-05-01',
    periodo_fin: '2024-05-15',
    sesiones: 6,
    importe_bruto: 360,
    importe_neto: 216,
    estado: 'enviada',
    fecha_transferencia: '2024-05-16',
    referencia_bancaria: 'TRF-2024-05-002',
    reservas_incluidas: ['res-2']
  },
  {
    id: 'trans-3',
    masajista_id: 'mas-1',
    periodo_inicio: '2024-05-16',
    periodo_fin: '2024-05-31',
    sesiones: 4,
    importe_bruto: 220,
    importe_neto: 132,
    estado: 'pendiente',
    reservas_incluidas: []
  }
];

// CONFIGURACIÓN
export const configuracionInicial: Configuracion = {
  comision_plataforma_pct: 40,
  pago_masajista_pct: 60,
  precio_maximo_sesion: 60,
  ciclo_pago: 'quincenal',
  presupuesto_meta_ads_pct: 10,
  moneda: 'EUR'
};

// USUARIOS COMPLETOS (para login)
export const allUsers = [
  adminUser,
  ...masajistas,
  ...clientas
];
