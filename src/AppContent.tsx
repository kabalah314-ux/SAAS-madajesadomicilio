import { useState } from 'react';
import { useApp } from './AppContext';
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

export default function AppContent() {
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
