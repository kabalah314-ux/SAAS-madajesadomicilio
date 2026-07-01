import { useEffect, useRef, useState } from 'react';
import { Bot, Phone, MessageSquare, Send, RefreshCw, User, Wrench, BarChart3, ListChecks } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AgenteAnalisis from './AgenteAnalisis';

type Conv = {
  id: string; canal: string; telefono: string | null; estado: string;
  resultado: string | null; resumen: string | null; num_mensajes: number;
  reserva_id: string | null; cliente_id: string | null; contacto_id: string | null;
  created_at: string;
};
type Msg = { id: string; rol: string; contenido: string; metadata: any; created_at: string };

const resultadoBadge: Record<string, string> = {
  reserva: 'bg-green-100 text-green-700',
  consulta: 'bg-blue-100 text-blue-700',
  info: 'bg-gray-100 text-gray-700',
  recado: 'bg-amber-100 text-amber-700',
  transferida: 'bg-purple-100 text-purple-700',
  sin_resolver: 'bg-red-100 text-red-700',
};

export default function Agente() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [sel, setSel] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testConvId, setTestConvId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<'conversaciones' | 'analisis'>('conversaciones');
  const endRef = useRef<HTMLDivElement>(null);

  const loadConvs = async () => {
    setLoading(true);
    const { data } = await supabase.from('agente_conversaciones').select('*').order('created_at', { ascending: false }).limit(100);
    setConvs((data as Conv[]) || []);
    setLoading(false);
  };
  useEffect(() => { loadConvs(); }, []);

  const openConv = async (c: Conv) => {
    setSel(c); setTestOpen(false);
    const { data } = await supabase.from('agente_mensajes').select('*').eq('conversacion_id', c.id).order('created_at', { ascending: true });
    setMsgs((data as Msg[]) || []);
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const enviarPrueba = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const texto = input.trim(); setInput('');
    try {
      const { data, error } = await supabase.functions.invoke('agente', {
        body: { conversation_id: testConvId, canal: 'test', telefono: '+34600000000', mensaje: texto },
      });
      if (error) throw error;
      const cid = data.conversation_id;
      setTestConvId(cid);
      const { data: m } = await supabase.from('agente_mensajes').select('*').eq('conversacion_id', cid).order('created_at', { ascending: true });
      setMsgs((m as Msg[]) || []);
    } catch (e: any) {
      alert(e?.message || 'No se pudo hablar con el agente. ¿Está configurada la clave de OpenRouter?');
    } finally { setSending(false); }
  };

  const nuevaPrueba = () => { setTestOpen(true); setSel(null); setTestConvId(null); setMsgs([]); };

  const fmt = (s: string) => new Date(s).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Bot size={26} /> Agente</h2>
          <p className="text-gray-600 mt-1">{convs.length} conversaciones registradas</p>
        </div>
        {tab === 'conversaciones' && (
          <div className="flex gap-2">
            <button onClick={loadConvs} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center gap-2"><RefreshCw size={16} /> Refrescar</button>
            <button onClick={nuevaPrueba} className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"><MessageSquare size={16} /> Probar agente</button>
          </div>
        )}
      </div>

      {/* Pestañas */}
      <div className="flex gap-1 border-b border-gray-200">
        {([['conversaciones', 'Conversaciones', ListChecks], ['analisis', 'Análisis', BarChart3]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 -mb-px transition ${tab === key ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'analisis' && <AgenteAnalisis />}

      {tab === 'conversaciones' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lista */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
          {loading && <div className="p-4 text-sm text-gray-500">Cargando…</div>}
          {!loading && convs.length === 0 && <div className="p-6 text-sm text-gray-500 text-center">Aún no hay conversaciones. Pulsa "Probar agente".</div>}
          {convs.map(c => (
            <button key={c.id} onClick={() => openConv(c)} className={`w-full text-left p-4 hover:bg-gray-50 transition ${sel?.id === c.id ? 'bg-teal-50' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                  <Phone size={13} className="text-gray-400" /> {c.telefono || 'sin número'}
                </span>
                {c.resultado && <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${resultadoBadge[c.resultado] || 'bg-gray-100 text-gray-600'}`}>{c.resultado}</span>}
              </div>
              <div className="text-xs text-gray-500 mt-1">{fmt(c.created_at)} · {c.canal} · {c.num_mensajes} msg</div>
              {c.resumen && <div className="text-xs text-gray-600 mt-1 line-clamp-2">{c.resumen}</div>}
            </button>
          ))}
        </div>

        {/* Detalle / Chat de prueba */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col max-h-[70vh]">
          {!sel && !testOpen && (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-8">Selecciona una conversación o pulsa "Probar agente".</div>
          )}
          {(sel || testOpen) && (
            <>
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="font-semibold text-gray-900">{testOpen ? 'Probar agente (canal test)' : `Conversación · ${sel?.telefono || 'sin número'}`}</div>
                {sel?.reserva_id && <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Reserva creada</span>}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgs.map(m => {
                  if (m.rol === 'sistema') {
                    return (
                      <div key={m.id} className="text-[11px] text-gray-400 flex items-center gap-1 justify-center">
                        <Wrench size={11} /> {m.contenido}
                      </div>
                    );
                  }
                  const esCliente = m.rol === 'cliente';
                  return (
                    <div key={m.id} className={`flex ${esCliente ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${esCliente ? 'bg-teal-500 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                        <div className="flex items-center gap-1 text-[10px] opacity-70 mb-0.5">
                          {esCliente ? <User size={10} /> : <Bot size={10} />} {esCliente ? 'Cliente' : 'Agente'}
                        </div>
                        {m.contenido}
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              {testOpen && (
                <div className="p-3 border-t border-gray-200 flex gap-2">
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviarPrueba()}
                    placeholder="Escribe como si fueras el cliente…" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                  <button onClick={enviarPrueba} disabled={sending} className="px-4 py-2 bg-teal-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
                    <Send size={16} /> {sending ? '…' : ''}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
