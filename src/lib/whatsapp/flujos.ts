// Motor de flujos conversacionales para WhatsApp
import type { ConversacionWhatsApp, Intencion } from '@/types/whatsapp';
import {
  actualizarConversacion,
  resetearConversacion,
  getConfiguracion,
  getServicios,
  buscarMasajistaDisponible,
  crearReserva,
  getOrCreateCliente,
  getReservasActivas,
  cancelarReserva,
} from './supabase-helpers';
import { enviarMensajeWhatsApp } from './send-message';

/**
 * Procesa un mensaje según la intención detectada y el estado actual
 */
export async function procesarFlujo(
  conversacion: ConversacionWhatsApp,
  mensaje: string,
  intencion: Intencion
): Promise<void> {
  console.log(`Procesando flujo: ${intencion} | Estado: ${conversacion.estado_flujo}`);

  try {
    switch (intencion) {
      case 'SALUDO':
        await manejarSaludo(conversacion);
        break;

      case 'RESERVAR_CITA':
        await manejarReservarCita(conversacion, mensaje);
        break;

      case 'CANCELAR_CITA':
        await manejarCancelarCita(conversacion, mensaje);
        break;

      case 'CONSULTAR_PRECIOS':
        await manejarConsultarPrecios(conversacion);
        break;

      case 'CONSULTAR_SERVICIOS':
        await manejarConsultarServicios(conversacion);
        break;

      case 'CONSULTAR_ZONA':
        await manejarConsultarZona(conversacion, mensaje);
        break;

      case 'CONSULTAR_DISPONIBILIDAD':
        await manejarConsultarDisponibilidad(conversacion, mensaje);
        break;

      case 'ESTADO_RESERVA':
        await manejarEstadoReserva(conversacion);
        break;

      case 'NO_ENTENDIDO':
        await manejarNoEntendido(conversacion);
        break;

      default:
        await manejarNoEntendido(conversacion);
    }
  } catch (error: any) {
    console.error('Error procesando flujo:', error);
    await enviarMensajeWhatsApp({
      numero: conversacion.numero_whatsapp,
      mensaje: '❌ Ocurrió un error procesando tu solicitud. Por favor intenta de nuevo.',
      conversacionId: conversacion.id,
    });
  }
}

/**
 * SALUDO - Mensaje de bienvenida
 */
async function manejarSaludo(conversacion: ConversacionWhatsApp): Promise<void> {
  await resetearConversacion(conversacion.id);

  const mensajeBienvenida =
    (await getConfiguracion('mensaje_bienvenida')) ||
    '¡Hola! 👋 Bienvenido a MassFlow.\n\n1️⃣ Reservar cita\n2️⃣ Consultar precios\n3️⃣ Ver servicios\n4️⃣ Cancelar cita';

  await enviarMensajeWhatsApp({
    numero: conversacion.numero_whatsapp,
    mensaje: mensajeBienvenida,
    conversacionId: conversacion.id,
  });
}

/**
 * RESERVAR_CITA - Flujo multi-paso
 */
