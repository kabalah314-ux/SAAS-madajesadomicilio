import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, User, Phone, CheckCircle, X, CalendarDays, Check, Ban } from 'lucide-react';
import { useApp } from '../../AppContext';
import { Reserva } from '../../types';

// Fecha local en formato YYYY-MM-DD (NO usar toISOString: desplaza el día por UTC).
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const DIAS_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DIAS_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type Slot = { dia: number; hora_inicio: string; hora_fin: string; activo: boolean };

export default function MiCalendario() {
  const { currentUser, reservas, servicios, marcarReservaCompletada, aceptarSolicitud, rechazarSolicitud, getDisponibilidad, navigate } = useApp();
  const [monthOffset, setMonthOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);
  const [rechazando, setRechazando] = useState<Reserva | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [disponibilidad, setDisponibilidad] = useState<Slot[]>([]);

  // Cargar la disponibilidad real de la masajista (franjas por día de semana).
  useEffect(() => {
    if (!currentUser) return;
    getDisponibilidad(currentUser.id).then(setDisponibilidad).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  if (!currentUser || currentUser.role !== 'masajista') return null;

  // Sesiones asignadas a esta masajista (agenda real).
  const misSesiones = reservas.filter(
    r => r.masajista_id === currentUser.id && (r.estado === 'confirmada' || r.estado === 'completada')
  );
  // Solicitudes abiertas que puede aceptar (sin asignar todavía).
  const solicitudes = reservas.filter(r => r.estado === 'pendiente_asignacion');

  const slotsActivos = disponibilidad.filter(s => s.activo);
  const disponibleEse = (dow: number) => slotsActivos.some(s => s.dia === dow);
  const slotsDelDia = (dow: number) =>
    slotsActivos.filter(s => s.dia === dow).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  const hoy = new Date();
  const hoyStr = ymd(hoy);

  // ---------- Calendario mensual ----------
  const viewMonth = new Date(hoy.getFullYear(), hoy.getMonth() + monthOffset, 1);
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Índice de columna (0=Lun … 6=Dom) del día 1.
  const primeraCol = (new Date(year, month, 1).getDay() + 6) % 7;
  const celdas: (Date | null)[] = [
    ...Array.from({ length: primeraCol }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  // ---------- Vista semanal ----------
  const getWeekStart = (offset: number) => {
    const base = new Date(hoy);
    const dow = base.getDay();
    const diff = base.getDate() - dow + (dow === 0 ? -6 : 1) + offset * 7; // lunes de esa semana
    const d = new Date(base);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const weekStart = getWeekStart(weekOffset);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00–21:00

  const sesionesDelDia = (date: Date) => misSesiones.filter(r => r.fecha === ymd(date));
  const sesionAHora = (date: Date, hour: number) =>
    sesionesDelDia(date).find(r => Number(r.hora_inicio.split(':')[0]) === hour);
  const disponibleAHora = (date: Date, hour: number) =>
    slotsDelDia(date.getDay()).some(s => hour >= Number(s.hora_inicio.slice(0, 2)) && hour < Number(s.hora_fin.slice(0, 2)));

  const getServicioColor = (tipo: string) => {
    const colors: Record<string, string> = {
      Relajante: 'bg-purple-100 border-purple-300 text-purple-700',
      Descontracturante: 'bg-blue-100 border-blue-300 text-blue-700',
      Deportivo: 'bg-red-100 border-red-300 text-red-700',
      Prenatal: 'bg-pink-100 border-pink-300 text-pink-700',
      Ayurveda: 'bg-yellow-100 border-yellow-300 text-yellow-700',
      Parejas: 'bg-rose-100 border-rose-300 text-rose-700',
    };
    return colors[tipo] || 'bg-teal-100 border-teal-300 text-teal-700';
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      confirmada: { label: 'Confirmada', class: 'bg-green-100 text-green-700' },
      completada: { label: 'Completada', class: 'bg-gray-100 text-gray-700' },
      pendiente_asignacion: { label: 'Solicitud', class: 'bg-amber-100 text-amber-700' },
      cancelada_clienta: { label: 'Cancelada', class: 'bg-red-100 text-red-700' },
      cancelada_masajista: { label: 'Cancelada', class: 'bg-red-100 text-red-700' },
    };
    return badges[estado] || { label: estado, class: 'bg-gray-100 text-gray-700' };
  };

  const handleMarcarCompletada = async () => {
    if (!selectedReserva) return;
    try {
      await marcarReservaCompletada(selectedReserva.id);
      setSelectedReserva(null);
    } catch (e: any) {
      alert(e?.message || 'No se pudo marcar como completada');
    }
  };

  const handleAceptar = async (reserva: Reserva) => {
    try {
      await aceptarSolicitud(reserva.id, currentUser.id);
    } catch (e: any) {
      alert(e?.message || 'No se pudo aceptar la solicitud');
    }
  };

  const handleRechazar = async () => {
    if (!rechazando || !motivoRechazo.trim()) return;
    try {
      await rechazarSolicitud(rechazando.id, motivoRechazo.trim());
      setRechazando(null);
      setMotivoRechazo('');
    } catch (e: any) {
      alert(e?.message || 'No se pudo rechazar la solicitud');
    }
  };

  // Lista: solicitudes pendientes + sesiones, ordenadas de la más próxima a la más lejana.
  const listaOrdenada = [...solicitudes, ...misSesiones].sort((a, b) => {
    const ka = `${a.fecha} ${a.hora_inicio}`;
    const kb = `${b.fecha} ${b.hora_inicio}`;
    return ka.localeCompare(kb);
  });

  const mesLabel = viewMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const weekLabel = weekOffset === 0
    ? 'Esta semana'
    : `Semana del ${weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mi Calendario</h2>
        <p className="text-gray-600 mt-1">Tu disponibilidad y tus sesiones en un vistazo</p>
      </div>

      {/* B7: aviso si no tiene disponibilidad configurada (no le entran reservas). */}
      {slotsActivos.length === 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <p className="font-medium text-amber-900">No recibirás reservas</p>
            <p className="text-sm text-amber-800 mt-0.5">
              Aún no has configurado tu disponibilidad. Sin horarios, ni las clientas ni el administrador pueden ofrecerte sesiones.
            </p>
            <button onClick={() => navigate('disponibilidad')} className="mt-2 text-sm font-medium text-amber-900 underline">
              Configurar mi disponibilidad
            </button>
          </div>
        </div>
      )}

      {/* 1) Calendario mensual */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMonthOffset(p => p - 1)} className="p-2 hover:bg-gray-100 rounded-lg transition" aria-label="Mes anterior">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <div className="font-semibold text-gray-900 capitalize">{mesLabel}</div>
            {monthOffset !== 0 && (
              <button onClick={() => setMonthOffset(0)} className="text-xs text-teal-600 hover:text-teal-700">Volver a hoy</button>
            )}
          </div>
          <button onClick={() => setMonthOffset(p => p + 1)} className="p-2 hover:bg-gray-100 rounded-lg transition" aria-label="Mes siguiente">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {DIAS_CORTO.map(d => (
            <div key={d} className="text-xs font-medium text-gray-500 py-1">{d}</div>
          ))}
          {celdas.map((date, i) => {
            if (!date) return <div key={`e${i}`} />;
            const esHoy = ymd(date) === hoyStr;
            const tieneDisp = disponibleEse(date.getDay());
            const sesiones = sesionesDelDia(date);
            const solis = solicitudes.filter(r => r.fecha === ymd(date));
            return (
              <div
                key={ymd(date)}
                className={`aspect-square rounded-lg border flex flex-col items-center justify-center relative transition ${
                  tieneDisp ? 'bg-teal-50 border-teal-300' : 'bg-white border-gray-100'
                } ${esHoy ? 'ring-2 ring-teal-500' : ''}`}
                title={tieneDisp ? 'Con disponibilidad' : 'Sin disponibilidad'}
              >
                <span className={`text-sm ${esHoy ? 'font-bold text-teal-700' : 'text-gray-700'}`}>{date.getDate()}</span>
                {(sesiones.length > 0 || solis.length > 0) && (
                  <div className="flex gap-0.5 mt-0.5">
                    {sesiones.slice(0, 3).map(s => (
                      <span key={s.id} className={`w-1.5 h-1.5 rounded-full ${s.estado === 'completada' ? 'bg-gray-400' : 'bg-green-500'}`} />
                    ))}
                    {solis.slice(0, 2).map(s => (
                      <span key={s.id} className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-teal-50 border border-teal-300 inline-block" /> Disponible</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Sesión</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Solicitud</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" /> Completada</span>
        </div>
      </div>

      {/* 2) Vista semanal */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="font-semibold text-gray-900 capitalize">
            {weekLabel}
            {weekOffset === 0 && <span className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full font-medium">Actual</span>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setWeekOffset(p => p - 1)} className="p-2 hover:bg-gray-100 rounded-lg transition" aria-label="Semana anterior"><ChevronLeft size={18} /></button>
            <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition">Hoy</button>
            <button onClick={() => setWeekOffset(p => p + 1)} className="p-2 hover:bg-gray-100 rounded-lg transition" aria-label="Semana siguiente"><ChevronRight size={18} /></button>
          </div>
        </div>

        {/* Escritorio: rejilla por horas */}
        <div className="hidden lg:block overflow-hidden">
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="p-2 text-center text-xs font-medium text-gray-500 bg-gray-50">Hora</div>
            {weekDays.map((date, i) => {
              const esHoy = ymd(date) === hoyStr;
              return (
                <div key={i} className={`p-2 text-center border-l border-gray-200 ${esHoy ? 'bg-teal-50' : 'bg-gray-50'}`}>
                  <div className="text-xs text-gray-500 font-medium">{DIAS_CORTO[i]}</div>
                  <div className={`text-base font-semibold ${esHoy ? 'text-teal-600' : 'text-gray-900'}`}>{date.getDate()}</div>
                </div>
              );
            })}
          </div>
          <div className="divide-y divide-gray-100">
            {hours.map(hour => (
              <div key={hour} className="grid grid-cols-8">
                <div className="p-2 text-center text-xs text-gray-500 bg-gray-50 border-r border-gray-200">{String(hour).padStart(2, '0')}:00</div>
                {weekDays.map((date, i) => {
                  const reserva = sesionAHora(date, hour);
                  const servicio = reserva ? servicios.find(s => s.id === reserva.servicio_id) : null;
                  const disp = disponibleAHora(date, hour);
                  return (
                    <div key={i} className={`p-1 border-l border-gray-100 min-h-[56px] ${disp && !reserva ? 'bg-teal-50/60' : ''}`}>
                      {reserva && servicio && (
                        <button
                          onClick={() => setSelectedReserva(reserva)}
                          className={`w-full h-full p-1.5 rounded-lg border text-left ${getServicioColor(servicio.tipo)}`}
                        >
                          <div className="text-[11px] font-semibold">{reserva.hora_inicio}</div>
                          <div className="text-[11px] truncate">{servicio.emoji} {servicio.nombre}</div>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Móvil: lista por día de la semana con disponibilidad + sesiones */}
        <div className="lg:hidden divide-y divide-gray-100">
          {weekDays.map((date, i) => {
            const esHoy = ymd(date) === hoyStr;
            const franjas = slotsDelDia(date.getDay());
            const sesiones = sesionesDelDia(date).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
            return (
              <div key={i} className={`p-4 ${esHoy ? 'bg-teal-50/50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900 capitalize">
                    {DIAS_LARGO[date.getDay()]} {date.getDate()}
                    {esHoy && <span className="ml-2 text-teal-600 text-xs">(Hoy)</span>}
                  </div>
                  <div className="text-xs text-gray-500">
                    {franjas.length > 0 ? franjas.map(f => `${f.hora_inicio}–${f.hora_fin}`).join(', ') : 'No disponible'}
                  </div>
                </div>
                {sesiones.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {sesiones.map(reserva => {
                      const servicio = servicios.find(s => s.id === reserva.servicio_id);
                      return (
                        <button
                          key={reserva.id}
                          onClick={() => setSelectedReserva(reserva)}
                          className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${getServicioColor(servicio?.tipo || '')}`}
                        >
                          <span className="font-semibold">{reserva.hora_inicio}</span> · {servicio?.emoji} {servicio?.nombre}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3) Botón modificar horario */}
      <button
        onClick={() => navigate('disponibilidad')}
        className="w-full sm:w-auto px-5 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium text-gray-700 flex items-center justify-center gap-2"
      >
        <CalendarDays size={18} />
        Modificar mi horario
      </button>

      {/* 4) Lista de sesiones y solicitudes (próximas primero) */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Sesiones y solicitudes</h3>
        {listaOrdenada.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 text-center py-10 text-gray-500">
            <Clock size={40} className="mx-auto mb-3 text-gray-300" />
            <p>No tienes sesiones ni solicitudes por ahora.</p>
            <button onClick={() => navigate('solicitudes')} className="mt-3 text-teal-600 hover:text-teal-700 font-medium">Ver solicitudes</button>
          </div>
        ) : (
          <div className="space-y-3">
            {listaOrdenada.map(reserva => {
              const servicio = servicios.find(s => s.id === reserva.servicio_id);
              const estado = getEstadoBadge(reserva.estado);
              const esSolicitud = reserva.estado === 'pendiente_asignacion';
              const fechaTxt = new Date(reserva.fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
              return (
                <div key={reserva.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => !esSolicitud && setSelectedReserva(reserva)}
                      className="flex items-start gap-3 text-left min-w-0 flex-1"
                    >
                      <div className="text-2xl">{servicio?.emoji}</div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{servicio?.nombre}</div>
                        <div className="text-sm text-gray-600 mt-0.5 capitalize">
                          {fechaTxt} · {reserva.hora_inicio}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {esSolicitud
                            ? (reserva.direccion.barrio || reserva.direccion.ciudad || 'Zona sin especificar')
                            : (reserva.cliente_nombre || 'Cliente')}
                        </div>
                      </div>
                    </button>
                    <span className={`inline-flex flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${estado.class}`}>{estado.label}</span>
                  </div>
                  {esSolicitud && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleAceptar(reserva)}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:from-teal-600 hover:to-emerald-700 transition text-sm font-medium flex items-center justify-center gap-1"
                      >
                        <Check size={16} />Aceptar
                      </button>
                      <button
                        onClick={() => { setRechazando(reserva); setMotivoRechazo(''); }}
                        className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium flex items-center justify-center gap-1"
                      >
                        <Ban size={16} />Rechazar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal detalle de sesión */}
      {selectedReserva && (() => {
        const servicio = servicios.find(s => s.id === selectedReserva.servicio_id);
        return (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setSelectedReserva(null)} />
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
              <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{servicio?.emoji}</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">{servicio?.nombre}</h3>
                      <p className="text-gray-600 mt-1 capitalize">
                        {new Date(selectedReserva.fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadge(selectedReserva.estado).class}`}>
                      {getEstadoBadge(selectedReserva.estado).label}
                    </span>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3 text-gray-700">
                    <Clock size={20} className="text-gray-400" />
                    <div><div className="text-sm text-gray-500">Horario</div><div className="font-medium">{selectedReserva.hora_inicio} - {selectedReserva.hora_fin}</div></div>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <User size={20} className="text-gray-400" />
                    <div><div className="text-sm text-gray-500">Cliente</div><div className="font-medium">{selectedReserva.cliente_nombre || 'Cliente'}</div></div>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <Phone size={20} className="text-gray-400" />
                    <div><div className="text-sm text-gray-500">Teléfono</div><div className="font-medium">{selectedReserva.cliente_telefono || 'No disponible'}</div></div>
                  </div>
                  <div className="flex items-start gap-3 text-gray-700">
                    <MapPin size={20} className="text-gray-400 mt-1" />
                    <div>
                      <div className="text-sm text-gray-500">Dirección</div>
                      <div className="font-medium">
                        {selectedReserva.direccion.calle} {selectedReserva.direccion.numero}
                        {selectedReserva.direccion.piso && `, ${selectedReserva.direccion.piso}`}
                      </div>
                      <div className="text-sm text-gray-600">{selectedReserva.direccion.codigo_postal} {selectedReserva.direccion.ciudad}</div>
                      {selectedReserva.direccion.instrucciones_acceso && (
                        <div className="text-sm text-gray-600 mt-1 italic">"{selectedReserva.direccion.instrucciones_acceso}"</div>
                      )}
                    </div>
                  </div>
                  {selectedReserva.notas_clienta && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-sm font-medium text-blue-900 mb-1">Notas de la cliente:</div>
                      <div className="text-sm text-blue-700">{selectedReserva.notas_clienta}</div>
                    </div>
                  )}
                </div>
                <div className="p-6 border-t border-gray-200 flex gap-3">
                  <button onClick={() => setSelectedReserva(null)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">Cerrar</button>
                  {selectedReserva.estado === 'confirmada' && (
                    <button onClick={handleMarcarCompletada} className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition font-medium flex items-center justify-center gap-2">
                      <CheckCircle size={20} />Marcar Completada
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Modal rechazar solicitud (motivo obligatorio) */}
      {rechazando && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => { setRechazando(null); setMotivoRechazo(''); }} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200 flex items-start justify-between">
                <h3 className="text-lg font-bold text-gray-900">Rechazar solicitud {rechazando.codigo}</h3>
                <button onClick={() => { setRechazando(null); setMotivoRechazo(''); }} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-6">
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  rows={3}
                  autoFocus
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none"
                  placeholder="Motivo del rechazo..."
                />
              </div>
              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button onClick={() => { setRechazando(null); setMotivoRechazo(''); }} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">Volver</button>
                <button onClick={handleRechazar} disabled={!motivoRechazo.trim()} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">Confirmar rechazo</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
