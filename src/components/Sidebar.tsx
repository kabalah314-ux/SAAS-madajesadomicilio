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
  X,
  MessageCircle
} from 'lucide-react';
import { useApp } from '../AppContext';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ currentView, setCurrentView, isOpen, onClose }: SidebarProps) {
  const { currentUser, reservas } = useApp();

  if (!currentUser) return null;

  const getMenuItems = () => {
    if (currentUser.role === 'admin') {
      const pendientes = reservas.filter(r => r.estado === 'pendiente_asignacion').length;
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'reservas', label: 'Reservas', icon: Calendar, badge: pendientes > 0 ? pendientes : undefined },
        { id: 'masajistas', label: 'Masajistas', icon: Users },
        { id: 'clientas', label: 'Clientas', icon: UserCircle },
        { id: 'servicios', label: 'Servicios', icon: ClipboardList },
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
        { id: 'nueva-reserva', label: 'Nueva Reserva', icon: Calendar },
        { id: 'mis-reservas', label: 'Mis Reservas', icon: ClipboardList },
        { id: 'mis-datos', label: 'Mis Datos', icon: User },
        { id: 'chat-asistente', label: 'Hablar con Lía', icon: MessageCircle, badge: '💬' }
      ];
    }

    return [];
  };

  const menuItems = getMenuItems();

  const handleItemClick = (viewId: string) => {
    // Si es el botón de chat, disparar evento para abrir chat
    if (viewId === 'chat-asistente') {
      const event = new CustomEvent('openChatAsistente');
      window.dispatchEvent(event);
      // En mobile, cerrar sidebar después de abrir chat
      if (window.innerWidth < 1024) {
        onClose();
      }
      return;
    }

    setCurrentView(viewId);
    // En mobile, cerrar sidebar después de seleccionar
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-16 left-0 z-50
          w-64 bg-white border-r border-gray-200
          min-h-[calc(100vh-4rem)] overflow-y-auto
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header del sidebar (solo mobile) */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Menú</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
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
      </aside>
    </>
  );
}
