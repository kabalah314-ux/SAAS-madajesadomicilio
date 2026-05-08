import { LogOut, Bell, Moon, Sun, Menu } from 'lucide-react';
import { useApp } from '../AppContext';
import { useState } from 'react';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { currentUser, logout, notificaciones, marcarNotificacionLeida, marcarTodasNotificacionesLeidas, darkMode, toggleDarkMode } = useApp();
  const [showNotif, setShowNotif] = useState(false);

  if (!currentUser) return null;

  const userNotif = notificaciones.filter(n => n.usuario_id === currentUser.id);
  const unreadCount = userNotif.filter(n => !n.leida).length;

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: 'bg-purple-100 text-purple-800',
      masajista: 'bg-teal-100 text-teal-800',
      clienta: 'bg-emerald-100 text-emerald-800'
    };
    return badges[role as keyof typeof badges] || '';
  };

  const getRoleName = (role: string) => {
    const names = {
      admin: 'Administrador',
      masajista: 'Masajista',
      clienta: 'Cliente'
    };
    return names[role as keyof typeof names] || role;
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {/* Botón hamburguesa para mobile y toggle desktop */}
            <button
              onClick={onToggleSidebar}
              className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 hover:text-gray-900"
              title="Toggle menú"
            >
              <Menu size={24} />
            </button>

            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <span className="text-xl">💆‍♀️</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900">MassFlow</h1>
              <p className="text-xs text-gray-500">Sistema de Gestión</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title={darkMode ? 'Modo claro' : 'Modo oscuro'}
            >
              {darkMode ? <Sun size={20} className="text-gray-600" /> : <Moon size={20} className="text-gray-600" />}
            </button>

            {/* Notificaciones */}
            <div className="relative">
              <button
                onClick={() => setShowNotif(!showNotif)}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <Bell size={20} className="text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotif && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowNotif(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto">
                    <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Notificaciones</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => marcarTodasNotificacionesLeidas(currentUser.id)}
                          className="text-xs text-teal-600 hover:text-teal-700"
                        >
                          Marcar todas como leídas
                        </button>
                      )}
                    </div>
                    
                    {userNotif.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-500 text-sm">
                        No tienes notificaciones
                      </div>
                    ) : (
                      <div>
                        {userNotif.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map(notif => (
                          <button
                            key={notif.id}
                            onClick={() => {
                              marcarNotificacionLeida(notif.id);
                              setShowNotif(false);
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 ${
                              !notif.leida ? 'bg-teal-50' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {!notif.leida && (
                                <span className="w-2 h-2 bg-teal-500 rounded-full mt-1.5 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${!notif.leida ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                  {notif.titulo}
                                </p>
                                <p className="text-xs text-gray-600 mt-0.5">
                                  {notif.mensaje}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(notif.fecha).toLocaleString('es-ES', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Usuario */}
            <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-gray-200">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-900">{currentUser.nombre}</p>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getRoleBadge(currentUser.role)}`}>
                  {getRoleName(currentUser.role)}
                </span>
              </div>

              {currentUser.foto && (
                <img
                  src={currentUser.foto}
                  alt={currentUser.nombre}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                />
              )}

              <button
                onClick={logout}
                className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 hover:text-gray-900"
                title="Cerrar sesión"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
