import { useEffect, useRef, useState } from 'react';
import { Bot, Send, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../AppContext';

// Chat con el agente IA desde la propia cuenta de la clienta. El backend (Edge Function
// `agente`) reconoce a la clienta por su sesión (JWT) — nunca hace falta decirle quién es
// ni su teléfono, y no puede acceder a conversaciones ni reservas de otra persona.
type Msg = { rol: 'cliente' | 'agente'; contenido: string };

export default function Asistente() {
  const { currentUser, loadReservasCliente } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([
    { rol: 'agente', contenido: 'Hola, soy el asistente de MassFlow. Puedo contarte sobre nuestros servicios, precios y zonas, o ayudarte a reservar tu próxima sesión aquí mismo. ¿En qué te ayudo?' },
  ]);
  const [input, setInput] = useState('');
  const [convId, setConvId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const enviar = async () => {
    if (!input.trim() || sending) return;
    const texto = input.trim();
    setInput('');
    setMsgs(prev => [...prev, { rol: 'cliente', contenido: texto }]);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('agente', {
        body: { conversation_id: convId, mensaje: texto },
      });
      if (error) throw error;
      setConvId(data.conversation_id);
      setMsgs(prev => [...prev, { rol: 'agente', contenido: data.reply || 'Perdona, no he podido responder. ¿Puedes repetirlo?' }]);
      // El chat crea/cambia reservas por su cuenta (fuera del estado de React) — refrescamos
      // "Mis Reservas" tras cada turno para que se vea al instante si se reservó algo.
      if (currentUser) loadReservasCliente(currentUser.id);
    } catch (e: any) {
      setMsgs(prev => [...prev, { rol: 'agente', contenido: 'Uy, algo ha fallado. Inténtalo de nuevo en un momento, o usa "Nueva Reserva" si prefieres.' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Bot size={26} className="text-teal-500" /> Asistente</h2>
        <p className="text-gray-600 mt-1">Pregunta lo que quieras o pide tu cita aquí mismo, sin salir del chat.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-[70vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.rol === 'cliente' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.rol === 'cliente' ? 'bg-teal-500 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                <div className="flex items-center gap-1 text-[10px] opacity-70 mb-0.5">
                  {m.rol === 'cliente' ? <User size={10} /> : <Bot size={10} />} {m.rol === 'cliente' ? 'Tú' : 'Asistente'}
                </div>
                {m.contenido}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="max-w-[80%] px-3 py-2 rounded-2xl text-sm bg-gray-100 text-gray-400 rounded-bl-sm">Escribiendo…</div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="p-3 border-t border-gray-200 flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && enviar()}
            placeholder="Escribe tu mensaje…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button onClick={enviar} disabled={sending} className="px-4 py-2 bg-teal-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