async function manejarReservarCita(
  conversacion: ConversacionWhatsApp,
  mensaje: string
): Promise<void> {
  const estado = conversacion.estado_flujo;
  const datos = conversacion.datos_temporales;

  // PASO 1: Preguntar tipo de servicio
  if (estado === 'INICIO' || estado === 'COMPLETADO') {
    const servicios = await getServicios();
    let respuesta = '🌺 ¿Qué tipo de masaje te interesa?\n\n';

    servicios.forEach((s: any, idx: number) => {
      respuesta += `${idx + 1}️⃣ ${s.nombre} - ${s.precio_eur}€\n`;
    });

    respuesta += '\nResponde con el número o el nombre del servicio.';

    await enviarMensajeWhatsApp({
      numero: conversacion.numero_whatsapp,
      mensaje: respuesta,
      conversacionId: conversacion.id,
    });

    await actualizarConversacion(conversacion.id, {
      estado_flujo: 'RESERVAR_PASO_1',
      paso_actual: 1,
      datos_temporales: { servicios_lista: servicios },
    });
    return;
  }

  // PASO 2: Recibir tipo de servicio, preguntar fecha
  if (estado === 'RESERVAR_PASO_1') {
    const servicios = datos.servicios_lista || (await getServicios());
    let servicioSeleccionado: any = null;

    // Intentar parsear por número
    const numero = parseInt(mensaje.trim());
    if (!isNaN(numero) && numero > 0 && numero <= servicios.length) {
      servicioSeleccionado = servicios[numero - 1];
    } else {
      // Buscar por nombre
      servicioSeleccionado = servicios.find((s: any) =>
        s.nombre.toLowerCase().includes(mensaje.toLowerCase())
      );
    }

    if (!servicioSeleccionado) {
      await enviarMensajeWhatsApp({
        numero: conversacion.numero_whatsapp,
        mensaje:
          '❌ No encontré ese servicio. Por favor elige uno de la lista con el número (ej: 1) o el nombre.',
        conversacionId: conversacion.id,
      });
      return;
    }

    await enviarMensajeWhatsApp({
      numero: conversacion.numero_whatsapp,
      mensaje: `Perfecto! Elegiste ${servicioSeleccionado.nombre} (${servicioSeleccionado.precio_eur}€)\n\n📅 ¿Para qué fecha? Por favor responde en formato DD/MM/AAAA\nEjemplo: 15/05/2026`,
      conversacionId: conversacion.id,
    });

    await actualizarConversacion(conversacion.id, {
      estado_flujo: 'RESERVAR_PASO_2',
      paso_actual: 2,
      datos_temporales: {
        ...datos,
        servicio_id: servicioSeleccionado.id,
        tipo_servicio: servicioSeleccionado.nombre,
        precio: servicioSeleccionado.precio_eur,
        duracion_min: servicioSeleccionado.duracion_min,
      },
    });
    return;
  }

  // PASO 3: Recibir fecha, preguntar hora
  if (estado === 'RESERVAR_PASO_2') {
    const fecha = parsearFecha(mensaje);
    if (!fecha) {
      await enviarMensajeWhatsApp({
        numero: conversacion.numero_whatsapp,
        mensaje: '❌ Fecha inválida. Usa formato DD/MM/AAAA (ej: 15/05/2026)',
        conversacionId: conversacion.id,
      });
      return;
    }

    // Validar que no sea fecha pasada
    const fechaObj = new Date(fecha);
    if (fechaObj < new Date()) {
      await enviarMensajeWhatsApp({
        numero: conversacion.numero_whatsapp,
        mensaje: '❌ No puedes reservar en una fecha pasada. Elige una fecha futura.',
        conversacionId: conversacion.id,
      });
      return;
    }

    await enviarMensajeWhatsApp({
      numero: conversacion.numero_whatsapp,
      mensaje: `Fecha: ${formatearFecha(fecha)} ✓\n\n⏰ ¿A qué hora? Responde en formato HH:MM (24h)\nEjemplo: 14:00 o 18:30`,
      conversacionId: conversacion.id,
    });

    await actualizarConversacion(conversacion.id, {
      estado_flujo: 'RESERVAR_PASO_3',
      paso_actual: 3,
      datos_temporales: { ...datos, fecha },
    });
    return;
  }

  // PASO 4: Recibir hora, preguntar dirección
  if (estado === 'RESERVAR_PASO_3') {
    const hora = parsearHora(mensaje);
    if (!hora) {
      await enviarMensajeWhatsApp({
        numero: conversacion.numero_whatsapp,
        mensaje: '❌ Hora inválida. Usa formato HH:MM (ej: 14:00 o 18:30)',
        conversacionId: conversacion.id,
      });
      return;
    }

    await enviarMensajeWhatsApp({
      numero: conversacion.numero_whatsapp,
      mensaje: `Hora: ${hora} ✓\n\n📍 ¿Cuál es tu dirección completa en Madrid?\nEjemplo: Calle Gran Vía 28, 3º A, Madrid 28013`,
      conversacionId: conversacion.id,
    });

    await actualizarConversacion(conversacion.id, {
      estado_flujo: 'RESERVAR_PASO_4',
      paso_actual: 4,
      datos_temporales: { ...datos, hora },
    });
    return;
  }

  // PASO 5: Recibir dirección, buscar masajista, pedir confirmación
  if (estado === 'RESERVAR_PASO_4') {
    const direccion = mensaje.trim();
    if (direccion.length < 10) {
      await enviarMensajeWhatsApp({
        numero: conversacion.numero_whatsapp,
        mensaje: '❌ Por favor proporciona una dirección completa.',
        conversacionId: conversacion.id,
      });
      return;
    }

    // Buscar masajista disponible
    const masajista = await buscarMasajistaDisponible(datos.fecha, datos.hora);

    let respuesta = `📋 Resumen de tu reserva:\n\n`;
    respuesta += `💆‍♀️ Servicio: ${datos.tipo_servicio}\n`;
    respuesta += `📅 Fecha: ${formatearFecha(datos.fecha)}\n`;
    respuesta += `⏰ Hora: ${datos.hora}\n`;
    respuesta += `📍 Dirección: ${direccion}\n`;
    respuesta += `💰 Precio: ${datos.precio}€\n`;

    if (masajista) {
      respuesta += `\n✅ Masajista disponible: ${masajista.profiles.full_name}\n`;
    } else {
      respuesta += `\n⚠️ Aún no hay masajista asignada (se asignará pronto)\n`;
    }

    respuesta += `\n¿Confirmas la reserva? Responde SI o NO`;

    await enviarMensajeWhatsApp({
      numero: conversacion.numero_whatsapp,
      mensaje: respuesta,
      conversacionId: conversacion.id,
    });

    await actualizarConversacion(conversacion.id, {
      estado_flujo: 'RESERVAR_PASO_5',
      paso_actual: 5,
      datos_temporales: {
        ...datos,
        direccion,
        masajista_id: masajista?.id || null,
        masajista_nombre: masajista?.profiles?.full_name || null,
      },
    });
    return;
  }

  // PASO 6: Confirmar y crear reserva
  if (estado === 'RESERVAR_PASO_5') {
    const confirmacion = mensaje.trim().toLowerCase();

    if (confirmacion === 'no' || confirmacion === 'cancelar') {
      await enviarMensajeWhatsApp({
        numero: conversacion.numero_whatsapp,
        mensaje: '❌ Reserva cancelada. ¿Puedo ayudarte en algo más?',
        conversacionId: conversacion.id,
      });
      await resetearConversacion(conversacion.id);
      return;
    }

    if (confirmacion !== 'si' && confirmacion !== 'sí' && confirmacion !== 'confirmar') {
      await enviarMensajeWhatsApp({
        numero: conversacion.numero_whatsapp,
        mensaje: 'Por favor responde SI para confirmar o NO para cancelar.',
        conversacionId: conversacion.id,
      });
      return;
    }

    // Crear o vincular cliente
    const clienteId = await getOrCreateCliente(conversacion.numero_whatsapp);

    // Crear reserva
    const reserva = await crearReserva({
      cliente_id: clienteId,
      servicio_id: datos.servicio_id,
      masajista_id: datos.masajista_id,
      fecha: datos.fecha,
      hora_inicio: datos.hora,
      duracion_min: datos.duracion_min,
      direccion_servicio: datos.direccion,
      ciudad: 'Madrid',
      precio_total: datos.precio,
      comision_pct: 25, // 25% comisión
    });

    let respuesta = `✅ ¡Reserva confirmada!\n\n`;
    respuesta += `📋 Código: ${reserva.codigo}\n`;
    respuesta += `💆‍♀️ ${datos.tipo_servicio}\n`;
    respuesta += `📅 ${formatearFecha(datos.fecha)} a las ${datos.hora}\n`;
    respuesta += `📍 ${datos.direccion}\n`;

    if (datos.masajista_nombre) {
      respuesta += `👩‍⚕️ Masajista: ${datos.masajista_nombre}\n`;
    }

    respuesta += `💰 Total: ${datos.precio}€\n`;
    respuesta += `\n¡Nos vemos pronto! 🌸`;

    await enviarMensajeWhatsApp({
      numero: conversacion.numero_whatsapp,
      mensaje: respuesta,
      conversacionId: conversacion.id,
    });

    await actualizarConversacion(conversacion.id, {
      estado_flujo: 'COMPLETADO',
      paso_actual: 0,
      datos_temporales: { ultima_reserva_id: reserva.id },
    });
  }
}

