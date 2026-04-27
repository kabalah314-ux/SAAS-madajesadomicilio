import { useState } from 'react';
import { DollarSign, Download, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { useApp } from '../../AppContext';

type PeriodoFiltro = 'mes_actual' | 'mes_anterior' | '3_meses' | '6_meses' | 'año';

export default function Finanzas() {
  const { reservas, servicios, clientas, configuracion } = useApp();
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes_actual');

  const getPeriodoFecha = () => {
    const hoy = new Date();
    switch (periodo) {
      case 'mes_actual':
        return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      case 'mes_anterior':
        return new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      case '3_meses':
        return new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1);
      case '6_meses':
        return new Date(hoy.getFullYear(), hoy.getMonth() - 6, 1);
      case 'año':
        return new Date(hoy.getFullYear(), 0, 1);
      default:
        return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    }
  };

  const fechaInicio = getPeriodoFecha();
  
  const reservasFiltradas = reservas.filter(r => {
    const fechaReserva = new Date(r.fecha);
    return fechaReserva >= fechaInicio;
  });

  const reservasCompletadas = reservasFiltradas.filter(r => r.estado === 'completada');

  // Cálculos financieros
  const ingresosBrutos = reservasCompletadas.reduce((sum, r) => sum + r.precio_total, 0);
  const comisionPlataforma = Math.round(ingresosBrutos * configuracion.comision_plataforma_pct / 100);
  const pagoMasajistas = Math.round(ingresosBrutos * configuracion.pago_masajista_pct / 100);
  const bai = comisionPlataforma; // BAI = Comisión plataforma (antes de impuestos)
  const presupuestoMetaAds = Math.round(bai * configuracion.presupuesto_meta_ads_pct / 100);
  const beneficioNeto = bai - presupuestoMetaAds;

  // Estadísticas adicionales
  const ticketPromedio = reservasCompletadas.length > 0 
    ? Math.round(ingresosBrutos / reservasCompletadas.length) 
    : 0;

  const clientasActivas = new Set(reservasCompletadas.map(r => r.clienta_id)).size;
  
  // Calcular mes anterior para comparación
  const mesAnteriorInicio = new Date(fechaInicio);
  mesAnteriorInicio.setMonth(mesAnteriorInicio.getMonth() - 1);
  const reservasMesAnterior = reservas.filter(r => {
    const fecha = new Date(r.fecha);
    return fecha >= mesAnteriorInicio && fecha < fechaInicio && r.estado === 'completada';
  });
  const ingresosMesAnterior = reservasMesAnterior.reduce((sum, r) => sum + r.precio_total, 0);
  const crecimiento = ingresosMesAnterior > 0 
    ? Math.round(((ingresosBrutos - ingresosMesAnterior) / ingresosMesAnterior) * 100)
    : 0;

  // Servicios más vendidos
  const serviciosCount: Record<string, { cantidad: number; ingresos: number }> = {};
  reservasCompletadas.forEach(r => {
    if (!serviciosCount[r.servicio_id]) {
      serviciosCount[r.servicio_id] = { cantidad: 0, ingresos: 0 };
    }
    serviciosCount[r.servicio_id].cantidad++;
    serviciosCount[r.servicio_id].ingresos += r.precio_total;
  });

  const topServicios = Object.entries(serviciosCount)
    .map(([id, stats]) => ({
      servicio: servicios.find(s => s.id === id),
      ...stats
    }))
    .sort((a, b) => b.ingresos - a.ingresos)
    .slice(0, 5);

  // Top clientas
  const clientasCount: Record<string, { cantidad: number; gasto: number }> = {};
  reservasCompletadas.forEach(r => {
    if (!clientasCount[r.clienta_id]) {
      clientasCount[r.clienta_id] = { cantidad: 0, gasto: 0 };
    }
    clientasCount[r.clienta_id].cantidad++;
    clientasCount[r.clienta_id].gasto += r.precio_total;
  });

  const topClientas = Object.entries(clientasCount)
    .map(([id, stats]) => ({
      clienta: clientas.find(c => c.id === id),
      ...stats
    }))
    .sort((a, b) => b.gasto - a.gasto)
    .slice(0, 5);

  const exportToCSV = () => {
    const headers = ['Fecha', 'Código', 'Servicio', 'Cliente', 'Precio Total', 'Comisión', 'Pago Masajista', 'Estado'];
    const rows = reservasFiltradas.map(r => {
      const servicio = servicios.find(s => s.id === r.servicio_id);
      const clienta = clientas.find(c => c.id === r.clienta_id);
      const comision = Math.round(r.precio_total * configuracion.comision_plataforma_pct / 100);
      
      return [
        r.fecha,
        r.codigo,
        servicio?.nombre || '',
        clienta?.nombre || '',
        `${r.precio_total}€`,
        `${comision}€`,
        `${r.pago_masajista}€`,
        r.estado
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanzas-massflow-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Finanzas</h2>
          <p className="text-gray-600 mt-1">Análisis financiero del sistema</p>
        </div>

        <div className="flex items-center gap-3">
          <Filter size={18} className="text-gray-400" />
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as PeriodoFiltro)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
          >
            <option value="mes_actual">Este mes</option>
            <option value="mes_anterior">Mes anterior</option>
            <option value="3_meses">Últimos 3 meses</option>
            <option value="6_meses">Últimos 6 meses</option>
            <option value="año">Este año</option>
          </select>

          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition font-medium flex items-center gap-2"
          >
            <Download size={18} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <DollarSign size={24} className="text-green-100" />
            <div className={`flex items-center gap-1 text-sm ${crecimiento >= 0 ? 'text-green-100' : 'text-red-200'}`}>
              {crecimiento >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {Math.abs(crecimiento)}%
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{ingresosBrutos}€</div>
          <div className="text-green-100 text-sm">Ingresos Brutos</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">💰</span>
            <span className="text-purple-100 text-sm">{configuracion.comision_plataforma_pct}%</span>
          </div>
          <div className="text-3xl font-bold mb-1">{comisionPlataforma}€</div>
          <div className="text-purple-100 text-sm">Comisión Plataforma</div>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">👥</span>
            <span className="text-teal-100 text-sm">{configuracion.pago_masajista_pct}%</span>
          </div>
          <div className="text-3xl font-bold mb-1">{pagoMasajistas}€</div>
          <div className="text-teal-100 text-sm">Pago Masajistas</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">📊</span>
            <span className="text-blue-100 text-sm">{reservasCompletadas.length} sesiones</span>
          </div>
          <div className="text-3xl font-bold mb-1">{ticketPromedio}€</div>
          <div className="text-blue-100 text-sm">Ticket Promedio</div>
        </div>
      </div>

      {/* Desglose Financiero */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Desglose Financiero</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Ingresos Brutos</span>
              <span className="font-semibold text-gray-900">{ingresosBrutos}€</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-gray-600">Comisión Plataforma ({configuracion.comision_plataforma_pct}%)</span>
              <span className="font-semibold text-green-700">+{comisionPlataforma}€</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg">
              <span className="text-sm text-gray-600">Pago Masajistas ({configuracion.pago_masajista_pct}%)</span>
              <span className="font-semibold text-teal-700">-{pagoMasajistas}€</span>
            </div>
            <div className="h-px bg-gray-200 my-2"></div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-gray-900">BAI (Beneficio antes impuestos)</span>
              <span className="font-bold text-blue-700 text-lg">{bai}€</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <span className="text-sm text-gray-600">Meta Ads ({configuracion.presupuesto_meta_ads_pct}% BAI)</span>
              <span className="font-semibold text-orange-700">-{presupuestoMetaAds}€</span>
            </div>
            <div className="h-px bg-gray-200 my-2"></div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
              <span className="font-semibold text-gray-900">Beneficio Neto</span>
              <span className="font-bold text-purple-700 text-xl">{beneficioNeto}€</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas del Período</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{reservasCompletadas.length}</div>
              <div className="text-sm text-gray-600 mt-1">Sesiones Completadas</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">{clientasActivas}</div>
              <div className="text-sm text-gray-600 mt-1">Clientas Activas</div>
            </div>
            <div className="p-4 bg-teal-50 rounded-lg">
              <div className="text-2xl font-bold text-teal-700">{ticketPromedio}€</div>
              <div className="text-sm text-gray-600 mt-1">Ticket Promedio</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">
                {clientasActivas > 0 ? Math.round(ingresosBrutos / clientasActivas) : 0}€
              </div>
              <div className="text-sm text-gray-600 mt-1">Gasto/Clienta</div>
            </div>
          </div>

          {crecimiento !== 0 && (
            <div className={`mt-4 p-4 rounded-lg ${crecimiento >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-2">
                {crecimiento >= 0 ? <TrendingUp className="text-green-600" /> : <TrendingDown className="text-red-600" />}
                <span className={`font-semibold ${crecimiento >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  {crecimiento >= 0 ? '+' : ''}{crecimiento}% vs período anterior
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Servicios y Clientas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Servicios</h3>
          <div className="space-y-3">
            {topServicios.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                  idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-600' : 'bg-gray-300'
                }`}>
                  {idx + 1}
                </div>
                <span className="text-2xl">{item.servicio?.emoji}</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{item.servicio?.nombre}</div>
                  <div className="text-sm text-gray-600">{item.cantidad} sesiones</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-teal-600">{item.ingresos}€</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Clientas</h3>
          <div className="space-y-3">
            {topClientas.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                  idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-600' : 'bg-gray-300'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{item.clienta?.nombre} {item.clienta?.apellidos}</div>
                  <div className="text-sm text-gray-600">{item.cantidad} sesiones</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-purple-600">{item.gasto}€</div>
                  <div className="text-xs text-gray-500">{Math.round(item.gasto / item.cantidad)}€/sesión</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de transacciones */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Historial de Transacciones</h3>
          <span className="text-sm text-gray-600">{reservasFiltradas.length} registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Código</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Servicio</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Comisión</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reservasFiltradas
                .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                .slice(0, 50)
                .map(reserva => {
                  const servicio = servicios.find(s => s.id === reserva.servicio_id);
                  const clienta = clientas.find(c => c.id === reserva.clienta_id);
                  const comision = Math.round(reserva.precio_total * configuracion.comision_plataforma_pct / 100);

                  return (
                    <tr key={reserva.id} className="hover:bg-gray-50 transition">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {clienta?.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {reserva.precio_total}€
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        +{comision}€
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          reserva.estado === 'completada' ? 'bg-green-100 text-green-700' :
                          reserva.estado === 'confirmada' ? 'bg-blue-100 text-blue-700' :
                          reserva.estado === 'pendiente_asignacion' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {reserva.estado.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
