import { useState } from 'react';
import { CreditCard, CheckCircle, Clock, Send, X } from 'lucide-react';
import { useApp } from '../../AppContext';

export default function GestionTransferencias() {
  const { transferencias, masajistas, configuracion } = useApp();
  const [showEnviarModal, setShowEnviarModal] = useState<string | null>(null);
  const [referencia, setReferencia] = useState('');

  // Calcular ciclo actual
  const hoy = new Date();
  const esPrimeraQuincena = hoy.getDate() <= 15;
  const inicioQuincena = new Date(hoy.getFullYear(), hoy.getMonth(), esPrimeraQuincena ? 1 : 16);
  const finQuincena = new Date(hoy.getFullYear(), hoy.getMonth(), esPrimeraQuincena ? 15 : new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate());

  const formatPeriodo = (inicio: string, fin: string) => {
    const inicioDate = new Date(inicio);
    const finDate = new Date(fin);
    return `${inicioDate.getDate()}-${finDate.getDate()} ${finDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`;
  };

  const getEstadoBadge = (estado: string) => {
    const badges = {
      'confirmada': { label: '✅ Confirmada', class: 'bg-green-100 text-green-700', icon: CheckCircle },
      'enviada': { label: '📤 Enviada', class: 'bg-blue-100 text-blue-700', icon: Send },
      'pendiente': { label: '⏳ Pendiente', class: 'bg-yellow-100 text-yellow-700', icon: Clock },
      'error': { label: '❌ Error', class: 'bg-red-100 text-red-700', icon: X }
    };
    return badges[estado as keyof typeof badges] || badges.pendiente;
  };

  const handleMarcarEnviada = () => {
    if (showEnviarModal && referencia.trim()) {
      // En producción actualizaría el estado
      console.log('Marcar como enviada:', showEnviarModal, 'Ref:', referencia);
      alert(`Transferencia marcada como enviada.\nReferencia: ${referencia}`);
      setShowEnviarModal(null);
      setReferencia('');
    }
  };

  const handleConfirmar = (id: string) => {
    if (confirm('¿Confirmar que la transferencia se ha completado?')) {
      console.log('Confirmar transferencia:', id);
      alert('Transferencia confirmada');
    }
  };

  // Agrupar por ciclo actual
  const transferenciasActuales = transferencias.filter(t => {
    const periodoFin = new Date(t.periodo_fin);
    return periodoFin >= inicioQuincena && periodoFin <= finQuincena;
  });

  const transferenciasHistoricas = transferencias.filter(t => {
    const periodoFin = new Date(t.periodo_fin);
    return periodoFin < inicioQuincena;
  }).sort((a, b) => new Date(b.periodo_fin).getTime() - new Date(a.periodo_fin).getTime());

  const totalPendiente = transferenciasActuales
    .filter(t => t.estado === 'pendiente')
    .reduce((sum, t) => sum + t.importe_neto, 0);

  const stats = {
    pendientes: transferencias.filter(t => t.estado === 'pendiente').length,
    enviadas: transferencias.filter(t => t.estado === 'enviada').length,
    confirmadas: transferencias.filter(t => t.estado === 'confirmada').length,
    totalPendiente
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Transferencias</h2>
        <p className="text-gray-600 mt-1">
          Sistema de pagos {configuracion.ciclo_pago === 'quincenal' ? 'quincenal' : 'semanal'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.pendientes}</div>
          <div className="text-sm text-gray-600">Pendientes</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.enviadas}</div>
          <div className="text-sm text-gray-600">Enviadas</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{stats.confirmadas}</div>
          <div className="text-sm text-gray-600">Confirmadas</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-teal-600">{totalPendiente}€</div>
          <div className="text-sm text-gray-600">A Transferir</div>
        </div>
      </div>

      {/* Ciclo Actual */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Ciclo Actual</h3>
              <p className="text-teal-100 text-sm mt-0.5">
                {formatPeriodo(inicioQuincena.toISOString(), finQuincena.toISOString())}
              </p>
            </div>
            <CreditCard size={24} className="text-teal-100" />
          </div>
        </div>

        <div className="p-6">
          {transferenciasActuales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock size={48} className="mx-auto mb-3 text-gray-300" />
              <p>No hay transferencias en el ciclo actual</p>
              <p className="text-sm mt-1">Se generarán automáticamente al finalizar el período</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Masajista</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sesiones</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Importe Bruto</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Importe Neto</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">IBAN</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transferenciasActuales.map(trans => {
                    const masajista = masajistas.find(m => m.id === trans.masajista_id);
                    const estado = getEstadoBadge(trans.estado);
                    const IconEstado = estado.icon;

                    return (
                      <tr key={trans.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <img
                              src={masajista?.foto || 'https://via.placeholder.com/40'}
                              alt={masajista?.nombre}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div>
                              <div className="font-medium text-gray-900">{masajista?.nombre} {masajista?.apellidos}</div>
                              <div className="text-sm text-gray-500">{masajista?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trans.sesiones}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {trans.importe_bruto}€
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-teal-600">
                          {trans.importe_neto}€
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                          {masajista?.iban ? `****${masajista.iban.slice(-4)}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${estado.class}`}>
                            <IconEstado size={12} />
                            {estado.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {trans.estado === 'pendiente' && (
                            <button
                              onClick={() => setShowEnviarModal(trans.id)}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Marcar Enviada
                            </button>
                          )}
                          {trans.estado === 'enviada' && (
                            <button
                              onClick={() => handleConfirmar(trans.id)}
                              className="text-green-600 hover:text-green-700 font-medium"
                            >
                              Confirmar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr className="font-semibold">
                    <td colSpan={2} className="px-6 py-4 text-sm text-gray-900">TOTALES</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transferenciasActuales.reduce((sum, t) => sum + t.importe_bruto, 0)}€
                    </td>
                    <td className="px-6 py-4 text-sm text-teal-600">
                      {transferenciasActuales.reduce((sum, t) => sum + t.importe_neto, 0)}€
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Historial */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Historial de Ciclos</h3>
        </div>

        {transferenciasHistoricas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No hay historial de transferencias anteriores</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {/* Agrupar por período */}
            {Array.from(new Set(transferenciasHistoricas.map(t => `${t.periodo_inicio}-${t.periodo_fin}`))).map(periodo => {
              const [inicio, fin] = periodo.split('-');
              const transfersPeriodo = transferenciasHistoricas.filter(t => 
                t.periodo_inicio === inicio && t.periodo_fin === fin
              );
              const totalPeriodo = transfersPeriodo.reduce((sum, t) => sum + t.importe_neto, 0);
              const todosConfirmados = transfersPeriodo.every(t => t.estado === 'confirmada');

              return (
                <div key={periodo} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {formatPeriodo(inicio, fin)}
                      </h4>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {transfersPeriodo.length} masajista{transfersPeriodo.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-teal-600">{totalPeriodo}€</div>
                      {todosConfirmados && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium mt-1">
                          <CheckCircle size={12} />
                          Ciclo Cerrado
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {transfersPeriodo.map(trans => {
                      const masajista = masajistas.find(m => m.id === trans.masajista_id);
                      const estado = getEstadoBadge(trans.estado);
                      const IconEstado = estado.icon;

                      return (
                        <div key={trans.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                          <div className="flex items-center gap-3">
                            <img
                              src={masajista?.foto || 'https://via.placeholder.com/32'}
                              alt={masajista?.nombre}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                              <div className="font-medium text-gray-900 text-sm">
                                {masajista?.nombre} {masajista?.apellidos}
                              </div>
                              <div className="text-xs text-gray-500">
                                {trans.sesiones} sesiones
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-semibold text-gray-900">{trans.importe_neto}€</div>
                              {trans.referencia_bancaria && (
                                <div className="text-xs text-gray-500 font-mono">{trans.referencia_bancaria}</div>
                              )}
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${estado.class}`}>
                              <IconEstado size={10} />
                              {trans.estado}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Marcar Enviada */}
      {showEnviarModal && (() => {
        const trans = transferencias.find(t => t.id === showEnviarModal);
        const masajista = masajistas.find(m => m.id === trans?.masajista_id);

        return (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowEnviarModal(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Send size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Marcar como Enviada</h3>
                      <p className="text-sm text-gray-600">{masajista?.nombre} {masajista?.apellidos}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Importe:</span>
                        <span className="ml-2 font-semibold text-gray-900">{trans?.importe_neto}€</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Sesiones:</span>
                        <span className="ml-2 font-semibold text-gray-900">{trans?.sesiones}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">IBAN:</span>
                        <span className="ml-2 font-mono text-gray-900">{masajista?.iban}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Referencia Bancaria *
                    </label>
                    <input
                      type="text"
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="TRF-2024-XXX"
                    />
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={() => {
                      setShowEnviarModal(null);
                      setReferencia('');
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleMarcarEnviada}
                    disabled={!referencia.trim()}
                    className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar Envío
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