/**
 * CANCELAR_CITA - Flujo de cancelación
 */
async function manejarCancelarCita(
  conversacion: ConversacionWhatsApp,
  mensaje: string
): Promise<void> {
  const estado = conversacion.estado_flujo;

  if (estado === 'INICIO' || estado === 'COMPLETADO') {
    const reservas = await getReservasActivas(conversacion.numero_whatsapp);

    if (reservas.length === 0) {
      await enviarMensajeWhatsApp({
        numero: conversacion.numero_whatsapp,
        mensaje: '❌ No tienes reservas activas para cancelar.',
        conversacionId: conversacion.id,
      });
      await resetearConversacion(conversacion.id);
      return;
    }

    let respuesta = '📋 Tus reservas activas:\n\n';
    reservas.forEach((r: any, idx: number) => {
      respuesta += `${idx + 1}. ${r.servicio.nombre}\n`;
      respuesta += `   📅 ${formatearFecha(r.fecha)} - ${r.hora_inicio}\n`;
      respuesta += `   👩‍⚕️ ${r.masajista?.profiles?.full_name || 'Por asignar'}\n\n`;
    });

    respuesta += 'Responde con el número de la reserva que deseas cancelar.';

    await enviarMensajeWhatsApp({
      numero: conversacion.numero_whatsapp,
      mensaje: respuesta,
      conversacionId: conversacion.id,
    });

    await actualizarConversacion(conversacion.id, {
      estado_flujo: 'CANCELAR_PASO_1',
      paso_actual: 1,
      datos_temporales: { reservas_lista: reservas },
    });
    return;
  }

  if (estado === 'CANCELAR_PASO_1') {
    const numero = parseInt(mensaje.trim());
    const reservas = conversacion.datos_temporales.reservas_lista || [];

    if (isNaN(numero) || numero < 1 || numero > reservas.length) {
      await enviarMensajeWhatsApp({
        numero: conversacion.numero_whatsapp,
        mensaje: '❌ Número inválido. Elige uno de la lista.',
        conversacionId: conversacion.id,
      });
      return;
    }

    const reserva = reservas[numero - 1];

    await enviarMensajeWhatsApp({
      numero: conversacion.numero_whatsapp,
      mensaje: `⚠️ ¿Confirmas que deseas cancelar?\n\n${reserva.servicio.nombre}\n📅 ${formatearFecha(reserva.fecha)} - ${reserva.hora_inicio}\n\nResponde SI o NO`,
      conversacionId: conversacion.id,
    });

    await actualizarConversacion(conversacion.id, {
      estado_flujo: 'CANCELAR_PASO_2',
      paso_actual: 2,
      datos_temporales: { ...conversacion.datos_temporales, reserva_seleccionada: reserva },
    });
    return;
  }

  if (estado === 'CANCELAR_PASO_2') {
    const confirmacion = mensaje.trim().toLowerCase();

    if (confirmacion !== 'si' && confirmacion !== 'sí') {
      await enviarMensajeWhatsApp({
        numero: conversacion.numero_whatsapp,
        mensaje: '✅ Cancelación abortada. Tu reserva sigue activa.',
        conversacionId: conversacion.id,
      });
      await resetearConversacion(conversacion.id);
      return;
    }

    const reserva = conversacion.datos_temporales.reserva_seleccionada;
    await cancelarReserva(reserva.id, 'Cancelada por el cliente vía WhatsApp');

    await enviarMensajeWhatsApp({
      numero: conversacion.numero_whatsapp,
      mensaje: '✅ Reserva cancelada correctamente. ¿Puedo ayudarte en algo más?',
      conversacionId: conversacion.id,
    });

    await resetearConversacion(conversacion.id);
  }
}

