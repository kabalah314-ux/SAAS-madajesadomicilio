import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Pantalla para FIJAR contraseña. Se muestra cuando el usuario llega con `?setpw=1`
// (enlace de invitación de masajista o de recuperación de contraseña). El cliente
// de Supabase ya ha establecido la sesión a partir del token del enlace; aquí solo
// se establece la nueva contraseña con updateUser.
export default function SetPassword() {
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (password !== password2) { setError('Las contraseñas no coinciden.'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      // limpiar la URL (quitar ?setpw=1 y el hash del token) y entrar a la app
      setTimeout(() => { window.location.replace(window.location.origin); }, 1200);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar la contraseña. El enlace puede haber caducado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">💆‍♀️</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MassFlow</h1>
          <p className="text-gray-600">Establece tu contraseña</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {done ? (
            <div className="text-center text-green-700">
              <p className="font-medium">✅ Contraseña guardada.</p>
              <p className="text-sm text-gray-500 mt-1">Entrando a tu cuenta…</p>
            </div>
          ) : (
            <form onSubmit={handle} className="space-y-5">
              <p className="text-sm text-gray-600">
                Crea una contraseña para tu cuenta. La usarás para iniciar sesión a partir de ahora.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nueva contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Mínimo 6 caracteres" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Repite la contraseña</label>
                <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} minLength={6} required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" placeholder="••••••••" />
              </div>
              {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-3 rounded-lg font-medium hover:from-teal-600 hover:to-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
                <KeyRound size={20} /> {loading ? 'Guardando…' : 'Guardar contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
