import { useState } from 'react';
import { Calendar, Star, Repeat, XCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../../AppContext';
import EmptyState from '../EmptyState';

export default function MisReservas() {
  const { currentUser, reservas, servicios, masajistas, cancelarReservaPorClienta, createValoracion } = useApp();
  const [showCancelar, setShowCancelar] = useState<string | null>(null);
  const [showValorar, setShowValorar] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comentario, setComentario] = useState('');

  if (!currentUser || currentUser.role !== 'clienta') return null;

  const misReservas = reservas.filter(r => r.clienta_id === currentUser.id);

  const getEstadoBadge = (estado: string, fecha: string, horaInicio: string) => {
    const ahora = new Date();
    const fechaReserva = new Date(`${fecha}T${horaInicio}`);
    const horasRestantes = (fechaReserva.getTime() - ahora.getTime()) / (1000 * 60 * 60);

    const badges: Record<string, { label: string; class: string }> = {
      'confirmada': horasRestantes < 48 
        ? { label: '🔥 Próxima', class: 'bg-blue-100 text-blue-700' }
        : { label: 'Confirmada', class: 'bg-green-100 text-green-700' },
      'completada': { label: 'Completada', class: 'bg-gray-100 text-gray-700' },
      'pendiente_asignacion': { label: '⏳ Pendiente', class: 'bg-yellow-100 text-yellow-700 animate-pulse' },
      'cancelada_clienta': { label: 'Cancelada', class: 'bg-red-100 text-red-700 line-through' }
    };
    return badges[estado] || badges.pendiente_asignacion;
  };

  const puedeCancelar = (fecha: string, horaInicio: string) => {
    const ahora = new Date();
    const fechaReserva = new Date(`${fecha}T${horaInicio}`);
    const horasRestantes = (fechaReserva.getTime() - ahora.getTime()) / (1000 * 60 * 60);
    return horasRestantes > 24;
  };

  const handleCancelar = (reservaId: string) => {
    cancelarReservaPorClienta(reservaId);
    setShowCancelar(null);
  };

  const handleValorar = (reservaId: string, masajistaId: string) => {
    if (rating > 0) {
      createValoracion({
        reserva_id: reservaId,
        clienta_id: currentUser.id,
        masajista_id: masajistaId,
        estrellas: rating,
        comentario: comentario.trim() || undefined,
        fecha: new Date().toISOString().split('T')[0]
      });
      setShowValorar(null);
      setRating(0);
      setComentario('');
    }
  };

  const stats = {
    proximas: misReservas.filter(r => r.estado === 'confirmada').length,
    completadas: misReservas.filter(r => r.estado === 'completada').length,
    pendientes: misReservas.filter(r => r.estado === 'pendiente_asignacion').length
  };

  if (misReservas.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          icon={Calendar}
          title="Aún no tienes reservas"
          description="Cuando reserves tu primera sesión aparecerá aquí con todos los detalles."
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mis Reservas</h2>
        <p className="text-gray-600 mt-1">
          {misReservas.length} reserva{misReservas.length !== 1 ? 's' : ''} en total
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="text-blue-100 text-sm mb-1">Próximas</div>
          <div className="text-3xl font-bold">{stats.proximas}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="text-green-100 text-sm mb-1">Completadas</div>
          <div className="text-3xl font-bold">{stats.completadas}</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="text-yellow-100 text-sm mb-1">Pendientes</div>
          <div className="text-3xl font-bold">{stats.pendientes}</div>
        </div>
      </div>

      {/* Lista de reservas */}
      <div className="space-y-3">
        {misReservas
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
          .map(reserva => {
            const servicio = servicios.find(s => s.id === reserva.servicio_id);
            const masajista = masajistas.find(m => m.id === reserva.masajista_id);
            const estado = getEstadoBadge(reserva.estado, reserva.fecha, reserva.hora_inicio);
            const puedeCanc = puedeCancelar(reserva.fecha, reserva.hora_inicio);
            const yaValorada = reserva.valoracion !== undefined;

            return (
              <div 
                key={reserva.id} 
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-3xl sm:text-4xl">{servicio?.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-lg">{servicio?.nombre}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(reserva.fecha).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long'
                          })} • {reserva.hora_inicio}
                        </p>
                        {masajista && (
                          <p className="text-sm text-gray-500 mt-1">
                            Con {masajista.nombre} {masajista.apellidos}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2 font-mono">{reserva.codigo}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${estado.class}`}>
                      {estado.label}
                    </span>
                  </div>

                  {/* Acciones */}
                  {reserva.estado !== 'cancelada_clienta' && (
                    <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                      {/* Cancelar (solo si es futura y confirmada) */}
                      {reserva.estado === 'confirmada' && (
                        <button
                          onClick={() => setShowCancelar(reserva.id)}
                          disabled={!puedeCanc}
                          className="px-4 py-2 border-2 border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          title={!puedeCanc ? 'No puedes cancelar con menos de 24h de antelación' : ''}
                        >
                          <XCircle size={16} />
                          Cancelar
                        </button>
                      )}

                      {/* Valorar (solo si está completada y no ha sido valorada) */}
                      {reserva.estado === 'completada' && !yaValorada && masajista && (
                        <button
                          onClick={() => setShowValorar(reserva.id)}
                          className="px-4 py-2 bg-yellow-50 border-2 border-yellow-200 text-yellow-700 rounded-lg hover:bg-yellow-100 transition text-sm font-medium flex items-center gap-2"
                        >
                          <Star size={16} />
                          Valorar
                        </button>
                      )}

                      {/* Repetir (solo si está completada) */}
                      {reserva.estado === 'completada' && (
                        <button
                          className="px-4 py-2 bg-teal-50 border-2 border-teal-200 text-teal-700 rounded-lg hover:bg-teal-100 transition text-sm font-medium flex items-center gap-2"
                        >
                          <Repeat size={16} />
                          Repetir
                        </button>
                      )}

                      {/* Mostrar valoración si existe */}
                      {yaValorada && reserva.valoracion && (
                        <div className="flex-1 px-4 py-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Tu valoración:</span>
                            <span className="text-yellow-500">
                              {'★'.repeat(reserva.valoracion.estrellas)}{'☆'.repeat(5 - reserva.valoracion.estrellas)}
                            </span>
                          </div>
                          {reserva.valoracion.comentario && (
                            <p className="text-xs text-gray-600 mt-1 italic">"{reserva.valoracion.comentario}"</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Modal Cancelar */}
      {showCancelar && (() => {
        const reserva = misReservas.find(r => r.id === showCancelar);
        const puedeCanc = reserva && puedeCancelar(reserva.fecha, reserva.hora_inicio);

        return (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCancelar(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle size={24} className="text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">¿Cancelar reserva?</h3>
                  </div>

                  <p className="text-gray-700 mb-4">
                    ¿Estás segura de que quieres cancelar esta reserva?
                  </p>

                  {!puedeCanc && (
                    <div className="bg-orange-50 border-l-4 border-orange-400 p-3 mb-4">
                      <p className="text-sm text-orange-800">
                        <strong>Atención:</strong> Las cancelaciones con menos de 24 horas de antelación no son reembolsables.
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={() => setShowCancelar(null)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    No, mantener
                  </button>
                  <button
                    onClick={() => handleCancelar(showCancelar)}
                    className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium"
                  >
                    Sí, cancelar
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Modal Valorar */}
      {showValorar && (() => {
        const reserva = misReservas.find(r => r.id === showValorar);
        const masajista = masajistas.find(m => m.id === reserva?.masajista_id);

        return (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowValorar(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Valora tu experiencia</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    ¿Cómo fue tu sesión con {masajista?.nombre}?
                  </p>

                  <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="text-4xl transition hover:scale-110"
                      >
                        {star <= rating ? (
                          <span className="text-yellow-500">★</span>
                        ) : (
                          <span className="text-gray-300">☆</span>
                        )}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    rows={4}
                    placeholder="Cuéntanos sobre tu experiencia (opcional)..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
                  />
                </div>

                <div className="p-6 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={() => {
                      setShowValorar(null);
                      setRating(0);
                      setComentario('');
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => masajista && handleValorar(showValorar, masajista.id)}
                    disabled={rating === 0}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:from-teal-600 hover:to-emerald-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Enviar Valoración
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