/**
 * CONSULTAR_PRECIOS - Respuesta estática
 */
async function manejarConsultarPrecios(conversacion: ConversacionWhatsApp): Promise<void> {
  const respuesta =
    (await getConfiguracion('respuesta_precios')) || '💰 Consulta nuestros precios en el panel.';

  await enviarMensajeWhatsApp({
    numero: conversacion.numero_whatsapp,
    mensaje: respuesta,
    conversacionId: conversacion.id,
  });
}

/**
 * CONSULTAR_SERVICIOS - Respuesta estática
 */
async function manejarConsultarServicios(conversacion: ConversacionWhatsApp): Promise<void> {
  const respuesta =
    (await getConfiguracion('respuesta_servicios')) ||
    '🌺 Ofrecemos masajes relajantes, descontracturantes y más.';

  await enviarMensajeWhatsApp({
    numero: conversacion.numero_whatsapp,
    mensaje: respuesta,
    conversacionId: conversacion.id,
  });
}

/**
 * CONSULTAR_ZONA - Verifica si llegamos a su zona
 */
async function manejarConsultarZona(
  conversacion: ConversacionWhatsApp,
  mensaje: string
): Promise<void> {
  const zonas = (await getConfiguracion('zonas_cobertura')) || [];
  const zonaMencionada = zonas.find((z: string) =>
    mensaje.toLowerCase().includes(z.toLowerCase())
  );

  let respuesta = '';
  if (zonaMencionada) {
    respuesta = `✅ ¡Sí! Llegamos a ${zonaMencionada}.\n\n¿Te gustaría reservar una cita?`;
  } else {
    respuesta = `📍 Llegamos a las siguientes zonas de Madrid:\n\n${zonas.join(', ')}\n\n¿Tu zona está en la lista?`;
  }

  await enviarMensajeWhatsApp({
    numero: conversacion.numero_whatsapp,
    mensaje: respuesta,
    conversacionId: conversacion.id,
  });
}

