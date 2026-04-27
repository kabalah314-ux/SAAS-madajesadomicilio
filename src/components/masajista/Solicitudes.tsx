import { useState } from 'react';
import { Clock, MapPin, Check, X, AlertCircle } from 'lucide-react';
import { useApp } from '../../AppContext';
import EmptyState from '../EmptyState';

export default function Solicitudes() {
  const { currentUser, reservas, servicios, clientas, aceptarSolicitud, rechazarSolicitud } = useApp();
  const [selectedReserva, setSelectedReserva] = useState<string | null>(null);
  const [showRechazarModal, setShowRechazarModal] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  if (!currentUser || currentUser.role !== 'masajista') return null;

  // Solicitudes pendientes que pueden ser para esta masajista
  // En un sistema real, esto se basaría en zona de cobertura y especialidades
  const solicitudesPendientes = reservas.filter(r => r.estado === 'pendiente_asignacion');

  const getTiempoRestante = (creadaEn: string) => {
    const creacion = new Date(creadaEn);
    const ahora = new Date();
    const limite = new Date(creacion.getTime() + 2 * 60 * 60 * 1000); // 2 horas
    const diff = limite.getTime() - ahora.getTime();
    
    if (diff <= 0) return { texto: 'Expirado', critico: true };
    
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    const critico = diff < 60 * 60 * 1000; // Menos de 1 hora
    
    return {
      texto: horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`,
      critico
    };
  };

  const handleAceptar = (reservaId: string) => {
    aceptarSolicitud(reservaId, currentUser.id);
    setSelectedReserva(null);
  };

  const handleRechazar = () => {
    if (selectedReserva && motivoRechazo) {
      rechazarSolicitud(selectedReserva, motivoRechazo);
      setShowRechazarModal(false);
      setSelectedReserva(null);
      setMotivoRechazo('');
    }
  };

  if (solicitudesPendientes.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          icon={Clock}
          title="¡Todo al día!"
          description="No hay solicitudes pendientes en este momento. Te notificaremos cuando haya nuevas sesiones disponibles en tu zona."
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Solicitudes Pendientes</h2>
        <p className="text-gray-600 mt-1">
          Tienes {solicitudesPendientes.length} solicitud{solicitudesPendientes.length !== 1 ? 'es' : ''} para revisar
        </p>
      </div>

      <div className="space-y-4">
        {solicitudesPendientes.map(reserva => {
          const servicio = servicios.find(s => s.id === reserva.servicio_id);
          const clienta = clientas.find(c => c.id === reserva.clienta_id);
          const tiempo = getTiempoRestante(reserva.creada_en);
          const pagoMasajista = Math.round(reserva.precio_total * 0.6);

          return (
            <div key={reserva.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{servicio?.emoji}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{servicio?.nombre}</h3>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {new Date(reserva.fecha).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long'
                          })} • {reserva.hora_inicio}
                        </p>
                      </div>
                      
                      <div className={`px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5 ${
                        tiempo.critico 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        <Clock size={14} />
                        {tiempo.texto}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock size={16} className="text-gray-400" />
                        <span>{servicio?.duracion_minutos} minutos</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin size={16} className="text-gray-400" />
                        <span>{reserva.direccion.barrio}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-700 font-medium">
                        <span className="text-teal-600 text-base">{pagoMasajista}€</span>
                        <span className="text-gray-500 text-xs">(tu parte)</span>
                      </div>
                    </div>

                    {reserva.notas_clienta && (
                      <div className="mt-3 bg-blue-50 rounded-lg p-3">
                        <p className="text-sm text-blue-900">
                          <span className="font-medium">Nota: </span>
                          {reserva.notas_clienta}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={() => {
                      setSelectedReserva(reserva.id);
                      setShowRechazarModal(true);
                    }}
                    className="flex-1 sm:flex-none px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium flex items-center justify-center gap-2"
                  >
                    <X size={18} />
                    Rechazar
                  </button>
                  
                  <button
                    onClick={() => handleAceptar(reserva.id)}
                    className="flex-1 px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:from-teal-600 hover:to-emerald-700 transition font-medium flex items-center justify-center gap-2 shadow-md"
                  >
                    <Check size={18} />
                    Aceptar Solicitud
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de rechazo */}
      {showRechazarModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowRechazarModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <AlertCircle size={20} className="text-orange-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Rechazar solicitud</h3>
                </div>

                <p className="text-gray-600 mb-4">
                  Por favor, indica el motivo por el que rechazas esta solicitud:
                </p>

                <select
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                >
                  <option value="">Selecciona un motivo...</option>
                  <option value="No disponible">No estoy disponible en ese horario</option>
                  <option value="Zona fuera de cobertura">Zona fuera de mi cobertura</option>
                  <option value="Otro">Otro motivo</option>
                </select>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => {
                    setShowRechazarModal(false);
                    setMotivoRechazo('');
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRechazar}
                  disabled={!motivoRechazo}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar rechazo
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
