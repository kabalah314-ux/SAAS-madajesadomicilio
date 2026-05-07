import { useState } from 'react';
import { Calendar, FileText, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useApp } from '../../AppContext';
import EmptyState from '../EmptyState';

type FiltroPeriodo = 'mes_actual' | 'mes_anterior' | '3_meses' | 'personalizado';

export default function Historial() {
  const { currentUser, reservas, servicios, clientas } = useApp();
  const [filtro, setFiltro] = useState<FiltroPeriodo>('mes_actual');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  if (!currentUser || currentUser.role !== 'masajista') return null;

  const misReservasCompletadas = reservas.filter(r => 
    r.masajista_id === currentUser.id && 
    (r.estado === 'completada' || r.estado === 'cancelada_clienta' || r.estado === 'cancelada_masajista')
  );

  const getFechaFiltro = () => {
    const hoy = new Date();
    switch (filtro) {
      case 'mes_actual':
        return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      case 'mes_anterior':
        return new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      case '3_meses':
        return new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1);
      default:
        return new Date(0);
    }
  };

  const fechaFiltro = getFechaFiltro();
  const reservasFiltradas = misReservasCompletadas.filter(r => {
    const fechaReserva = new Date(r.fecha);
    return fechaReserva >= fechaFiltro;
  });

  const getEstadoPago = (estado: string) => {
    if (estado === 'completada') return { label: 'Cobrado', class: 'text-green-700 bg-green-100', icon: CheckCircle };
    if (estado === 'cancelada_clienta' || estado === 'cancelada_masajista') return { label: 'Cancelado', class: 'text-red-700 bg-red-100', icon: XCircle };
    return { label: 'Pendiente', class: 'text-yellow-700 bg-yellow-100', icon: Clock };
  };

  const totales = {
    sesiones: reservasFiltradas.length,
    facturado: reservasFiltradas.reduce((sum, r) => sum + r.precio_total, 0),
    cobrado: reservasFiltradas.filter(r => r.estado === 'completada').reduce((sum, r) => sum + r.pago_masajista, 0)
  };

  if (misReservasCompletadas.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <EmptyState
          icon={FileText}
          title="Aún no tienes historial de servicios"
          description="Cuando completes tu primera sesión aparecerá aquí con todos los detalles."
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Historial de Servicios</h2>
          <p className="text-gray-600 mt-1">{totales.sesiones} sesión{totales.sesiones !== 1 ? 'es' : ''} registrada{totales.sesiones !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-gray-400" />
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as FiltroPeriodo)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
          >
            <option value="mes_actual">Este mes</option>
            <option value="mes_anterior">Mes anterior</option>
            <option value="3_meses">Últimos 3 meses</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="text-blue-100 text-sm mb-1">Total Sesiones</div>
          <div className="text-3xl font-bold">{totales.sesiones}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="text-purple-100 text-sm mb-1">Total Facturado</div>
          <div className="text-3xl font-bold">{totales.facturado}€</div>
        </div>
        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="text-teal-100 text-sm mb-1">Total Cobrado</div>
          <div className="text-3xl font-bold">{totales.cobrado}€</div>
        </div>
      </div>

      {/* Tabla - Vista escritorio */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Código</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Servicio</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Duración</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mi Pago</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reservasFiltradas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map(reserva => {
                const servicio = servicios.find(s => s.id === reserva.servicio_id);
                const clienta = clientas.find(c => c.id === reserva.clienta_id);
                const estadoPago = getEstadoPago(reserva.estado);
                const IconEstado = estadoPago.icon;
                const isExpanded = expandedRow === reserva.id;

                return (
                  <>
                    <tr 
                      key={reserva.id}
                      onClick={() => setExpandedRow(isExpanded ? null : reserva.id)}
                      className="hover:bg-gray-50 cursor-pointer transition"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(reserva.fecha).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                        {reserva.codigo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{servicio?.emoji}</span>
                          <span className="text-sm text-gray-900">{servicio?.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {servicio?.duracion_minutos} min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {clienta?.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {reserva.precio_total}€
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-teal-600">
                        {reserva.pago_masajista}€
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${estadoPago.class}`}>
                          <IconEstado size={12} />
                          {estadoPago.label}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="space-y-2 text-sm">
                            {reserva.notas_clienta && (
                              <div>
                                <span className="font-medium text-gray-700">Notas: </span>
                                <span className="text-gray-600">{reserva.notas_clienta}</span>
                              </div>
                            )}
                            {reserva.valoracion && (
                              <div>
                                <span className="font-medium text-gray-700">Valoración: </span>
                                <span className="text-yellow-500">{'★'.repeat(reserva.valoracion.estrellas)}{'☆'.repeat(5 - reserva.valoracion.estrellas)}</span>
                                {reserva.valoracion.comentario && (
                                  <span className="text-gray-600 ml-2">"{reserva.valoracion.comentario}"</span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr className="font-semibold">
                <td colSpan={5} className="px-6 py-4 text-sm text-gray-900">TOTALES</td>
                <td className="px-6 py-4 text-sm text-gray-900">{totales.facturado}€</td>
                <td className="px-6 py-4 text-sm text-teal-600">{totales.cobrado}€</td>
                <td className="px-6 py-4 text-sm text-gray-600">{totales.sesiones} sesiones</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Vista móvil */}
      <div className="lg:hidden space-y-3">
        {reservasFiltradas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map(reserva => {
          const servicio = servicios.find(s => s.id === reserva.servicio_id);
          const clienta = clientas.find(c => c.id === reserva.clienta_id);
          const estadoPago = getEstadoPago(reserva.estado);
          const IconEstado = estadoPago.icon;

          return (
            <div key={reserva.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{servicio?.emoji}</span>
                  <div>
                    <div className="font-medium text-gray-900">{servicio?.nombre}</div>
                    <div className="text-xs text-gray-500 font-mono">{reserva.codigo}</div>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estadoPago.class}`}>
                  <IconEstado size={12} />
                  {estadoPago.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-500">Fecha</div>
                  <div className="font-medium text-gray-900">
                    {new Date(reserva.fecha).toLocaleDateString('es-ES')}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Cliente</div>
                  <div className="font-medium text-gray-900">{clienta?.nombre}</div>
                </div>
                <div>
                  <div className="text-gray-500">Precio total</div>
                  <div className="font-medium text-gray-900">{reserva.precio_total}€</div>
                </div>
                <div>
                  <div className="text-gray-500">Mi pago (60%)</div>
                  <div className="font-semibold text-teal-600">{reserva.pago_masajista}€</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
