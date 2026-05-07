import { useState } from 'react';
import { Eye, Ban, UserCheck, X, TrendingUp } from 'lucide-react';
import { useApp } from '../../AppContext';
import { Clienta } from '../../types';

export default function GestionClientas() {
  const { clientas, updateClienta, reservas, servicios } = useApp();
  const [showDrawer, setShowDrawer] = useState<Clienta | null>(null);
  const [filtro, setFiltro] = useState<'todas' | 'nuevas' | 'recurrentes' | 'vip' | 'bloqueadas'>('todas');
  const [searchTerm, setSearchTerm] = useState('');

  const getTipoBadge = (tipo: string) => {
    const badges = {
      'nuevo': { label: 'Nuevo', class: 'bg-gray-100 text-gray-700' },
      'recurrente': { label: 'Recurrente', class: 'bg-blue-100 text-blue-700' },
      'vip': { label: 'VIP ⭐', class: 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 font-semibold' }
    };
    return badges[tipo as keyof typeof badges] || badges.nuevo;
  };

  const clientasFiltradas = clientas
    .filter(c => {
      if (filtro === 'nuevas') return c.tipo_cliente === 'nuevo';
      if (filtro === 'recurrentes') return c.tipo_cliente === 'recurrente';
      if (filtro === 'vip') return c.tipo_cliente === 'vip';
      if (filtro === 'bloqueadas') return c.bloqueada;
      return true;
    })
    .filter(c => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        c.nombre.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        c.telefono?.toLowerCase().includes(search)
      );
    });

  const handleBloquear = (id: string) => {
    const motivo = prompt('Motivo del bloqueo:');
    if (motivo) {
      updateClienta(id, { bloqueada: true, motivo_bloqueo: motivo });
    }
  };

  const handleDesbloquear = (id: string) => {
    updateClienta(id, { bloqueada: false, motivo_bloqueo: undefined });
  };

  const stats = {
    total: clientas.length,
    nuevas: clientas.filter(c => c.tipo_cliente === 'nuevo').length,
    recurrentes: clientas.filter(c => c.tipo_cliente === 'recurrente').length,
    vip: clientas.filter(c => c.tipo_cliente === 'vip').length
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Clientas</h2>
          <p className="text-gray-600 mt-1">{clientas.length} clientas en el sistema</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, email o teléfono..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm w-64"
          />
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
          >
            <option value="todas">Todas ({stats.total})</option>
            <option value="nuevas">Nuevas ({stats.nuevas})</option>
            <option value="recurrentes">Recurrentes ({stats.recurrentes})</option>
            <option value="vip">VIP ({stats.vip})</option>
            <option value="bloqueadas">Bloqueadas ({clientas.filter(c => c.bloqueada).length})</option>
          </select>
        </div>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Clientas</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-600">{stats.nuevas}</div>
          <div className="text-sm text-gray-600">Nuevas</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.recurrentes}</div>
          <div className="text-sm text-gray-600">Recurrentes</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.vip}</div>
          <div className="text-sm text-gray-600">VIP</div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Teléfono</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sesiones</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Gasto Total</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clientasFiltradas.map(clienta => {
                const tipo = getTipoBadge(clienta.tipo_cliente);
                const telefonoMasked = clienta.telefono 
                  ? `+34 ${clienta.telefono.slice(-9, -6)}xxx${clienta.telefono.slice(-3)}`
                  : '-';

                return (
                  <tr key={clienta.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{clienta.nombre} {clienta.apellidos}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {clienta.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {telefonoMasked}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${tipo.class}`}>
                        {tipo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {clienta.total_sesiones}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {clienta.gasto_acumulado}€
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {clienta.bloqueada ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Bloqueada
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Activa
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowDrawer(clienta)}
                          className="text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                        >
                          <Eye size={16} />
                          Ver
                        </button>
                        {!clienta.bloqueada ? (
                          <button
                            onClick={() => handleBloquear(clienta.id)}
                            className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                          >
                            <Ban size={16} />
                            Bloquear
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDesbloquear(clienta.id)}
                            className="text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                          >
                            <UserCheck size={16} />
                            Activar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {clientasFiltradas.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No hay clientas que coincidan con el filtro seleccionado</p>
          </div>
        )}
      </div>

      {/* Drawer de perfil */}
      {showDrawer && (() => {
        const clienta = showDrawer;
        const reservasClienta = reservas.filter(r => r.clienta_id === clienta.id);
        const reservasCompletadas = reservasClienta.filter(r => r.estado === 'completada');
        
        // Calcular servicio favorito (el más reservado)
        const serviciosCount: Record<string, number> = {};
        reservasClienta.forEach(r => {
          serviciosCount[r.servicio_id] = (serviciosCount[r.servicio_id] || 0) + 1;
        });
        const servicioFavoritoId = Object.entries(serviciosCount).sort((a, b) => b[1] - a[1])[0]?.[0];
        const servicioFavorito = servicios.find(s => s.id === servicioFavoritoId);

        return (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDrawer(null)} />
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white z-50 shadow-2xl overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
                <h3 className="text-lg font-bold text-gray-900">Perfil de Clienta</h3>
                <button onClick={() => setShowDrawer(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Header */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{clienta.nombre} {clienta.apellidos}</h2>
                  <p className="text-gray-600">{clienta.email}</p>
                  <p className="text-gray-600">{clienta.telefono}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getTipoBadge(clienta.tipo_cliente).class}`}>
                      {getTipoBadge(clienta.tipo_cliente).label}
                    </span>
                    {clienta.bloqueada && (
                      <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                        Bloqueada
                      </span>
                    )}
                  </div>
                </div>

                {/* Motivo bloqueo si existe */}
                {clienta.bloqueada && clienta.motivo_bloqueo && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                    <p className="font-medium text-red-900">Motivo del bloqueo:</p>
                    <p className="text-red-700 text-sm mt-1">{clienta.motivo_bloqueo}</p>
                  </div>
                )}

                {/* Estadísticas */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{clienta.total_sesiones}</div>
                    <div className="text-sm text-gray-600">Sesiones</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{clienta.gasto_acumulado}€</div>
                    <div className="text-sm text-gray-600">Gastado</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{reservasCompletadas.length}</div>
                    <div className="text-sm text-gray-600">Completadas</div>
                  </div>
                </div>

                {/* Info adicional */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Servicio más reservado</div>
                    <div className="font-medium text-gray-900">
                      {servicioFavorito ? `${servicioFavorito.emoji} ${servicioFavorito.nombre}` : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Gasto promedio/sesión</div>
                    <div className="font-medium text-gray-900">
                      {clienta.total_sesiones > 0 
                        ? `${Math.round(clienta.gasto_acumulado / clienta.total_sesiones)}€`
                        : '0€'}
                    </div>
                  </div>
                </div>

                {/* Preferencias */}
                {(clienta.servicio_favorito || clienta.intensidad_preferida) && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Preferencias</h4>
                    <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
                      {clienta.servicio_favorito && (
                        <div>
                          <span className="text-gray-600">Servicio preferido:</span>
                          <span className="ml-2 font-medium text-gray-900">{clienta.servicio_favorito}</span>
                        </div>
                      )}
                      {clienta.intensidad_preferida && (
                        <div>
                          <span className="text-gray-600">Intensidad:</span>
                          <span className="ml-2 font-medium text-gray-900 capitalize">{clienta.intensidad_preferida}</span>
                        </div>
                      )}
                      {clienta.notas_especiales && (
                        <div>
                          <span className="text-gray-600">Notas especiales:</span>
                          <p className="text-gray-900 mt-1">{clienta.notas_especiales}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dirección habitual */}
                {clienta.direccion_habitual && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Dirección habitual</h4>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm">
                      <p className="text-gray-900">
                        {clienta.direccion_habitual.calle} {clienta.direccion_habitual.numero}
                        {clienta.direccion_habitual.piso && `, ${clienta.direccion_habitual.piso}`}
                      </p>
                      <p className="text-gray-600">
                        {clienta.direccion_habitual.codigo_postal} {clienta.direccion_habitual.ciudad}
                      </p>
                      <p className="text-gray-600">{clienta.direccion_habitual.barrio}</p>
                    </div>
                  </div>
                )}

                {/* Notas internas */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Notas internas (solo admin)</h4>
                  <textarea
                    value={clienta.notas_internas_admin || ''}
                    onChange={(e) => updateClienta(clienta.id, { notas_internas_admin: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                    placeholder="Añade notas internas sobre esta clienta..."
                  />
                </div>

                {/* Historial de reservas */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    Historial de Reservas ({reservasClienta.length})
                    {reservasClienta.length > 0 && (
                      <TrendingUp size={16} className="text-green-600" />
                    )}
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {reservasClienta
                      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                      .map(reserva => {
                        const servicio = servicios.find(s => s.id === reserva.servicio_id);
                        
                        return (
                          <div key={reserva.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <span className="text-2xl">{servicio?.emoji}</span>
                                <div>
                                  <div className="font-medium text-gray-900">{servicio?.nombre}</div>
                                  <div className="text-sm text-gray-600">
                                    {new Date(reserva.fecha).toLocaleDateString('es-ES')} • {reserva.hora_inicio}
                                  </div>
                                  <div className="text-xs text-gray-500 font-mono mt-1">{reserva.codigo}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-gray-900">{reserva.precio_total}€</div>
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                                  reserva.estado === 'completada' ? 'bg-green-100 text-green-700' :
                                  reserva.estado === 'confirmada' ? 'bg-blue-100 text-blue-700' :
                                  reserva.estado === 'pendiente_asignacion' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {reserva.estado.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
