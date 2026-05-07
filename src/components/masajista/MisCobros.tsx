import { DollarSign, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useApp } from '../../AppContext';
import EmptyState from '../EmptyState';

export default function MisCobros() {
  const { currentUser, reservas, transferencias, servicios } = useApp();

  if (!currentUser || currentUser.role !== 'masajista') return null;

  const misTransferencias = transferencias.filter(t => t.masajista_id === currentUser.id);
  
  // Ciclo actual (simplificado - asumimos quincenas del 1-15 y 16-fin de mes)
  const hoy = new Date();
  const esPrimeraQuincena = hoy.getDate() <= 15;
  const inicioQuincena = new Date(hoy.getFullYear(), hoy.getMonth(), esPrimeraQuincena ? 1 : 16);
  const finQuincena = new Date(hoy.getFullYear(), hoy.getMonth(), esPrimeraQuincena ? 15 : new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate());

  // Sesiones del ciclo actual
  const sesionesActuales = reservas.filter(r => {
    if (r.masajista_id !== currentUser.id || r.estado !== 'completada') return false;
    const fechaReserva = new Date(r.fecha);
    return fechaReserva >= inicioQuincena && fechaReserva <= finQuincena;
  });

  const totalACobrar = sesionesActuales.reduce((sum, r) => sum + r.pago_masajista, 0);

  const getEstadoTransferencia = (estado: string) => {
    const estados = {
      'confirmada': { label: 'Confirmada', class: 'text-green-700 bg-green-100', icon: CheckCircle },
      'enviada': { label: 'Enviada', class: 'text-blue-700 bg-blue-100', icon: Clock },
      'pendiente': { label: 'Pendiente', class: 'text-yellow-700 bg-yellow-100', icon: Clock },
      'error': { label: 'Error', class: 'text-red-700 bg-red-100', icon: AlertCircle }
    };
    return estados[estado as keyof typeof estados] || estados.pendiente;
  };

  const formatPeriodo = (inicio: string, fin: string) => {
    const inicioDate = new Date(inicio);
    const finDate = new Date(fin);
    return `${inicioDate.getDate()} - ${finDate.getDate()} ${finDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`;
  };

  if (misTransferencias.length === 0 && sesionesActuales.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          icon={DollarSign}
          title="Aún no has recibido transferencias"
          description="Cuando completes sesiones y se procese el ciclo de pago, verás aquí el detalle de tus cobros."
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mis Cobros</h2>
        <p className="text-gray-600 mt-1">Gestión de pagos y transferencias</p>
      </div>

      {/* Ciclo actual */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Ciclo Actual</h3>
              <p className="text-teal-100 text-sm mt-0.5">
                {formatPeriodo(inicioQuincena.toISOString(), finQuincena.toISOString())}
              </p>
            </div>
            <Calendar size={24} className="text-teal-100" />
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">Sesiones completadas</div>
              <div className="text-2xl font-bold text-gray-900">{sesionesActuales.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Total a cobrar</div>
              <div className="text-2xl font-bold text-teal-600">{totalACobrar}€</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Transferencia estimada</div>
              <div className="text-2xl font-bold text-gray-900">
                {esPrimeraQuincena ? '16' : '1'} {new Date(hoy.getFullYear(), esPrimeraQuincena ? hoy.getMonth() : hoy.getMonth() + 1).toLocaleDateString('es-ES', { month: 'short' })}
              </div>
            </div>
          </div>

          {sesionesActuales.length > 0 ? (
            <>
              <div className="mb-3 text-sm font-medium text-gray-700">Sesiones de este ciclo:</div>
              <div className="space-y-2">
                {sesionesActuales.map(reserva => {
                  const servicio = servicios.find(s => s.id === reserva.servicio_id);
                  return (
                    <div key={reserva.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{servicio?.emoji}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{servicio?.nombre}</div>
                          <div className="text-xs text-gray-600">
                            {new Date(reserva.fecha).toLocaleDateString('es-ES')} • {reserva.codigo}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-teal-600">{reserva.pago_masajista}€</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="px-3 py-2 bg-teal-50 rounded-lg flex items-center gap-2 text-teal-900 text-sm">
                  <Clock size={16} />
                  <span className="font-medium">Estado: </span>
                  <span>Calculando ciclo - Transferencia procesándose</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No hay sesiones completadas en este ciclo todavía
            </div>
          )}
        </div>
      </div>

      {/* Historial de transferencias */}
      {misTransferencias.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Historial de Transferencias</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Período</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sesiones</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Importe</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Referencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {misTransferencias.sort((a, b) => new Date(b.periodo_fin).getTime() - new Date(a.periodo_fin).getTime()).map(trans => {
                  const estado = getEstadoTransferencia(trans.estado);
                  const IconEstado = estado.icon;

                  return (
                    <tr key={trans.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPeriodo(trans.periodo_inicio, trans.periodo_fin)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trans.sesiones}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-teal-600">
                        {trans.importe_neto}€
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {trans.fecha_transferencia ? new Date(trans.fecha_transferencia).toLocaleDateString('es-ES') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${estado.class}`}>
                          <IconEstado size={12} />
                          {estado.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                        {trans.referencia_bancaria || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
