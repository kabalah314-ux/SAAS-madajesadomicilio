import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { useApp } from '../AppContext';

export default function Login() {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(email, pin);
    if (!success) {
      setError('Email o PIN incorrectos');
    }
  };

  const quickLogin = (userEmail: string, userPin: string) => {
    setEmail(userEmail);
    setPin(userPin);
    login(userEmail, userPin);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">💆‍♀️</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MassFlow</h1>
          <p className="text-gray-600">Sistema de Gestión de Masajes</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN (4 dígitos)
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
                placeholder="••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-3 rounded-lg font-medium hover:from-teal-600 hover:to-emerald-700 transition flex items-center justify-center gap-2"
            >
              <LogIn size={20} />
              Iniciar Sesión
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-3 text-center">Acceso rápido (demo):</p>
            <div className="space-y-2">
              <button
                onClick={() => quickLogin('admin@massflow.com', '1111')}
                className="w-full text-left px-4 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-sm transition"
              >
                <span className="font-medium text-purple-900">Admin</span>
                <span className="text-purple-600 ml-2">admin@massflow.com / 1111</span>
              </button>
              <button
                onClick={() => quickLogin('laura@massflow.com', '2222')}
                className="w-full text-left px-4 py-2 bg-teal-50 hover:bg-teal-100 rounded-lg text-sm transition"
              >
                <span className="font-medium text-teal-900">Masajista (Laura)</span>
                <span className="text-teal-600 ml-2">laura@massflow.com / 2222</span>
              </button>
              <button
                onClick={() => quickLogin('ana@email.com', '5555')}
                className="w-full text-left px-4 py-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-sm transition"
              >
                <span className="font-medium text-emerald-900">Clienta (Ana)</span>
                <span className="text-emerald-600 ml-2">ana@email.com / 5555</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          © 2024 MassFlow. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
