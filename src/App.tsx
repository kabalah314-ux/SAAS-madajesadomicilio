import { useState } from 'react';
import { AppProvider, useApp } from './AppContext';
import { useAuth } from './hooks/useAuth';
import Login from './components/Login';
import Header from './components/Header';
import Sidebar from './components/Sidebar';

// Masajista
import MiCalendario from './components/masajista/MiCalendario';
import Solicitudes from './components/masajista/Solicitudes';
import Historial from './components/masajista/Historial';
import MisCobros from './components/masajista/MisCobros';
import Documentacion from './components/masajista/Documentacion';
import MiPerfil from './components/masajista/MiPerfil';
import Disponibilidad from './components/masajista/Disponibilidad';

// Cliente
import MisDatos from './components/clienta/MisDatos';
import NuevaReserva from './components/clienta/NuevaReserva';
import MisReservas from './components/clienta/MisReservas';

// Admin
import Dashboard from './components/admin/Dashboard';
import GestionReservas from './components/admin/GestionReservas';
import GestionMasajistas from './components/admin/GestionMasajistas';
import GestionClientas from './components/admin/GestionClientas';
import GestionServicios from './components/admin/GestionServicios';
import Configuracion from './components/admin/Configuracion';
import Finanzas from './components/admin/Finanzas';
import GestionTransferencias from './components/admin/GestionTransferencias';

function AppContent() {
  const { currentUser } = useApp();
  const { loading } = useAuth();
  const [currentView, setCurrentView] = useState(
    currentUser?.role === 'admin' ? 'dashboard' :
    currentUser?.role === 'masajista' ? 'calendario' :
    'inicio'
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl mb-4 shadow-lg animate-pulse">
            <span className="text-3xl">💆‍♀️</span>
          </div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  const renderView = () => {
    // Masajista views
    if (currentUser.role === 'masajista') {
      switch (currentView) {
        case 'calendario': return <MiCalendario />;
        case 'solicitudes': return <Solicitudes />;
        case 'disponibilidad': return <Disponibilidad />;
        case 'historial': return <Historial />;
        case 'cobros': return <MisCobros />;
        case 'documentacion': return <Documentacion />;
        case 'perfil': return <MiPerfil />;
        default: return <MiCalendario />;
      }
    }

    // Cliente views
    if (currentUser.role === 'clienta') {
      switch (currentView) {
        case 'inicio': return <ClienteInicioStub />;
        case 'nueva-reserva': return <NuevaReserva />;
        case 'mis-reservas': return <MisReservas />;
        case 'mis-datos': return <MisDatos />;
        default: return <ClienteInicioStub />;
      }
    }

    // Admin views
    if (currentUser.role === 'admin') {
      switch (currentView) {
        case 'dashboard': return <Dashboard />;
        case 'reservas': return <GestionReservas />;
        case 'masajistas': return <GestionMasajistas />;
        case 'clientas': return <GestionClientas />;
        case 'servicios': return <GestionServicios />;
        case 'finanzas': return <Finanzas />;
        case 'transferencias': return <GestionTransferencias />;
        case 'configuracion': return <Configuracion />;
        default: return <Dashboard />;
      }
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
        <main className="flex-1 p-6">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

// Componentes stub temporales
function DisponibilidadStub() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">📅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestión de Disponibilidad</h2>
          <p className="text-gray-600">
            Configura tus horarios disponibles por día de la semana. Esta funcionalidad está en desarrollo.
          </p>
        </div>
      </div>
    </div>
  );
}

function ClienteInicioStub() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl shadow-lg p-8 text-white mb-6">
        <h1 className="text-3xl font-bold mb-2">¡Bienvenida! 💆‍♀️</h1>
        <p className="text-teal-100">
          Reserva tu próxima sesión de masaje a domicilio en minutos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-4xl mb-3">🌸</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nueva Reserva</h3>
          <p className="text-gray-600 text-sm mb-4">
            Selecciona el servicio, fecha y horario que mejor te venga
          </p>
          <button className="w-full px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:from-teal-600 hover:to-emerald-700 transition">
            Reservar ahora
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Mis Reservas</h3>
          <p className="text-gray-600 text-sm mb-4">
            Consulta el estado de tus sesiones programadas
          </p>
          <button className="w-full px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
            Ver reservas
          </button>
        </div>
      </div>
    </div>
  );
}

function NuevaReservaStub() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">💆‍♀️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Nueva Reserva</h2>
          <p className="text-gray-600">
            Flujo de reserva de 6 pasos en desarrollo
          </p>
        </div>

        <div className="flex justify-between mb-8">
          {['Servicio', 'Fecha', 'Dirección', 'Masajista', 'Checkout', 'Confirmación'].map((step, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i === 0 ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {i + 1}
              </div>
              <div className="text-xs text-gray-600 mt-1 hidden md:block">{step}</div>
            </div>
          ))}
        </div>

        <div className="text-center text-gray-500">
          Componente de flujo de reserva en desarrollo
        </div>
      </div>
    </div>
  );
}

function MisReservasStub() {
  const { reservas, servicios, currentUser } = useApp();
  
  const misReservas = reservas.filter(r => r.clienta_id === currentUser?.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mis Reservas</h2>
        <p className="text-gray-600 mt-1">
          {misReservas.length} reserva{misReservas.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="text-blue-100 text-sm mb-1">Próximas</div>
          <div className="text-3xl font-bold">
            {misReservas.filter(r => r.estado === 'confirmada').length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="text-green-100 text-sm mb-1">Completadas</div>
          <div className="text-3xl font-bold">
            {misReservas.filter(r => r.estado === 'completada').length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="text-yellow-100 text-sm mb-1">Pendientes</div>
          <div className="text-3xl font-bold">
            {misReservas.filter(r => r.estado === 'pendiente_asignacion').length}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {misReservas.map(reserva => {
          const servicio = servicios.find(s => s.id === reserva.servicio_id);
          const getEstadoBadge = (estado: string) => {
            const badges: Record<string, string> = {
              'confirmada': 'bg-green-100 text-green-700',
              'completada': 'bg-gray-100 text-gray-700',
              'pendiente_asignacion': 'bg-yellow-100 text-yellow-700',
              'cancelada_clienta': 'bg-red-100 text-red-700'
            };
            return badges[estado] || 'bg-gray-100 text-gray-700';
          };

          return (
            <div key={reserva.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-3xl">{servicio?.emoji}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{servicio?.nombre}</h3>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {new Date(reserva.fecha).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })} • {reserva.hora_inicio}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{reserva.codigo}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoBadge(reserva.estado)}`}>
                  {reserva.estado.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminDashboardStub() {
  const { reservas, masajistas, clientas } = useApp();
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Administrativo</h2>
        <p className="text-gray-600 mt-1">Vista general del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="text-purple-100 text-sm mb-1">Total Reservas</div>
          <div className="text-3xl font-bold">{reservas.length}</div>
        </div>
        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="text-teal-100 text-sm mb-1">Masajistas</div>
          <div className="text-3xl font-bold">{masajistas.length}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="text-blue-100 text-sm mb-1">Clientas</div>
          <div className="text-3xl font-bold">{clientas.length}</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="text-orange-100 text-sm mb-1">Pendientes</div>
          <div className="text-3xl font-bold">
            {reservas.filter(r => r.estado === 'pendiente_asignacion').length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Panel de Administración</h3>
        <p className="text-gray-600">
          Vista completa con gráficos, gestión de reservas, masajistas, clientas, servicios y finanzas en desarrollo
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
