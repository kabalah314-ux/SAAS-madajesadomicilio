import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Calendar, DollarSign, UserCheck, Clock } from 'lucide-react';
import { useApp } from '../../AppContext';

export default function Dashboard() {
  const { reservas, masajistas, clientas, servicios } = useApp();

  // KPIs principales
  const totalReservas = reservas.length;
  const reservasHoy = reservas.filter(r => r.fecha === new Date().toISOString().split('T')[0]).length;
  const ingresosMes = reservas
    .filter(r => r.estado === 'completada' && new Date(r.fecha).getMonth() === new Date().getMonth())
    .reduce((sum, r) => sum + r.precio_total, 0);
  const comisionMes = Math.round(ingresosMes * 0.4); // 40% comisión
  
  const tasaCompletadas = reservas.length > 0
    ? Math.round((reservas.filter(r => r.estado === 'completada').length / reservas.length) * 100)
    : 0;

  const masajistasActivas = masajistas.filter(m => m.activo).length;
  const clientasActivas = clientas.filter(c => !c.bloqueada).length;
  const pendientesAsignacion = reservas.filter(r => r.estado === 'pendiente_asignacion').length;

  // Datos para gráficos
  const reservasPorEstado = [
    { name: 'Confirmadas', value: reservas.filter(r => r.estado === 'confirmada').length, color: '#10b981' },
    { name: 'Completadas', value: reservas.filter(r => r.estado === 'completada').length, color: '#6b7280' },
    { name: 'Pendientes', value: reservas.filter(r => r.estado === 'pendiente_asignacion').length, color: '#f59e0b' },
    { name: 'Canceladas', value: reservas.filter(r => r.estado === 'cancelada_clienta' || r.estado === 'cancelada_masajista').length, color: '#ef4444' }
  ];

  const reservasPorServicio = servicios.map(s => ({
    name: s.nombre.split(' ')[1] || s.nombre,
    cantidad: reservas.filter(r => r.servicio_id === s.id).length,
    ingresos: reservas.filter(r => r.servicio_id === s.id && r.estado === 'completada').reduce((sum, r) => sum + r.precio_total, 0)
  }));

  // Simulación de datos por semana (últimos 7 días)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const reservasPorDia = last7Days.map(fecha => ({
    fecha: new Date(fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
    reservas: reservas.filter(r => r.fecha === fecha).length,
    ingresos: reservas.filter(r => r.fecha === fecha && r.estado === 'completada').reduce((sum, r) => sum + r.precio_total, 0)
  }));

  const topMasajistas = masajistas
    .map(m => ({
      nombre: m.nombre,
      sesiones: reservas.filter(r => r.masajista_id === m.id && r.estado === 'completada').length,
      rating: m.rating_promedio,
      ingresos: reservas.filter(r => r.masajista_id === m.id && r.estado === 'completada').reduce((sum, r) => sum + r.pago_masajista, 0)
    }))
    .sort((a, b) => b.sesiones - a.sesiones)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Vista general del sistema MassFlow</p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Calendar size={24} className="text-purple-100" />
            <span className="text-purple-100 text-sm">Hoy: {reservasHoy}</span>
          </div>
          <div className="text-3xl font-bold mb-1">{totalReservas}</div>
          <div className="text-purple-100 text-sm">Total Reservas</div>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <UserCheck size={24} className="text-teal-100" />
            <span className="text-teal-100 text-sm">{masajistasActivas} activas</span>
          </div>
          <div className="text-3xl font-bold mb-1">{masajistas.length}</div>
          <div className="text-teal-100 text-sm">Masajistas</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Users size={24} className="text-blue-100" />
            <span className="text-blue-100 text-sm">{clientasActivas} activas</span>
          </div>
          <div className="text-3xl font-bold mb-1">{clientas.length}</div>
          <div className="text-blue-100 text-sm">Clientas</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Clock size={24} className="text-orange-100" />
            <span className="text-orange-100 text-sm">{tasaCompletadas}% tasa</span>
          </div>
          <div className="text-3xl font-bold mb-1">{pendientesAsignacion}</div>
          <div className="text-orange-100 text-sm">Pendientes Asignación</div>
        </div>
      </div>

      {/* Métricas financieras */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Ingresos este mes</div>
              <div className="text-2xl font-bold text-gray-900">{ingresosMes}€</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600">
            <TrendingUp size={16} />
            <span>+12% vs mes anterior</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Comisión plataforma</div>
              <div className="text-2xl font-bold text-gray-900">{comisionMes}€</div>
            </div>
          </div>
          <div className="text-sm text-gray-500">40% de {ingresosMes}€</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-teal-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Pago a masajistas</div>
              <div className="text-2xl font-bold text-gray-900">{ingresosMes - comisionMes}€</div>
            </div>
          </div>
          <div className="text-sm text-gray-500">60% de {ingresosMes}€</div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reservas por día */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reservas últimos 7 días</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={reservasPorDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="reservas" stroke="#14b8a6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distribución por estado */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por estado</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={reservasPorEstado}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {reservasPorEstado.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Reservas por servicio */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reservas por servicio</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={reservasPorServicio}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#14b8a6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top masajistas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Masajistas</h3>
          <div className="space-y-3">
            {topMasajistas.map((m, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                  idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-600' : 'bg-gray-300'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{m.nombre}</div>
                  <div className="text-sm text-gray-600">{m.sesiones} sesiones • ⭐ {m.rating}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-teal-600">{m.ingresos}€</div>
                  <div className="text-xs text-gray-500">generados</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h3>
        <div className="space-y-3">
          {reservas.slice(0, 5).map(r => {
            const servicio = servicios.find(s => s.id === r.servicio_id);
            const clienta = clientas.find(c => c.id === r.clienta_id);
            
            return (
              <div key={r.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition">
                <span className="text-2xl">{servicio?.emoji}</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{servicio?.nombre}</div>
                  <div className="text-sm text-gray-600">
                    {clienta?.nombre} • {new Date(r.fecha).toLocaleDateString('es-ES')} {r.hora_inicio}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  r.estado === 'confirmada' ? 'bg-green-100 text-green-700' :
                  r.estado === 'pendiente_asignacion' ? 'bg-yellow-100 text-yellow-700' :
                  r.estado === 'completada' ? 'bg-gray-100 text-gray-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {r.estado.replace(/_/g, ' ')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
