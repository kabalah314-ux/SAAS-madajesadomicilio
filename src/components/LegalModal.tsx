import { X } from 'lucide-react';
import { TERMINOS_TEXT, PRIVACIDAD_TEXT } from '../legal';

interface LegalModalProps {
  tipo: 'terminos' | 'privacidad';
  onClose: () => void;
}

export default function LegalModal({ tipo, onClose }: LegalModalProps) {
  const titulo = tipo === 'terminos' ? 'Términos y Condiciones' : 'Política de Privacidad';
  const texto = tipo === 'terminos' ? TERMINOS_TEXT : PRIVACIDAD_TEXT;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">{titulo}</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>
          <div className="p-5 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">{texto}</pre>
          </div>
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg hover:from-teal-600 hover:to-emerald-700 transition font-medium"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
