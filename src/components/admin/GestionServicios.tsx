import { useState } from 'react';
import { Plus, Edit, Trash2, X, AlertCircle } from 'lucide-react';
import { useApp } from '../../AppContext';
import { TipoServicio } from '../../types';
import EmptyState from '../EmptyState';

export default function GestionServicios() {
  const { servicios, reservas } = useApp();
  const [showModal, setShowModal] = useState<'create' | 'edit' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: '' as TipoServicio | '',
    duracion_minutos: 60,
    precio: 55,
    descripcion: '',
    emoji: '💆‍♀️',
    activo: true
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [precioError, setPrecioError] = useState('');

  const { configuracion } = useApp();
  const PRECIO_MAXIMO = configuracion.precio_maximo_sesion;

  const tiposDisponibles: TipoServicio[] = ['Relajante', 'Descontracturante', 'Deportivo', 'Prenatal', 'Ayurveda', 'Parejas'];
  const emojisDisponibles = ['💆‍♀️', '🌸', '💪', '⚡', '🤰', '🧘', '💑', '🌿', '✨', '🎋'];

  const resetForm = () => {
    setFormData({
      nombre: '',
      tipo: '',
      duracion_minutos: 60,
      precio: 55,
      descripcion: '',
      emoji: '💆‍♀️',
      activo: true
    });
    setEditingId(null);
    setPrecioError('');
  };

  const handleOpenEdit = (servicio: any) => {
    setFormData({
      nombre: servicio.nombre,
      tipo: servicio.tipo,
      duracion_minutos: servicio.duracion_minutos,
      precio: servicio.precio,
      descripcion: servicio.descripcion,
      emoji: servicio.emoji,
      activo: servicio.activo
    });
    setEditingId(servicio.id);
    setShowModal('edit');
  };

  const handlePrecioChange = (value: number) => {
    if (value > PRECIO_MAXIMO) {
      setPrecioError(`El precio no puede superar los ${PRECIO_MAXIMO}€`);
    } else {
      setPrecioError('');
    }
    setFormData(prev => ({ ...prev, precio: value }));
  };

  const handleSubmit = () => {
    if (formData.precio > PRECIO_MAXIMO) {
      setPrecioError(`El precio no puede superar los ${PRECIO_MAXIMO}€`);
      return;
    }

    if (!formData.nombre || !formData.tipo) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    if (showModal === 'create') {
      // En producción crearía un nuevo servicio
      console.log('Crear servicio:', formData);
      alert('Función de creación preparada - Requiere backend');
    } else if (showModal === 'edit' && editingId) {
      // En producción actualizaría el servicio
      console.log('Actualizar servicio:', editingId, formData);
      alert('Función de edición preparada - Requiere backend');
    }

    setShowModal(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    const reservasServicio = reservas.filter(r => r.servicio_id === id);
    if (reservasServicio.length > 0) {
      alert(`No se puede eliminar. Hay ${reservasServicio.length} reservas asociadas a este servicio.`);
      setShowDeleteConfirm(null);
      return;
    }

    // En producción eliminaría el servicio
    console.log('Eliminar servicio:', id);
    alert('Función de eliminación preparada - Requiere backend');
    setShowDeleteConfirm(null);
  };

  const handleToggleActivo = (id: string) => {
    // En producción togglearía el estado activo
    console.log('Toggle activo servicio:', id);
    alert('Función preparada - Requiere backend');
  };

  const stats = {
    total: servicios.length,
    activos: servicios.filter(s => s.activo).length,
    inactivos: servicios.filter(s => !s.activo).length,
    reservasTotal: reservas.length
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Servicios</h2>
          <p className="text-gray-600 mt-1">{servicios.length} servicios en el catálogo</p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowModal('create');
          }}
          className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:from-teal-600 hover:to-emerald-700 transition font-medium flex items-center gap-2"
        >
          <Plus size={20} />
          Nuevo Servicio
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Servicios</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{stats.activos}</div>
          <div className="text-sm text-gray-600">Activos</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-600">{stats.inactivos}</div>
          <div className="text-sm text-gray-600">Inactivos</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.reservasTotal}</div>
          <div className="text-sm text-gray-600">Reservas Total</div>
        </div>
      </div>

      {/* Alerta de precio máximo */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <div className="flex items-center gap-2">
          <AlertCircle size={20} className="text-blue-600" />
          <p className="text-sm text-blue-900">
            <strong>Precio máximo configurado:</strong> {PRECIO_MAXIMO}€ por sesión
          </p>
        </div>
      </div>

      {/* Grid de servicios */}
      {servicios.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="No hay servicios en el catálogo"
          description="Crea tu primer servicio para empezar a recibir reservas"
          action={{
            label: 'Crear Servicio',
            onClick: () => {
              resetForm();
              setShowModal('create');
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servicios.map(servicio => {
            const reservasServicio = reservas.filter(r => r.servicio_id === servicio.id);
            
            return (
              <div 
                key={servicio.id} 
                className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden hover:shadow-md transition ${
                  !servicio.activo ? 'border-gray-200 opacity-60' : 'border-gray-200'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-4xl">{servicio.emoji}</span>
                    <div className="flex items-center gap-2">
                      {servicio.activo ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Activo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          Inactivo
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{servicio.nombre}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{servicio.descripcion}</p>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 mb-1">Duración</div>
                      <div className="font-semibold text-gray-900">{servicio.duracion_minutos} min</div>
                    </div>
                    <div className="bg-teal-50 rounded-lg p-3">
                      <div className="text-xs text-teal-700 mb-1">Precio</div>
                      <div className="font-semibold text-teal-600 text-lg">{servicio.precio}€</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-xs text-gray-600 mb-1">Tipo</div>
                    <span className="inline-block px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium">
                      {servicio.tipo}
                    </span>
                  </div>

                  <div className="mb-4 text-sm text-gray-600">
                    <strong>{reservasServicio.length}</strong> reservas asociadas
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEdit(servicio)}
                      className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium flex items-center justify-center gap-1"
                    >
                      <Edit size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggleActivo(servicio.id)}
                      className={`flex-1 px-3 py-2 rounded-lg transition text-sm font-medium ${
                        servicio.activo
                          ? 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {servicio.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(servicio.id)}
                      className="px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal CRUD */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  {showModal === 'create' ? 'Nuevo Servicio' : 'Editar Servicio'}
                </h3>
                <button onClick={() => setShowModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Servicio *</label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                      placeholder="Masaje Relajante"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as TipoServicio }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                      <option value="">Selecciona...</option>
                      {tiposDisponibles.map(tipo => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Emoji</label>
                    <div className="flex gap-2 flex-wrap">
                      {emojisDisponibles.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => setFormData(prev => ({ ...prev, emoji }))}
                          className={`text-2xl p-2 rounded-lg border-2 transition ${
                            formData.emoji === emoji
                              ? 'border-teal-500 bg-teal-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                    placeholder="Describe el servicio..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duración (minutos)</label>
                    <input
                      type="number"
                      value={formData.duracion_minutos}
                      onChange={(e) => setFormData(prev => ({ ...prev, duracion_minutos: Number(e.target.value) }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                      min="15"
                      step="15"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio (€) * <span className="text-xs text-gray-500">(máx. {PRECIO_MAXIMO}€)</span>
                    </label>
                    <input
                      type="number"
                      value={formData.precio}
                      onChange={(e) => handlePrecioChange(Number(e.target.value))}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none ${
                        precioError 
                          ? 'border-red-300 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-teal-500'
                      }`}
                      min="0"
                      max={PRECIO_MAXIMO}
                      step="1"
                    />
                    {precioError && (
                      <p className="text-xs text-red-600 mt-1">{precioError}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={formData.activo}
                    onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                    className="w-5 h-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500"
                  />
                  <label htmlFor="activo" className="text-sm font-medium text-gray-900 cursor-pointer">
                    Servicio activo (visible para reservas)
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => setShowModal(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!formData.nombre || !formData.tipo || !!precioError}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:from-teal-600 hover:to-emerald-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {showModal === 'create' ? 'Crear Servicio' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal confirmación eliminar */}
      {showDeleteConfirm && (() => {
        const servicio = servicios.find(s => s.id === showDeleteConfirm);
        
        return (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeleteConfirm(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertCircle size={24} className="text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">¿Eliminar servicio?</h3>
                  </div>

                  <p className="text-gray-700 mb-4">
                    ¿Estás seguro de que quieres eliminar <strong>{servicio?.nombre}</strong>?
                  </p>

                  <div className="bg-orange-50 border-l-4 border-orange-400 p-3 mb-4">
                    <p className="text-sm text-orange-800">
                      Solo se pueden eliminar servicios sin reservas asociadas.
                    </p>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDelete(showDeleteConfirm)}
                    className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium"
                  >
                    Eliminar
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
