import { useState, useEffect, useRef } from 'react';
import { Save, User, Lock } from 'lucide-react';
import { useApp } from '../../AppContext';
import { TipoServicio, Direccion } from '../../types';
import { CONSENTIMIENTO_SALUD_TEXTO, LEGAL_VERSION } from '../../legal';
import LegalModal from '../LegalModal';

export default function MisDatos() {
  const { currentUser, updateClienta, changePassword, servicios, masajistas, uploadAvatar } = useApp();
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  if (!currentUser || currentUser.role !== 'clienta') return null;

  const clienta = currentUser as any;

  const [nombre, setNombre] = useState(clienta.nombre || '');
  const [apellidos, setApellidos] = useState(clienta.apellidos || '');
  const [telefono, setTelefono] = useState(clienta.telefono || '');
  const [direccion, setDireccion] = useState<Direccion>(clienta.direccion_habitual || {
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
  // Consentimiento de datos de salud (Art. 9 RGPD). Si ya tenía notas guardadas,
  // se asume que consintió en su día (no le bloqueamos al editar).
  const [consentSalud, setConsentSalud] = useState(!!clienta.notas_especiales);
  const [legalModal, setLegalModal] = useState<'terminos' | 'privacidad' | null>(null);

  // Re-sincroniza el formulario cuando llegan los datos reales de la clienta.
  useEffect(() => {
    setNombre(clienta.nombre || '');
    setApellidos(clienta.apellidos || '');
    setTelefono(clienta.telefono || '');
    if (clienta.direccion_habitual) setDireccion(clienta.direccion_habitual);
    setServicioFav(clienta.servicio_favorito || '');
    setMasajistaFav(clienta.masajista_preferida || '');
    setNotasEspeciales(clienta.notas_especiales || '');
    setIntensidad(clienta.intensidad_preferida || 'media');
    setConsentSalud(!!clienta.notas_especiales);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleSave = async () => {
    // Si rellena datos de salud, exigir consentimiento explícito (Art. 9 RGPD).
    if (notasEspeciales.trim() && !consentSalud) {
      alert('Para guardar datos de salud debes marcar el consentimiento.');
      return;
    }
    setSaving(true);
    setSavedOk(false);
    try {
      const payload: any = {
        nombre,
        apellidos,
        telefono,
        direccion_habitual: direccion,
        servicio_favorito: servicioFav as TipoServicio,
        masajista_preferida: masajistaFav,
        notas_especiales: notasEspeciales,
        intensidad_preferida: intensidad as any,
      };
      // Registrar el consentimiento (con fecha y versión) si hay datos de salud.
      if (notasEspeciales.trim() && consentSalud) {
        payload.consentimiento_salud_en = new Date().toISOString();
        payload.consentimiento_salud_version = LEGAL_VERSION;
      }
      await updateClienta(clienta.id, payload);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    } catch (e: any) {
      alert(e?.message || 'No se pudieron guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const onAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('La imagen supera los 5MB.'); return; }
    setSubiendoFoto(true);
    try {
      await uploadAvatar(file);
    } catch (err: any) {
      alert(err?.message || 'No se pudo subir la foto');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const handleChangePassword = async () => {
    setPassMsg('');
    if (newPass.length < 6) { setPassMsg('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (newPass !== confirmPass) { setPassMsg('Las contraseñas no coinciden.'); return; }
    try {
      await changePassword(newPass);
      setShowPassModal(false);
      setNewPass('');
      setConfirmPass('');
      alert('Contraseña actualizada correctamente.');
    } catch (e: any) {
      setPassMsg(e?.message || 'No se pudo cambiar la contraseña.');
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

        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {clienta.foto ? (
              <img src={clienta.foto} alt={clienta.nombre} className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                <User size={28} className="text-gray-400" />
              </div>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarSelected} />
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={subiendoFoto}
              title="Cambiar foto"
              className="absolute bottom-0 right-0 w-7 h-7 bg-teal-500 rounded-full flex items-center justify-center text-white hover:bg-teal-600 transition shadow-md disabled:opacity-50 text-sm"
            >
              {subiendoFoto ? '…' : '📷'}
            </button>
          </div>
          <div>
            <p className="font-medium text-gray-900">Foto de perfil</p>
            <p className="text-sm text-gray-500">JPG o PNG, máximo 5MB</p>
          </div>
        </div>

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
              Notas de salud para el equipo <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={notasEspeciales}
              onChange={(e) => setNotasEspeciales(e.target.value)}
              rows={3}
              placeholder="Alergias, lesiones, preferencias de presión, indicaciones especiales..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
            />
            {notasEspeciales.trim() && (
              <label className="flex items-start gap-2 mt-3 text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <input
                  type="checkbox"
                  checked={consentSalud}
                  onChange={(e) => setConsentSalud(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-teal-600"
                />
                <span>
                  {CONSENTIMIENTO_SALUD_TEXTO}{' '}
                  <button type="button" onClick={() => setLegalModal('privacidad')} className="text-teal-600 font-medium hover:underline">
                    Más información
                  </button>
                </span>
              </label>
            )}
          </div>
        </div>
      </div>

      {legalModal && <LegalModal tipo={legalModal} onClose={() => setLegalModal(null)} />}

      {/* Seguridad */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock size={20} />
          Seguridad
        </h3>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium text-gray-900">Contraseña</div>
            <div className="text-sm text-gray-600 mt-1">Cambia tu contraseña de acceso</div>
          </div>
          <button
            onClick={() => { setShowPassModal(true); setPassMsg(''); }}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition text-sm font-medium"
          >
            Cambiar contraseña
          </button>
        </div>
      </div>

      {/* Botón guardar */}
      <div className="flex justify-end items-center gap-3">
        {savedOk && <span className="text-sm text-green-600 font-medium">✓ Guardado correctamente</span>}
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

      {/* Modal cambiar contraseña */}
      {showPassModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowPassModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Cambiar contraseña</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nueva contraseña (mín. 6 caracteres)
                  </label>
                  <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                    placeholder="••••••••"
                  />
                </div>

                {passMsg && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{passMsg}</div>}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowPassModal(false);
                    setNewPass('');
                    setConfirmPass('');
                    setPassMsg('');
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={newPass.length < 6 || confirmPass.length < 6}
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
