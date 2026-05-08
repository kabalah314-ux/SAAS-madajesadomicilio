import { useState } from 'react';
import { Calendar, Filter, UserPlus } from 'lucide-react';
import { useApp } from '../../AppContext';
import { Reserva } from '../../types';

type FiltroEstado = 'todas' | 'pendiente_asignacion' | 'confirmada' | 'completada' | 'cancelada';

export default function GestionReservas() {
  const { reservas, servicios, clientas, masajistas, aceptarSolicitud } = useApp();
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todas');
  const [showAsignar, setShowAsignar] = useState<Reserva | null>(null);
  const [masajistaSeleccionada, setMasajistaSeleccionada] = useState('');

  const reservasFiltradas = reservas.filter(r => {
    if (filtroEstado === 'todas') return true;
    if (filtroEstado === 'cancelada') {
      return r.estado === 'cancelada_clienta' || r.estado === 'cancelada_masajista';
    }
    return r.estado === filtroEstado;
  });

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      'confirmada': { label: 'Confirmada', class: 'bg-green-100 text-green-700' },
      'completada': { label: 'Completada', class: 'bg-gray-100 text-gray-700' },
      'pendiente_asignacion': { label: 'Pendiente Asignación', class: 'bg-yellow-100 text-yellow-700' },
      'cancelada_clienta': { label: 'Cancelada', class: 'bg-red-100 text-red-700' },
      'cancelada_masajista': { label: 'Cancelada', class: 'bg-red-100 text-red-700' }
    };
    return badges[estado] || badges.pendiente_asignacion;
  };

  const handleAsignar = () => {
    if (showAsignar && masajistaSeleccionada) {
      aceptarSolicitud(showAsignar.id, masajistaSeleccionada);
      setShowAsignar(null);
      setMasajistaSeleccionada('');
    }
  };

  const stats = {
    total: reservas.length,
    pendientes: reservas.filter(r => r.estado === 'pendiente_asignacion').length,
    confirmadas: reservas.filter(r => r.estado === 'confirmada').length,
    completadas: reservas.filter(r => r.estado === 'completada').length
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gestión de Reservas</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">{stats.total} reservas en el sistema</p>
        </div>

        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
          >
            <option value="todas">Todas ({stats.total})</option>
            <option value="pendiente_asignacion">Pendientes ({stats.pendientes})</option>
            <option value="confirmada">Confirmadas ({stats.confirmadas})</option>
            <option value="completada">Completadas ({stats.completadas})</option>
            <option value="cancelada">Canceladas</option>
          </select>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.pendientes}</div>
          <div className="text-sm text-gray-600">Pendientes</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{stats.confirmadas}</div>
          <div className="text-sm text-gray-600">Confirmadas</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-600">{stats.completadas}</div>
          <div className="text-sm text-gray-600">Completadas</div>
        </div>
      </div>

      {/* Tabla de reservas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Código</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Servicio</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Clienta</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Masajista</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha/Hora</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Zona</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Precio</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reservasFiltradas
                .sort((a, b) => new Date(b.creada_en).getTime() - new Date(a.creada_en).getTime())
                .map(reserva => {
                  const servicio = servicios.find(s => s.id === reserva.servicio_id);
                  const clienta = clientas.find(c => c.id === reserva.clienta_id);
                  const masajista = masajistas.find(m => m.id === reserva.masajista_id);
                  const estado = getEstadoBadge(reserva.estado);

                  return (
                    <tr key={reserva.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {reserva.codigo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{servicio?.emoji}</span>
                          <span className="text-sm text-gray-900">{servicio?.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {clienta?.nombre} {clienta?.apellidos}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {masajista ? `${masajista.nombre} ${masajista.apellidos}` : (
                          <span className="text-gray-400 italic">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(reserva.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                        <br />
                        <span className="text-gray-500">{reserva.hora_inicio}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {reserva.direccion.barrio}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {reserva.precio_total}€
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${estado.class}`}>
                          {estado.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {reserva.estado === 'pendiente_asignacion' && (
                          <button
                            onClick={() => setShowAsignar(reserva)}
                            className="text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                          >
                            <UserPlus size={16} />
                            Asignar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {reservasFiltradas.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Calendar size={48} className="mx-auto mb-3 text-gray-300" />
            <p>No hay reservas que coincidan con el filtro seleccionado</p>
          </div>
        )}
      </div>

      {/* Modal de asignación */}
      {showAsignar && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAsignar(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Asignar Masajista</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Reserva {showAsignar.codigo} • {servicios.find(s => s.id === showAsignar.servicio_id)?.nombre}
                </p>
              </div>

              <div className="p-6">
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Fecha:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {new Date(showAsignar.fecha).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Hora:</span>
                      <span className="ml-2 font-medium text-gray-900">{showAsignar.hora_inicio}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Zona:</span>
                      <span className="ml-2 font-medium text-gray-900">{showAsignar.direccion.barrio}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Precio:</span>
                      <span className="ml-2 font-medium text-gray-900">{showAsignar.precio_total}€</span>
                    </div>
                  </div>
                </div>

                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Selecciona una masajista disponible:
                </label>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {masajistas.filter(m => m.activo && m.documentacion_ok).map(masajista => {
                    const cubreLaZona = masajista.zonas_cobertura.includes(showAsignar.direccion.barrio);
                    
                    return (
                      <button
                        key={masajista.id}
                        onClick={() => setMasajistaSeleccionada(masajista.id)}
                        disabled={!cubreLaZona}
                        className={`w-full p-4 rounded-lg border-2 transition text-left ${
                          masajistaSeleccionada === masajista.id
                            ? 'border-teal-500 bg-teal-50'
                            : cubreLaZona
                              ? 'border-gray-200 hover:border-gray-300'
                              : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={masajista.foto || ''}
                            alt={masajista.nombre}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {masajista.nombre} {masajista.apellidos}
                            </div>
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <span className="text-yellow-500">★ {masajista.rating_promedio}</span>
                              <span className="text-gray-500">•</span>
                              <span className="text-gray-600">{masajista.total_sesiones} sesiones</span>
                            </div>
                            {!cubreLaZona && (
                              <div className="text-xs text-red-600 mt-1">
                                No cubre la zona {showAsignar.direccion.barrio}
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {Math.round(showAsignar.precio_total * 0.6)}€ pago
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => {
                    setShowAsignar(null);
                    setMasajistaSeleccionada('');
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAsignar}
                  disabled={!masajistaSeleccionada}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:from-teal-600 hover:to-emerald-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar Asignación
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
