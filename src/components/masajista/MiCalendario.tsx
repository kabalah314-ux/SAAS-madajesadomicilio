import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, User, Phone, CheckCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../../AppContext';
import { Reserva, Servicio } from '../../types';
import EmptyState from '../EmptyState';

export default function MiCalendario() {
  const { currentUser, reservas, servicios, clientas, marcarReservaCompletada } = useApp();
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = esta semana
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);

  if (!currentUser || currentUser.role !== 'masajista') return null;

  // Obtener reservas de la masajista
  const misReservas = reservas.filter(r => 
    r.masajista_id === currentUser.id && 
    (r.estado === 'confirmada' || r.estado === 'completada')
  );

  // Calcular inicio de semana
  const getWeekStart = (offset: number) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) + (offset * 7);
    const weekStart = new Date(today.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  const weekStart = getWeekStart(selectedWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return date;
  });

  const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8:00 a 22:00

  const getReservasForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return misReservas.filter(r => r.fecha === dateStr);
  };

  const getReservaAtTime = (date: Date, hour: number) => {
    const reservasDay = getReservasForDay(date);
    return reservasDay.find(r => {
      const [h] = r.hora_inicio.split(':').map(Number);
      return h === hour;
    });
  };

  const getServicioColor = (tipo: string) => {
    const colors: Record<string, string> = {
      'Relajante': 'bg-purple-100 border-purple-300 text-purple-700',
      'Descontracturante': 'bg-blue-100 border-blue-300 text-blue-700',
      'Deportivo': 'bg-red-100 border-red-300 text-red-700',
      'Prenatal': 'bg-pink-100 border-pink-300 text-pink-700',
      'Ayurveda': 'bg-yellow-100 border-yellow-300 text-yellow-700',
      'Parejas': 'bg-rose-100 border-rose-300 text-rose-700'
    };
    return colors[tipo] || 'bg-gray-100 border-gray-300 text-gray-700';
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      'confirmada': { label: 'Confirmada', class: 'bg-green-100 text-green-700' },
      'completada': { label: 'Completada', class: 'bg-gray-100 text-gray-700' }
    };
    return badges[estado] || { label: estado, class: 'bg-gray-100 text-gray-700' };
  };

  const handleMarcarCompletada = () => {
    if (selectedReserva) {
      marcarReservaCompletada(selectedReserva.id);
      setSelectedReserva(null);
    }
  };

  const isCurrentWeek = selectedWeek === 0;
  const weekLabel = isCurrentWeek 
    ? 'Esta semana' 
    : `Semana del ${weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;

  if (misReservas.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No tienes sesiones programadas"
        description="Cuando aceptes solicitudes o se te asignen sesiones, aparecerán aquí en tu calendario semanal."
        action={{
          label: 'Ver solicitudes pendientes',
          onClick: () => {} // La navegación se maneja desde el padre
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con navegación semanal */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mi Calendario</h2>
          <p className="text-gray-600 mt-1">
            {weekLabel}
            {isCurrentWeek && (
              <span className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full font-medium">
                Actual
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedWeek(prev => prev - 1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setSelectedWeek(0)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
          >
            Hoy
          </button>
          <button
            onClick={() => setSelectedWeek(prev => prev + 1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Vista de escritorio: calendario semanal */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-8 border-b border-gray-200">
          <div className="p-3 text-center text-sm font-medium text-gray-600 bg-gray-50">
            Hora
          </div>
          {weekDays.map((date, i) => {
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <div 
                key={i} 
                className={`p-3 text-center border-l border-gray-200 ${isToday ? 'bg-teal-50' : 'bg-gray-50'}`}
              >
                <div className="text-xs text-gray-600 font-medium">
                  {date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}
                </div>
                <div className={`text-lg font-semibold mt-1 ${isToday ? 'text-teal-600' : 'text-gray-900'}`}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        <div className="divide-y divide-gray-200">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8">
              <div className="p-3 text-center text-sm text-gray-600 bg-gray-50 border-r border-gray-200">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {weekDays.map((date, i) => {
                const reserva = getReservaAtTime(date, hour);
                const servicio = reserva ? servicios.find(s => s.id === reserva.servicio_id) : null;
                const clienta = reserva ? clientas.find(c => c.id === reserva.clienta_id) : null;

                return (
                  <div 
                    key={i} 
                    className="p-2 border-l border-gray-200 min-h-[80px] hover:bg-gray-50 transition"
                  >
                    {reserva && servicio && (
                      <button
                        onClick={() => setSelectedReserva(reserva)}
                        className={`w-full h-full p-2 rounded-lg border-2 text-left ${getServicioColor(servicio.tipo)}`}
                      >
                        <div className="text-xs font-semibold">{reserva.hora_inicio} - {reserva.hora_fin}</div>
                        <div className="text-xs mt-1 flex items-center gap-1">
                          <span>{servicio.emoji}</span>
                          <span className="font-medium truncate">{servicio.nombre}</span>
                        </div>
                        {clienta && (
                          <div className="text-xs mt-1 truncate">{clienta.nombre}</div>
                        )}
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] mt-1 ${getEstadoBadge(reserva.estado).class}`}>
                          {getEstadoBadge(reserva.estado).label}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Vista móvil: lista de sesiones agrupadas por día */}
      <div className="lg:hidden space-y-4">
        {weekDays.map(date => {
          const reservasDay = getReservasForDay(date);
          if (reservasDay.length === 0) return null;

          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <div key={date.toISOString()} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className={`p-4 border-b border-gray-200 ${isToday ? 'bg-teal-50' : 'bg-gray-50'}`}>
                <div className="font-semibold text-gray-900">
                  {date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {isToday && <span className="ml-2 text-teal-600 text-sm">(Hoy)</span>}
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {reservasDay.map(reserva => {
                  const servicio = servicios.find(s => s.id === reserva.servicio_id);
                  const clienta = clientas.find(c => c.id === reserva.clienta_id);
                  
                  return (
                    <button
                      key={reserva.id}
                      onClick={() => setSelectedReserva(reserva)}
                      className="w-full p-4 text-left hover:bg-gray-50 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{servicio?.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{servicio?.nombre}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {reserva.hora_inicio} - {reserva.hora_fin} • {clienta?.nombre}
                          </div>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs mt-2 ${getEstadoBadge(reserva.estado).class}`}>
                            {getEstadoBadge(reserva.estado).label}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de detalle de sesión */}
      {selectedReserva && (() => {
        const servicio = servicios.find(s => s.id === selectedReserva.servicio_id);
        const clienta = clientas.find(c => c.id === selectedReserva.clienta_id);
        
        return (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setSelectedReserva(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{servicio?.emoji}</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">{servicio?.nombre}</h3>
                      <p className="text-gray-600 mt-1">
                        {new Date(selectedReserva.fecha).toLocaleDateString('es-ES', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long' 
                        })}
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
                    <div>
                      <div className="text-sm text-gray-500">Horario</div>
                      <div className="font-medium">{selectedReserva.hora_inicio} - {selectedReserva.hora_fin}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-gray-700">
                    <User size={20} className="text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Cliente</div>
                      <div className="font-medium">{clienta?.nombre} {clienta?.apellidos}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-gray-700">
                    <Phone size={20} className="text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Teléfono</div>
                      <div className="font-medium">{clienta?.telefono}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-gray-700">
                    <MapPin size={20} className="text-gray-400 mt-1" />
                    <div>
                      <div className="text-sm text-gray-500">Dirección</div>
                      <div className="font-medium">
                        {selectedReserva.direccion.calle} {selectedReserva.direccion.numero}
                        {selectedReserva.direccion.piso && `, ${selectedReserva.direccion.piso}`}
                      </div>
                      <div className="text-sm text-gray-600">
                        {selectedReserva.direccion.codigo_postal} {selectedReserva.direccion.ciudad}
                      </div>
                      {selectedReserva.direccion.instrucciones_acceso && (
                        <div className="text-sm text-gray-600 mt-1 italic">
                          "{selectedReserva.direccion.instrucciones_acceso}"
                        </div>
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
                  <button
                    onClick={() => setSelectedReserva(null)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Cerrar
                  </button>
                  {selectedReserva.estado === 'confirmada' && (
                    <>
                      <button
                        onClick={handleMarcarCompletada}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition font-medium flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={20} />
                        Marcar Completada
                      </button>
                      <button
                        className="px-4 py-3 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition font-medium flex items-center gap-2"
                      >
                        <AlertTriangle size={20} />
                        Reportar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
