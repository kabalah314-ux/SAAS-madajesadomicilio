import { useState } from 'react';
import { Calendar, Filter, UserPlus, Ban, CheckCircle, X } from 'lucide-react';
import { useApp } from '../../AppContext';
import { Reserva } from '../../types';

type FiltroEstado = 'todas' | 'pendiente_asignacion' | 'ofrecida' | 'confirmada' | 'completada' | 'cancelada';

export default function GestionReservas() {
  const { reservas, servicios, clientas, masajistas, updateReserva, marcarReservaCompletada, ofrecerReserva, currentUser } = useApp();
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todas');
  const [showAsignar, setShowAsignar] = useState<Reserva | null>(null);
  const [masajistaSeleccionada, setMasajistaSeleccionada] = useState('');
  const [showCancelar, setShowCancelar] = useState<Reserva | null>(null);
  const [motivoCancel, setMotivoCancel] = useState('');
  const [detalle, setDetalle] = useState<Reserva | null>(null);

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
      'ofrecida': { label: 'Oferta enviada', class: 'bg-amber-100 text-amber-700' },
      'cancelada_clienta': { label: 'Cancelada', class: 'bg-red-100 text-red-700' },
      'cancelada_masajista': { label: 'Cancelada', class: 'bg-red-100 text-red-700' }
    };
    return badges[estado] || badges.pendiente_asignacion;
  };

  const handleAsignar = async () => {
    if (!showAsignar || !masajistaSeleccionada) return;
    try {
      if (showAsignar.estado === 'confirmada') {
        // Ya confirmada → reasignación directa (el admin puede por el trigger).
        await updateReserva(showAsignar.id, { masajista_id: masajistaSeleccionada });
      } else {
        // Pendiente → se OFRECE a la masajista (no se confirma; ella decide).
        await ofrecerReserva(showAsignar.id, masajistaSeleccionada);
      }
      setShowAsignar(null);
      setMasajistaSeleccionada('');
      setDetalle(null);
    } catch (e: any) {
      alert(e?.message || 'No se pudo completar la acción');
    }
  };

  const handleCompletar = async (reserva: Reserva) => {
    try {
      await marcarReservaCompletada(reserva.id);
      setDetalle(null);
    } catch (e: any) {
      alert(e?.message || 'No se pudo completar la reserva');
    }
  };

  const handleCancelar = async () => {
    if (!showCancelar || !motivoCancel.trim()) return;
    try {
      await updateReserva(showCancelar.id, {
        estado: showCancelar.masajista_id ? 'cancelada_masajista' : 'cancelada_clienta',
        motivo_cancelacion: motivoCancel.trim(),
        cancelado_por: currentUser?.id,
      });
      setShowCancelar(null);
      setMotivoCancel('');
      setDetalle(null);
    } catch (e: any) {
      alert(e?.message || 'No se pudo cancelar la reserva');
    }
  };

  const handleRetirarOferta = async (reserva: Reserva) => {
    try {
      // masajista_id null = liberar la reserva (el tipo la marca opcional; el cast es intencional).
      await updateReserva(reserva.id, { estado: 'pendiente_asignacion', masajista_id: null } as any);
      setDetalle(null);
    } catch (e: any) {
      alert(e?.message || 'No se pudo retirar la oferta');
    }
  };

  // Botones de acción según el estado de la reserva. Se usa en la tabla (escritorio)
  // y en el drawer de detalle (móvil). Abrir un modal cierra el drawer para no solaparlos.
  const renderAcciones = (reserva: Reserva) => {
    if (reserva.estado === 'pendiente_asignacion') {
      return (
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => { setDetalle(null); setShowAsignar(reserva); }} className="text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
            <UserPlus size={16} />Ofrecer a…
          </button>
          <button onClick={() => { setDetalle(null); setShowCancelar(reserva); }} className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1">
            <Ban size={16} />Cancelar
          </button>
        </div>
      );
    }
    if (reserva.estado === 'ofrecida') {
      const m = masajistas.find(x => x.id === reserva.masajista_id);
      return (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-amber-700">Esperando respuesta{m ? ` de ${m.nombre}` : ''}</span>
          <button onClick={() => { setDetalle(null); setShowAsignar(reserva); }} className="text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
            <UserPlus size={16} />Ofrecer a otra
          </button>
          <button onClick={() => handleRetirarOferta(reserva)} className="text-gray-600 hover:text-gray-800 font-medium flex items-center gap-1">
            <X size={16} />Retirar
          </button>
        </div>
      );
    }
    if (reserva.estado === 'confirmada') {
      return (
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => handleCompletar(reserva)} className="text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
            <CheckCircle size={16} />Completar
          </button>
          <button onClick={() => { setDetalle(null); setShowAsignar(reserva); }} className="text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
            <UserPlus size={16} />Reasignar
          </button>
          <button onClick={() => { setDetalle(null); setShowCancelar(reserva); }} className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1">
            <Ban size={16} />Cancelar
          </button>
        </div>
      );
    }
    return <span className="text-gray-400">—</span>;
  };

  const stats = {
    total: reservas.length,
    pendientes: reservas.filter(r => r.estado === 'pendiente_asignacion').length,
    ofrecidas: reservas.filter(r => r.estado === 'ofrecida').length,
    confirmadas: reservas.filter(r => r.estado === 'confirmada').length,
    completadas: reservas.filter(r => r.estado === 'completada').length
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Reservas</h2>
          <p className="text-gray-600 mt-1">{stats.total} reservas en el sistema</p>
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
            <option value="ofrecida">Ofrecidas ({stats.ofrecidas})</option>
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

      {/* Tabla de reservas (escritorio) */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                        {reserva.direccion.barrio || reserva.direccion.ciudad || '—'}
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
                        {renderAcciones(reserva)}
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

      {/* Tarjetas (móvil) */}
      <div className="lg:hidden space-y-3">
        {reservasFiltradas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 text-center py-12 text-gray-500">
            <Calendar size={48} className="mx-auto mb-3 text-gray-300" />
            <p>No hay reservas que coincidan con el filtro seleccionado</p>
          </div>
        ) : (
          reservasFiltradas
            .sort((a, b) => new Date(b.creada_en).getTime() - new Date(a.creada_en).getTime())
            .map(reserva => {
              const clienta = clientas.find(c => c.id === reserva.clienta_id);
              const masajista = masajistas.find(m => m.id === reserva.masajista_id);
              const estado = getEstadoBadge(reserva.estado);
              return (
                <button
                  key={reserva.id}
                  onClick={() => setDetalle(reserva)}
                  className="w-full text-left bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{clienta?.nombre} {clienta?.apellidos}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {masajista ? `${masajista.nombre} ${masajista.apellidos}` : 'Sin asignar'}
                      </p>
                    </div>
                    <span className={`inline-flex flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${estado.class}`}>
                      {estado.label}
                    </span>
                  </div>
                </button>
              );
            })
        )}
      </div>

      {/* Detalle de reserva (móvil): ficha flotante con info completa + acciones */}
      {detalle && (() => {
        const servicio = servicios.find(s => s.id === detalle.servicio_id);
        const clienta = clientas.find(c => c.id === detalle.clienta_id);
        const masajista = masajistas.find(m => m.id === detalle.masajista_id);
        const estado = getEstadoBadge(detalle.estado);
        const direccionTexto = [detalle.direccion.calle, detalle.direccion.numero].filter(Boolean).join(' ') || '—';
        return (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setDetalle(null)} />
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
              <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-5 border-b border-gray-200 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-mono text-gray-500">{detalle.codigo}</p>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span className="text-xl">{servicio?.emoji}</span>{servicio?.nombre}
                    </h3>
                  </div>
                  <button onClick={() => setDetalle(null)} className="p-1 text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Estado</span>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${estado.class}`}>{estado.label}</span>
                  </div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500">Clienta</span><span className="text-gray-900 font-medium text-right">{clienta?.nombre} {clienta?.apellidos}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500">Masajista</span><span className="text-gray-900 font-medium text-right">{masajista ? `${masajista.nombre} ${masajista.apellidos}` : 'Sin asignar'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500">Fecha / hora</span><span className="text-gray-900 font-medium text-right">{new Date(detalle.fecha).toLocaleDateString('es-ES')} · {detalle.hora_inicio}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500">Zona</span><span className="text-gray-900 font-medium text-right">{detalle.direccion.barrio || detalle.direccion.ciudad || '—'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500">Dirección</span><span className="text-gray-900 font-medium text-right">{direccionTexto}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500">Precio</span><span className="text-gray-900 font-medium text-right">{detalle.precio_total}€</span></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500">Pago masajista</span><span className="text-gray-900 font-medium text-right">{Math.round(detalle.pago_masajista)}€</span></div>
                  {detalle.notas_clienta && (
                    <div><span className="text-gray-500">Notas</span><p className="text-gray-900 mt-1">{detalle.notas_clienta}</p></div>
                  )}
                </div>
                <div className="p-5 border-t border-gray-200">
                  {renderAcciones(detalle)}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Modal cancelar reserva (motivo obligatorio) */}
      {showCancelar && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => { setShowCancelar(null); setMotivoCancel(''); }} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Cancelar reserva {showCancelar.codigo}</h3>
                <p className="text-sm text-gray-600 mt-1">Indica el motivo de la cancelación. Se guardará en la reserva.</p>
              </div>
              <div className="p-6">
                <textarea
                  value={motivoCancel}
                  onChange={(e) => setMotivoCancel(e.target.value)}
                  rows={3}
                  autoFocus
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none"
                  placeholder="Motivo de la cancelación..."
                />
              </div>
              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => { setShowCancelar(null); setMotivoCancel(''); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Volver
                </button>
                <button
                  onClick={handleCancelar}
                  disabled={!motivoCancel.trim()}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar cancelación
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de asignación */}
      {showAsignar && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAsignar(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">{showAsignar.estado === 'confirmada' ? 'Reasignar Masajista' : 'Ofrecer a una masajista'}</h3>
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
                      <span className="ml-2 font-medium text-gray-900">{showAsignar.direccion.barrio || showAsignar.direccion.ciudad || '—'}</span>
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
                    // Zona de la reserva: barrio si existe, si no la ciudad.
                    const zonaReserva = (showAsignar.direccion.barrio || showAsignar.direccion.ciudad || '').toLowerCase();
                    // B2: si la reserva no trae barrio ni ciudad, la zona es DESCONOCIDA. No se puede
                    // afirmar que la masajista la cubre → se avisa aparte (antes se ocultaba el aviso).
                    const zonaDesconocida = !zonaReserva;
                    // Cubre la zona si la masajista no tiene zonas definidas o coincide (fuzzy).
                    const cubreLaZona = !zonaDesconocida && (
                      masajista.zonas_cobertura.length === 0
                      || masajista.zonas_cobertura.some(z => {
                        const zz = z.toLowerCase();
                        return zz === zonaReserva || zz.includes(zonaReserva) || zonaReserva.includes(zz);
                      })
                    );

                    return (
                      <button
                        key={masajista.id}
                        onClick={() => setMasajistaSeleccionada(masajista.id)}
                        className={`w-full p-4 rounded-lg border-2 transition text-left ${
                          masajistaSeleccionada === masajista.id
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-200 hover:border-gray-300'
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
                            {zonaDesconocida ? (
                              <div className="text-xs text-amber-600 mt-1">
                                ⚠️ La reserva no tiene zona (barrio/ciudad); verifica que cubre la dirección antes de asignar.
                              </div>
                            ) : !cubreLaZona ? (
                              <div className="text-xs text-amber-600 mt-1">
                                ⚠️ Quizá no cubre {showAsignar.direccion.barrio || showAsignar.direccion.ciudad || 'la zona'} (puedes asignarla igualmente)
                              </div>
                            ) : null}
                          </div>
                          <div className="text-sm text-gray-600">
                            {Math.round(showAsignar.pago_masajista)}€ pago
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
                  {showAsignar.estado === 'confirmada' ? 'Confirmar Reasignación' : 'Enviar oferta'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
