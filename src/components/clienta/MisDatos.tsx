import { useState } from 'react';
import { Save, User, Lock } from 'lucide-react';
import { useApp } from '../../AppContext';
import { TipoServicio } from '../../types';

export default function MisDatos() {
  const { currentUser, updateClienta, servicios, masajistas } = useApp();
  const [saving, setSaving] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  if (!currentUser || currentUser.role !== 'clienta') return null;

  const clienta = currentUser as any;
  
  const [nombre, setNombre] = useState(clienta.nombre || '');
  const [apellidos, setApellidos] = useState(clienta.apellidos || '');
  const [telefono, setTelefono] = useState(clienta.telefono || '');
  const [direccion, setDireccion] = useState(clienta.direccion_habitual || {
    calle: '',
    numero: '',
    piso: '',
    ciudad: 'Madrid',
    codigo_postal: '',
    barrio: '',
    instrucciones_acceso: ''
  });
  const [servicioFav, setServicioFav] = useState(clienta.servicio_favorito || '');
  const [masajistaFav, setMasajistaFav] = useState(clienta.masajista_preferida || '');
  const [notasEspeciales, setNotasEspeciales] = useState(clienta.notas_especiales || '');
  const [intensidad, setIntensidad] = useState(clienta.intensidad_preferida || 'media');

  const handleSave = () => {
    setSaving(true);
    updateClienta(clienta.id, {
      nombre,
      apellidos,
      telefono,
      direccion_habitual: direccion,
      servicio_favorito: servicioFav as TipoServicio,
      masajista_preferida: masajistaFav,
      notas_especiales: notasEspeciales,
      intensidad_preferida: intensidad as any
    });
    setTimeout(() => setSaving(false), 1000);
  };

  const handleChangePIN = () => {
    if (newPin.length === 4 && newPin === confirmPin) {
      // En producción, aquí se actualizaría el PIN
      alert('PIN actualizado correctamente');
      setShowPinModal(false);
      setNewPin('');
      setConfirmPin('');
    } else {
      alert('Los PINs no coinciden o no tienen 4 dígitos');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mis Datos</h2>
        <p className="text-gray-600 mt-1">Gestiona tu información personal y preferencias</p>
      </div>

      {/* Datos personales */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User size={20} />
          Datos Personales
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Apellidos
            </label>
            <input
              type="text"
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+34 600 000 000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={clienta.email}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">El email no se puede cambiar</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dirección habitual
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Calle"
              value={direccion.calle}
              onChange={(e) => setDireccion(prev => ({ ...prev, calle: e.target.value }))}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Nº"
                value={direccion.numero}
                onChange={(e) => setDireccion(prev => ({ ...prev, numero: e.target.value }))}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
              <input
                type="text"
                placeholder="Piso (opcional)"
                value={direccion.piso}
                onChange={(e) => setDireccion(prev => ({ ...prev, piso: e.target.value }))}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
            </div>
            <input
              type="text"
              placeholder="Ciudad"
              value={direccion.ciudad}
              onChange={(e) => setDireccion(prev => ({ ...prev, ciudad: e.target.value }))}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="CP"
                value={direccion.codigo_postal}
                onChange={(e) => setDireccion(prev => ({ ...prev, codigo_postal: e.target.value }))}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
              <input
                type="text"
                placeholder="Barrio"
                value={direccion.barrio}
                onChange={(e) => setDireccion(prev => ({ ...prev, barrio: e.target.value }))}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <input
                type="text"
                placeholder="Instrucciones de acceso (opcional)"
                value={direccion.instrucciones_acceso}
                onChange={(e) => setDireccion(prev => ({ ...prev, instrucciones_acceso: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preferencias */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mis Preferencias</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Servicio favorito
            </label>
            <select
              value={servicioFav}
              onChange={(e) => setServicioFav(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            >
              <option value="">Sin preferencia</option>
              {servicios.map(s => (
                <option key={s.id} value={s.tipo}>{s.emoji} {s.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Masajista preferida
            </label>
            <select
              value={masajistaFav}
              onChange={(e) => setMasajistaFav(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            >
              <option value="">Sin preferencia</option>
              {masajistas.filter(m => m.activo).map(m => (
                <option key={m.id} value={m.id}>{m.nombre} {m.apellidos}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Intensidad de masaje preferida
            </label>
            <div className="flex gap-3">
              {['suave', 'media', 'fuerte'].map(int => (
                <button
                  key={int}
                  onClick={() => setIntensidad(int)}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition capitalize ${
                    intensidad === int
                      ? 'border-teal-500 bg-teal-50 text-teal-700 font-medium'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {int}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas especiales para el equipo
            </label>
            <textarea
              value={notasEspeciales}
              onChange={(e) => setNotasEspeciales(e.target.value)}
              rows={3}
              placeholder="Alergias, lesiones, preferencias de presión, indicaciones especiales..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
            />
          </div>
        </div>
      </div>

      {/* Seguridad */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock size={20} />
          Seguridad
        </h3>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium text-gray-900">PIN de acceso</div>
            <div className="text-sm text-gray-600 mt-1">Tu PIN actual: ••••</div>
          </div>
          <button
            onClick={() => setShowPinModal(true)}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition text-sm font-medium"
          >
            Cambiar PIN
          </button>
        </div>
      </div>

      {/* Botón guardar */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:from-teal-600 hover:to-emerald-700 transition font-medium flex items-center gap-2 shadow-md disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save size={20} />
              Guardar Cambios
            </>
          )}
        </button>
      </div>

      {/* Modal cambiar PIN */}
      {showPinModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowPinModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Cambiar PIN</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nuevo PIN (4 dígitos)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-center text-2xl tracking-widest"
                    placeholder="••••"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-center text-2xl tracking-widest"
                    placeholder="••••"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowPinModal(false);
                    setNewPin('');
                    setConfirmPin('');
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleChangePIN}
                  disabled={newPin.length !== 4 || confirmPin.length !== 4}
                  className="flex-1 px-4 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cambiar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
