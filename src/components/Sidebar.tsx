import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCircle,
  DollarSign,
  ClipboardList,
  Settings,
  FileText,
  CreditCard,
  Inbox,
  History,
  User,
  Home,
  Bot,
  UserPlus,
  X
} from 'lucide-react';
import { useApp } from '../AppContext';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  // Estado del drawer móvil (en escritorio el sidebar es fijo y se ignora).
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ currentView, setCurrentView, mobileOpen = false, onClose }: SidebarProps) {
  const { currentUser, reservas } = useApp();

  if (!currentUser) return null;

  const getMenuItems = () => {
    if (currentUser.role === 'admin') {
      const pendientes = reservas.filter(r => r.estado === 'pendiente_asignacion').length;
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'reservas', label: 'Reservas', icon: Calendar, badge: pendientes > 0 ? pendientes : undefined },
        { id: 'masajistas', label: 'Masajistas', icon: Users },
        { id: 'accesos', label: 'Accesos', icon: UserPlus },
        { id: 'clientas', label: 'Clientas', icon: UserCircle },
        { id: 'servicios', label: 'Servicios', icon: ClipboardList },
        { id: 'agente', label: 'Agente', icon: Bot },
        { id: 'finanzas', label: 'Finanzas', icon: DollarSign },
        { id: 'transferencias', label: 'Transferencias', icon: CreditCard },
        { id: 'configuracion', label: 'Configuración', icon: Settings }
      ];
    }

    if (currentUser.role === 'masajista') {
      const solicitudes = reservas.filter(r =>
        r.estado === 'pendiente_asignacion'
      ).length;

      const docsIncompletos = (currentUser as any).documentos?.some((d: any) => d.estado !== 'verificado');

      return [
        { id: 'calendario', label: 'Mi Calendario', icon: Calendar },
        { id: 'solicitudes', label: 'Solicitudes', icon: Inbox, badge: solicitudes > 0 ? solicitudes : undefined },
        { id: 'disponibilidad', label: 'Disponibilidad', icon: ClipboardList },
        { id: 'historial', label: 'Historial', icon: History },
        { id: 'cobros', label: 'Mis Cobros', icon: DollarSign },
        { id: 'documentacion', label: 'Documentación', icon: FileText, badge: docsIncompletos ? '⚠️' : undefined },
        { id: 'perfil', label: 'Mi Perfil', icon: User }
      ];
    }

    if (currentUser.role === 'clienta') {
      return [
        { id: 'inicio', label: 'Inicio', icon: Home },
        { id: 'asistente', label: 'Asistente', icon: Bot },
        { id: 'nueva-reserva', label: 'Nueva Reserva', icon: Calendar },
        { id: 'mis-reservas', label: 'Mis Reservas', icon: ClipboardList },
        { id: 'mis-datos', label: 'Mis Datos', icon: User }
      ];
    }

    return [];
  };

  const menuItems = getMenuItems();

  const handleSelect = (id: string) => {
    setCurrentView(id);
    onClose?.(); // en móvil, cerrar el drawer al navegar
  };

  const navList = (
    <nav className="p-4 space-y-1">
      {menuItems.map(item => {
        const Icon = item.icon;
        const isActive = currentView === item.id;

        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive
                ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Icon size={20} />
            <span className="font-medium flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-red-500 text-white'
              }`}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Escritorio: columna fija */}
      <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] sticky top-16">
        {navList}
      </aside>

      {/* Móvil: drawer deslizante + backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[80%] bg-white border-r border-gray-200 shadow-xl transform transition-transform duration-200 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-lg">💆‍♀️</span>
            </div>
            <span className="font-bold text-gray-900">MassFlow</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Cerrar menú">
            <X size={20} className="text-gray-600" />
          </button>
        </div>
        {navList}
      </aside>
    </>
  );
}
