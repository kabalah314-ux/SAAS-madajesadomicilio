import { useEffect, useRef, useState } from 'react';
import { Bot, Send, User, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../AppContext';

// Chat con el agente IA desde la propia cuenta de la clienta. El backend (Edge Function
// `agente`) reconoce a la clienta por su sesión (JWT) — nunca hace falta decirle quién es
// ni su teléfono, y no puede acceder a conversaciones ni reservas de otra persona.
//
// El contexto NO se pierde al cerrar la ventana: al montar, se recupera la última
// conversación de la clienta desde el servidor (donde el agente ya guarda todo el
// historial) en vez de arrancar siempre de cero.
type Msg = { rol: 'cliente' | 'agente'; contenido: string };

const BIENVENIDA: Msg = { rol: 'agente', contenido: 'Hola, soy el asistente de MassFlow. Puedo contarte sobre nuestros servicios, precios y zonas, o ayudarte a reservar tu próxima sesión aquí mismo. ¿En qué te ayudo?' };

export default function Asistente() {
  const { currentUser, loadReservasCliente } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([BIENVENIDA]);
  const [input, setInput] = useState('');
  const [convId, setConvId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [cargando, setCargando] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, cargando]);

  // Al abrir el chat, recuperar la última conversación (si la hay) en vez de perder el hilo.
  useEffect(() => {
    (async () => {
      if (!currentUser) { setCargando(false); return; }
      try {
        const { data: conv } = await supabase
          .from('agente_conversaciones')
          .select('id')
          .eq('cliente_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (conv?.id) {
          const { data: mensajes } = await supabase
            .from('agente_mensajes')
            .select('rol, contenido')
            .eq('conversacion_id', conv.id)
            .neq('rol', 'sistema')
            .order('created_at', { ascending: true });
          if (mensajes && mensajes.length) {
            setConvId(conv.id);
            setMsgs(mensajes.map(m => ({ rol: m.rol as 'cliente' | 'agente', contenido: m.contenido })));
          }
        }
      } catch {
        // sin conversación previa o sin conexión: se queda con el saludo inicial, sin romper nada
      } finally {
        setCargando(false);
      }
    })();
  }, [currentUser]);

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

  const nuevaConversacion = () => {
    setConvId(null);
    setMsgs([BIENVENIDA]);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Bot size={26} className="text-teal-500" /> Asistente</h2>
          <p className="text-gray-600 mt-1">Pregunta lo que quieras o pide tu cita aquí mismo, sin salir del chat.</p>
        </div>
        {convId && (
          <button onClick={nuevaConversacion} title="Empezar una conversación nueva"
            className="shrink-0 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1.5">
            <RotateCcw size={13} /> Nueva conversación
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-[70vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cargando ? (
            <div className="text-center text-sm text-gray-400 py-8">Cargando tu conversación…</div>
          ) : (
            msgs.map((m, i) => (
              <div key={i} className={`flex ${m.rol === 'cliente' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.rol === 'cliente' ? 'bg-teal-500 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                  <div className="flex items-center gap-1 text-[10px] opacity-70 mb-0.5">
                    {m.rol === 'cliente' ? <User size={10} /> : <Bot size={10} />} {m.rol === 'cliente' ? 'Tú' : 'Asistente'}
                  </div>
                  {m.contenido}
                </div>
              </div>
            ))
          )}
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
            disabled={cargando}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50"
          />
          <button onClick={enviar} disabled={sending || cargando} className="px-4 py-2 bg-teal-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
