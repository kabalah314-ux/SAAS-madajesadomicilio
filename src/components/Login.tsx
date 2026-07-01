import { useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { LEGAL_VERSION } from '../legal';
import LegalModal from './LegalModal';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const role = 'cliente' as const; // registro público = solo clientes; masajistas por invitación
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [legalModal, setLegalModal] = useState<'terminos' | 'privacidad' | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setSuccessMsg('');
    if (!email) { setError('Escribe tu email arriba y vuelve a pulsar para recibir el enlace.'); return; }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/?setpw=1`,
      });
      if (error) throw error;
      setSuccessMsg('Si el email existe, te hemos enviado un enlace para restablecer la contraseña.');
    } catch (err: any) {
      setError(err.message || 'No se pudo enviar el email de recuperación');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!aceptaTerminos) {
      setError('Debes aceptar los Términos y la Política de Privacidad para crear la cuenta.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, {
        full_name: fullName,
        role,
        phone: phone || undefined,
        acepto_terminos: true,
        terminos_version: LEGAL_VERSION,
      });
      setSuccessMsg('Cuenta creada. Revisa tu email para confirmar o inicia sesion directamente.');
      setMode('login');
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
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
          <p className="text-gray-600">Sistema de Gestion de Masajes</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                  placeholder="tu@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contrasena</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}
              {successMsg && (
                <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">{successMsg}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-3 rounded-lg font-medium hover:from-teal-600 hover:to-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <LogIn size={20} />
                {loading ? 'Entrando...' : 'Iniciar Sesion'}
              </button>

              <p className="text-center text-sm">
                <button type="button" onClick={handleResetPassword} className="text-gray-500 hover:text-teal-600 hover:underline">
                  ¿Olvidaste tu contraseña?
                </button>
              </p>

              <p className="text-center text-sm text-gray-600">
                No tienes cuenta?{' '}
                <button type="button" onClick={() => { setMode('register'); setError(''); }} className="text-teal-600 font-medium hover:underline">
                  Registrate
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                  placeholder="Tu nombre"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                  placeholder="tu@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono (opcional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                  placeholder="+34 612 345 678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                  placeholder="Minimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>

              {/* El registro público es SOLO para clientes. Los masajistas entran por
                  invitación del administrador (enlace por email). */}
              <div className="bg-teal-50 border border-teal-100 text-teal-700 text-xs rounded-lg px-3 py-2">
                🧖‍♀️ Estás creando una cuenta de <strong>Cliente</strong>. ¿Eres masajista?
                El equipo te da de alta por invitación.
              </div>

              <label className="flex items-start gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={aceptaTerminos}
                  onChange={(e) => setAceptaTerminos(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-teal-600"
                />
                <span>
                  He leído y acepto los{' '}
                  <button type="button" onClick={() => setLegalModal('terminos')} className="text-teal-600 font-medium hover:underline">
                    Términos
                  </button>{' '}
                  y la{' '}
                  <button type="button" onClick={() => setLegalModal('privacidad')} className="text-teal-600 font-medium hover:underline">
                    Política de Privacidad
                  </button>.
                </span>
              </label>

              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading || !aceptaTerminos}
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-3 rounded-lg font-medium hover:from-teal-600 hover:to-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserPlus size={20} />
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>

              <p className="text-center text-sm text-gray-600">
                Ya tienes cuenta?{' '}
                <button type="button" onClick={() => { setMode('login'); setError(''); }} className="text-teal-600 font-medium hover:underline">
                  Inicia sesion
                </button>
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          MassFlow - Masajes a domicilio
        </p>
        <p className="text-center text-xs text-gray-400 mt-2 space-x-2">
          <button type="button" onClick={() => setLegalModal('terminos')} className="hover:text-teal-600 hover:underline">Términos</button>
          <span>·</span>
          <button type="button" onClick={() => setLegalModal('privacidad')} className="hover:text-teal-600 hover:underline">Privacidad</button>
        </p>
      </div>

      {legalModal && <LegalModal tipo={legalModal} onClose={() => setLegalModal(null)} />}
    </div>
  );
}
