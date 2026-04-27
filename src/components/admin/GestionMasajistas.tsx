import { useState } from 'react';
import { Plus, Edit, Eye, UserX, UserCheck, Trash2, X, Check, AlertTriangle } from 'lucide-react';
import { useApp } from '../../AppContext';
import { Masajista, TipoServicio, Documento } from '../../types';

export default function GestionMasajistas() {
  const { masajistas, updateMasajista, verificarDocumento, currentUser, reservas, transferencias } = useApp();
  const [showModal, setShowModal] = useState<'create' | 'edit' | null>(null);
  const [showDrawer, setShowDrawer] = useState<Masajista | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'activas' | 'pendientes' | 'suspendidas'>('todos');
  
  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    telefono: '',
    foto: '',
    bio: '',
    especialidades: [] as TipoServicio[],
    zonas_cobertura: [] as string[],
    tarifa_hora: 45,
    iban: '',
    pin: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const zonasDisponibles = ['Centro', 'Chamartín', 'Salamanca', 'Retiro', 'Chamberí', 'Moncloa', 'Argüelles'];
  const especialidadesDisponibles: TipoServicio[] = ['Relajante', 'Descontracturante', 'Deportivo', 'Prenatal', 'Ayurveda', 'Parejas'];

  const masajistasFiltradas = masajistas.filter(m => {
    if (filtro === 'activas') return m.activo && m.documentacion_ok;
    if (filtro === 'pendientes') return !m.documentacion_ok;
    if (filtro === 'suspendidas') return !m.activo;
    return true;
  });

  const resetForm = () => {
    setFormData({
      nombre: '',
      apellidos: '',
      email: '',
      telefono: '',
      foto: '',
      bio: '',
      especialidades: [],
      zonas_cobertura: [],
      tarifa_hora: 45,
      iban: '',
      pin: ''
    });
    setEditingId(null);
  };

  const handleOpenEdit = (masajista: Masajista) => {
    setFormData({
      nombre: masajista.nombre,
      apellidos: masajista.apellidos || '',
      email: masajista.email,
      telefono: masajista.telefono || '',
      foto: masajista.foto || '',
      bio: masajista.bio || '',
      especialidades: masajista.especialidades,
      zonas_cobertura: masajista.zonas_cobertura,
      tarifa_hora: masajista.tarifa_hora || 45,
      iban: masajista.iban || '',
      pin: ''
    });
    setEditingId(masajista.id);
    setShowModal('edit');
  };

  const handleSubmit = () => {
    if (showModal === 'edit' && editingId) {
      const updateData: any = { ...formData };
      if (!formData.pin) delete updateData.pin; // No actualizar PIN si está vacío
      updateMasajista(editingId, updateData);
      setShowModal(null);
      resetForm();
    }
    // Create nueva masajista requeriría backend
  };

  const handleToggleActivo = (id: string, activo: boolean) => {
    updateMasajista(id, { activo: !activo });
  };

  const handleVerificarDoc = (masajistaId: string, docId: string) => {
    if (currentUser) {
      verificarDocumento(masajistaId, docId, currentUser.id);
    }
  };

  const getEstadoBadge = (masajista: Masajista) => {
    if (!masajista.activo) return { label: 'Suspendida', class: 'bg-red-100 text-red-700' };
    if (!masajista.documentacion_ok) return { label: 'Pendiente Docs', class: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Activa', class: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Masajistas</h2>
          <p className="text-gray-600 mt-1">{masajistas.length} masajistas en el sistema</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
          >
            <option value="todos">Todas ({masajistas.length})</option>
            <option value="activas">Activas ({masajistas.filter(m => m.activo && m.documentacion_ok).length})</option>
            <option value="pendientes">Pendientes Docs ({masajistas.filter(m => !m.documentacion_ok).length})</option>
            <option value="suspendidas">Suspendidas ({masajistas.filter(m => !m.activo).length})</option>
          </select>

          <button
            onClick={() => {
              resetForm();
              setShowModal('create');
            }}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:from-teal-600 hover:to-emerald-700 transition font-medium flex items-center gap-2"
          >
            <Plus size={20} />
            Nueva Masajista
          </button>
        </div>
      </div>

      {/* Grid de masajistas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {masajistasFiltradas.map(masajista => {
          const estado = getEstadoBadge(masajista);
          const docsCompletos = masajista.documentos.every(d => d.estado === 'verificado');
          const docsPendientes = masajista.documentos.filter(d => d.estado === 'pendiente_revision').length;

          return (
            <div key={masajista.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={masajista.foto || 'https://via.placeholder.com/80'}
                    alt={masajista.nombre}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {masajista.nombre} {masajista.apellidos}
                    </h3>
                    <p className="text-sm text-gray-600 truncate">{masajista.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${estado.class}`}>
                        {estado.label}
                      </span>
                      {docsPendientes > 0 && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          {docsPendientes} docs
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">★</span>
                    <span className="font-medium text-gray-900">{masajista.rating_promedio}</span>
                    <span className="text-gray-500">({masajista.total_sesiones} sesiones)</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {masajista.especialidades.slice(0, 3).map(esp => (
                      <span key={esp} className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs rounded">
                        {esp}
                      </span>
                    ))}
                    {masajista.especialidades.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        +{masajista.especialidades.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDrawer(masajista)}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium flex items-center justify-center gap-1"
                  >
                    <Eye size={16} />
                    Ver
                  </button>
                  <button
                    onClick={() => handleOpenEdit(masajista)}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium flex items-center justify-center gap-1"
                  >
                    <Edit size={16} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleActivo(masajista.id, masajista.activo)}
                    className={`px-3 py-2 rounded-lg transition text-sm font-medium ${
                      masajista.activo
                        ? 'bg-red-50 text-red-700 hover:bg-red-100'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                    title={masajista.activo ? 'Suspender' : 'Activar'}
                  >
                    {masajista.activo ? <UserX size={16} /> : <UserCheck size={16} />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal CRUD */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  {showModal === 'create' ? 'Nueva Masajista' : 'Editar Masajista'}
                </h3>
                <button onClick={() => setShowModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Apellidos *</label>
                    <input
                      type="text"
                      value={formData.apellidos}
                      onChange={(e) => setFormData(prev => ({ ...prev, apellidos: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                      disabled={showModal === 'edit'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                      placeholder="+34 600 000 000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL Foto</label>
                  <input
                    type="url"
                    value={formData.foto}
                    onChange={(e) => setFormData(prev => ({ ...prev, foto: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                    placeholder="Experiencia y especialización..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Especialidades</label>
                  <div className="flex flex-wrap gap-2">
                    {especialidadesDisponibles.map(esp => (
                      <button
                        key={esp}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          especialidades: prev.especialidades.includes(esp)
                            ? prev.especialidades.filter(e => e !== esp)
                            : [...prev.especialidades, esp]
                        }))}
                        className={`px-3 py-1.5 rounded-lg border-2 transition text-sm ${
                          formData.especialidades.includes(esp)
                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-gray-200 bg-white text-gray-700'
                        }`}
                      >
                        {esp}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Zonas de Cobertura</label>
                  <div className="flex flex-wrap gap-2">
                    {zonasDisponibles.map(zona => (
                      <button
                        key={zona}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          zonas_cobertura: prev.zonas_cobertura.includes(zona)
                            ? prev.zonas_cobertura.filter(z => z !== zona)
                            : [...prev.zonas_cobertura, zona]
                        }))}
                        className={`px-3 py-1.5 rounded-lg border-2 transition text-sm ${
                          formData.zonas_cobertura.includes(zona)
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 bg-white text-gray-700'
                        }`}
                      >
                        {zona}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tarifa/hora (€)</label>
                    <input
                      type="number"
                      value={formData.tarifa_hora}
                      onChange={(e) => setFormData(prev => ({ ...prev, tarifa_hora: Number(e.target.value) }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PIN {showModal === 'edit' && '(dejar vacío para no cambiar)'}
                    </label>
                    <input
                      type="password"
                      value={formData.pin}
                      onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value.slice(0, 4) }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                      maxLength={4}
                      placeholder={showModal === 'edit' ? '••••' : '4 dígitos'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IBAN</label>
                  <input
                    type="text"
                    value={formData.iban}
                    onChange={(e) => setFormData(prev => ({ ...prev, iban: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="ES79 2100 0813 4101 2345 6789"
                  />
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
                  disabled={!formData.nombre || !formData.email}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:from-teal-600 hover:to-emerald-700 transition font-medium disabled:opacity-50"
                >
                  {showModal === 'create' ? 'Crear' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Drawer de perfil detallado */}
      {showDrawer && (() => {
        const masajista = showDrawer;
        const reservasMasajista = reservas.filter(r => r.masajista_id === masajista.id);
        const transferenciasMasajista = transferencias.filter(t => t.masajista_id === masajista.id);

        return (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDrawer(null)} />
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white z-50 shadow-2xl overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
                <h3 className="text-lg font-bold text-gray-900">Perfil de Masajista</h3>
                <button onClick={() => setShowDrawer(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Header con foto y datos básicos */}
                <div className="flex items-start gap-4">
                  <img
                    src={masajista.foto || 'https://via.placeholder.com/100'}
                    alt={masajista.nombre}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">{masajista.nombre} {masajista.apellidos}</h2>
                    <p className="text-gray-600">{masajista.email}</p>
                    <p className="text-gray-600">{masajista.telefono}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {getEstadoBadge(masajista) && (
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadge(masajista).class}`}>
                          {getEstadoBadge(masajista).label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {masajista.bio && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Sobre mí</h4>
                    <p className="text-gray-700">{masajista.bio}</p>
                  </div>
                )}

                {/* Especialidades */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Especialidades</h4>
                  <div className="flex flex-wrap gap-2">
                    {masajista.especialidades.map(esp => (
                      <span key={esp} className="px-3 py-1 bg-teal-50 text-teal-700 rounded-lg text-sm">
                        {esp}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Zonas */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Zonas de Cobertura</h4>
                  <div className="flex flex-wrap gap-2">
                    {masajista.zonas_cobertura.map(zona => (
                      <span key={zona} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
                        {zona}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{masajista.rating_promedio}</div>
                    <div className="text-sm text-gray-600">Rating</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{masajista.total_sesiones}</div>
                    <div className="text-sm text-gray-600">Sesiones</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{masajista.valoraciones.length}</div>
                    <div className="text-sm text-gray-600">Valoraciones</div>
                  </div>
                </div>

                {/* Documentación */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Documentación</h4>
                  <div className="space-y-2">
                    {masajista.documentos.map(doc => {
                      const getDocIcon = (tipo: string) => {
                        if (tipo === 'autonoma') return '📄';
                        if (tipo === 'seguro') return '🛡️';
                        if (tipo === 'dni') return '🪪';
                        return '📎';
                      };

                      return (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{getDocIcon(doc.tipo)}</span>
                            <div>
                              <div className="font-medium text-gray-900">{doc.nombre}</div>
                              <div className="text-sm text-gray-600">
                                {doc.estado === 'verificado' && '✅ Verificado'}
                                {doc.estado === 'pendiente_revision' && '⏳ Pendiente revisión'}
                                {doc.estado === 'vencido' && '❌ Vencido'}
                                {doc.estado === 'no_subido' && '📤 No subido'}
                              </div>
                            </div>
                          </div>
                          {doc.estado === 'pendiente_revision' && (
                            <button
                              onClick={() => handleVerificarDoc(masajista.id, doc.id)}
                              className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-medium flex items-center gap-1"
                            >
                              <Check size={16} />
                              Verificar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Historial de reservas */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Historial de Reservas ({reservasMasajista.length})</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {reservasMasajista.slice(0, 10).map(reserva => (
                      <div key={reserva.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-gray-600">{reserva.codigo}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            reserva.estado === 'completada' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {reserva.estado}
                          </span>
                        </div>
                        <div className="text-gray-700 mt-1">
                          {new Date(reserva.fecha).toLocaleDateString('es-ES')} • {reserva.hora_inicio}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transferencias */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Transferencias ({transferenciasMasajista.length})</h4>
                  <div className="space-y-2">
                    {transferenciasMasajista.slice(0, 5).map(trans => (
                      <div key={trans.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{trans.importe_neto}€</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            trans.estado === 'confirmada' ? 'bg-green-100 text-green-700' :
                            trans.estado === 'enviada' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {trans.estado}
                          </span>
                        </div>
                        <div className="text-gray-600 mt-1">
                          {new Date(trans.periodo_inicio).toLocaleDateString('es-ES')} - {new Date(trans.periodo_fin).toLocaleDateString('es-ES')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