/**
 * CONSULTAR_DISPONIBILIDAD - Simplificado
 */
async function manejarConsultarDisponibilidad(
  conversacion: ConversacionWhatsApp,
  mensaje: string
): Promise<void> {
  await enviarMensajeWhatsApp({
    numero: conversacion.numero_whatsapp,
    mensaje:
      '📅 Tenemos disponibilidad todos los días de 9:00 a 21:00.\n\n¿Te gustaría reservar una cita?',
    conversacionId: conversacion.id,
  });
}

/**
 * ESTADO_RESERVA - Consultar reservas del cliente
 */
async function manejarEstadoReserva(conversacion: ConversacionWhatsApp): Promise<void> {
  const reservas = await getReservasActivas(conversacion.numero_whatsapp);

  if (reservas.length === 0) {
    await enviarMensajeWhatsApp({
      numero: conversacion.numero_whatsapp,
      mensaje: '❌ No tienes reservas activas en este momento.',
      conversacionId: conversacion.id,
    });
    return;
  }

  let respuesta = '📋 Tus reservas:\n\n';
  reservas.forEach((r: any) => {
    respuesta += `✓ ${r.servicio.nombre}\n`;
    respuesta += `📅 ${formatearFecha(r.fecha)} - ${r.hora_inicio}\n`;
    respuesta += `👩‍⚕️ ${r.masajista?.profiles?.full_name || 'Por asignar'}\n`;
    respuesta += `📌 Estado: ${r.estado}\n\n`;
  });

  await enviarMensajeWhatsApp({
    numero: conversacion.numero_whatsapp,
    mensaje: respuesta,
    conversacionId: conversacion.id,
  });
}

/**
 * NO_ENTENDIDO - Manejo de fallback
 */
async function manejarNoEntendido(conversacion: ConversacionWhatsApp): Promise<void> {
  const intentos = conversacion.intentos_no_entendido + 1;

  await actualizarConversacion(conversacion.id, {
    intentos_no_entendido: intentos,
  });

  if (intentos >= 2) {
    // Escalar a humano
    await actualizarConversacion(conversacion.id, {
      requiere_humano: true,
    });

    const mensajeEscalado =
      (await getConfiguracion('mensaje_escalado_humano')) ||
      'Un momento, te estoy conectando con un asesor...';

    await enviarMensajeWhatsApp({
      numero: conversacion.numero_whatsapp,
      mensaje: mensajeEscalado,
      conversacionId: conversacion.id,
    });
  } else {
    const mensajeNoEntendido =
      (await getConfiguracion('mensaje_no_entendido')) ||
      '🤔 No entendí tu mensaje. ¿Puedes reformular?';

    await enviarMensajeWhatsApp({
      numero: conversacion.numero_whatsapp,
      mensaje: mensajeNoEntendido,
      conversacionId: conversacion.id,
    });
  }
}

// ============== HELPERS ==============

function parsearFecha(texto: string): string | null {
  // Formatos aceptados: DD/MM/AAAA, DD/MM/AA, DD-MM-AAAA
  const regex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
  const match = texto.match(regex);

  if (!match) return null;

  let dia = parseInt(match[1]);
  let mes = parseInt(match[2]);
  let anio = parseInt(match[3]);

  // Convertir año corto a largo
  if (anio < 100) {
    anio += 2000;
  }

  // Validar
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;

  // Formato YYYY-MM-DD para Supabase
  return `${anio}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
}

function parsearHora(texto: string): string | null {
  // Formato: HH:MM
  const regex = /(\d{1,2}):(\d{2})/;
  const match = texto.match(regex);

  if (!match) return null;

  const hora = parseInt(match[1]);
  const minuto = parseInt(match[2]);

  if (hora < 0 || hora > 23 || minuto < 0 || minuto > 59) return null;

  return `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
}

function formatearFecha(fecha: string): string {
  const date = new Date(fecha + 'T00:00:00');
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
