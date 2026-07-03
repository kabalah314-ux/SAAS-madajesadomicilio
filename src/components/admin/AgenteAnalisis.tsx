import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, HelpCircle, MessageCircle, PhoneForwarded, StickyNote, TrendingUp, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// FASE C · Análisis del agente conversacional.
// Todo se calcula en el cliente a partir de las conversaciones que el agente
// guarda (resultado, temas[], canal, reserva_id, fechas). No añade migraciones
// ni dependencias: son las mismas filas que el admin ya lee por RLS.

type ConvLite = {
  id: string; canal: string; resultado: string | null; reserva_id: string | null;
  cliente_id: string | null; contacto_id: string | null; temas: string[] | null;
  num_mensajes: number; created_at: string;
};

const RESULTADOS: { key: string; label: string; color: string }[] = [
  { key: 'reserva', label: 'Reserva', color: 'bg-green-500' },
  { key: 'consulta', label: 'Consulta', color: 'bg-blue-500' },
  { key: 'info', label: 'Info', color: 'bg-gray-400' },
  { key: 'recado', label: 'Recado', color: 'bg-amber-500' },
  { key: 'transferida', label: 'Transferida', color: 'bg-purple-500' },
  { key: 'sin_resolver', label: 'Sin resolver', color: 'bg-red-500' },
];

const CANALES: Record<string, { label: string; color: string }> = {
  test: { label: 'Prueba', color: 'bg-teal-500' },
  whatsapp: { label: 'WhatsApp', color: 'bg-emerald-500' },
  telefono: { label: 'Teléfono', color: 'bg-indigo-500' },
};

const PERIODOS = [
  { key: '7', label: '7 días' },
  { key: '30', label: '30 días' },
  { key: 'all', label: 'Todo' },
] as const;

type PeriodoKey = (typeof PERIODOS)[number]['key'];

function Kpi({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
        <span className={accent}>{icon}</span> {label}
      </div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

// Barra horizontal simple (sin librería de charts, al estilo del resto de la app).
function BarRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span className="tabular-nums text-gray-500">{count} · {pct}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AgenteAnalisis() {
  const [rows, setRows] = useState<ConvLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<PeriodoKey>('30');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('agente_conversaciones')
        .select('id, canal, resultado, reserva_id, cliente_id, contacto_id, temas, num_mensajes, created_at')
        .order('created_at', { ascending: false })
        .limit(2000);
      setRows((data as ConvLite[]) || []);
      setLoading(false);
    })();
  }, []);

  // Filtrado por período.
  const convs = useMemo(() => {
    if (periodo === 'all') return rows;
    const dias = periodo === '7' ? 7 : 30;
    const desde = Date.now() - dias * 24 * 60 * 60 * 1000;
    return rows.filter(r => new Date(r.created_at).getTime() >= desde);
  }, [rows, periodo]);

  const stats = useMemo(() => {
    const total = convs.length;
    const conReserva = convs.filter(c => c.resultado === 'reserva' || c.reserva_id).length;
    const sinResolver = convs.filter(c => c.resultado === 'sin_resolver').length;
    const recados = convs.filter(c => c.resultado === 'recado').length;
    const transferidas = convs.filter(c => c.resultado === 'transferida').length;
    const totalMsgs = convs.reduce((a, c) => a + (c.num_mensajes || 0), 0);
    const mediaMsgs = total > 0 ? totalMsgs / total : 0;
    const reconocidos = convs.filter(c => c.cliente_id || c.contacto_id).length;
    const nuevos = total - reconocidos;

    const porResultado = RESULTADOS.map(r => ({ ...r, count: convs.filter(c => c.resultado === r.key).length }));
    const sinClasificar = convs.filter(c => !c.resultado).length;

    const canalKeys = Array.from(new Set(convs.map(c => c.canal || 'test')));
    const porCanal = canalKeys
      .map(k => ({ key: k, count: convs.filter(c => (c.canal || 'test') === k).length }))
      .sort((a, b) => b.count - a.count);

    // Temas más frecuentes.
    const temaCount = new Map<string, number>();
    for (const c of convs) for (const t of c.temas || []) temaCount.set(t, (temaCount.get(t) || 0) + 1);
    const topTemas = Array.from(temaCount.entries()).map(([tema, count]) => ({ tema, count })).sort((a, b) => b.count - a.count).slice(0, 8);

    // Actividad por día (últimos N días según período; para "todo" usamos 30).
    const dias = periodo === '7' ? 7 : 30;
    const hoy = new Date();
    const serie: { label: string; count: number }[] = [];
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(hoy);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const ini = d.getTime();
      const fin = ini + 24 * 60 * 60 * 1000;
      const count = convs.filter(c => { const t = new Date(c.created_at).getTime(); return t >= ini && t < fin; }).length;
      serie.push({ label: d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }), count });
    }

    return { total, conReserva, sinResolver, recados, transferidas, mediaMsgs, reconocidos, nuevos, porResultado, sinClasificar, porCanal, topTemas, serie };
  }, [convs, periodo]);

  const tasaReserva = stats.total > 0 ? Math.round((stats.conReserva / stats.total) * 100) : 0;
  const tasaSinResolver = stats.total > 0 ? Math.round((stats.sinResolver / stats.total) * 100) : 0;
  const maxSerie = Math.max(1, ...stats.serie.map(s => s.count));

  if (loading) return <div className="p-8 text-sm text-gray-500">Cargando análisis…</div>;

  if (stats.total === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <TrendingUp className="mx-auto text-gray-300" size={40} />
        <p className="text-gray-600 mt-3 font-medium">Sin datos en este período</p>
        <p className="text-gray-500 text-sm mt-1">Cuando el agente atienda conversaciones, aquí verás el análisis del negocio.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de período */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Período:</span>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          {PERIODOS.map(p => (
            <button key={p.key} onClick={() => setPeriodo(p.key)}
              className={`px-3 py-1.5 text-sm font-medium transition ${periodo === p.key ? 'bg-teal-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={<MessageCircle size={15} />} accent="text-teal-500" label="Conversaciones" value={String(stats.total)} sub={`${stats.mediaMsgs.toFixed(1)} mensajes de media`} />
        <Kpi icon={<CalendarCheck size={15} />} accent="text-green-600" label="Tasa de reserva" value={`${tasaReserva}%`} sub={`${stats.conReserva} acabaron en reserva`} />
        <Kpi icon={<HelpCircle size={15} />} accent="text-red-500" label="Sin resolver" value={`${tasaSinResolver}%`} sub={`${stats.sinResolver} conversaciones`} />
        <Kpi icon={<Users size={15} />} accent="text-indigo-500" label="Clientes nuevos" value={String(stats.nuevos)} sub={`${stats.reconocidos} ya conocidos`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Resultado */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-teal-500" /> En qué acaban</h3>
          <div className="space-y-3">
            {stats.porResultado.map(r => <BarRow key={r.key} label={r.label} count={r.count} total={stats.total} color={r.color} />)}
            {stats.sinClasificar > 0 && <BarRow label="En curso / sin clasificar" count={stats.sinClasificar} total={stats.total} color="bg-gray-300" />}
          </div>
        </div>

        {/* Canal */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><PhoneForwarded size={18} className="text-indigo-500" /> Por canal</h3>
          <div className="space-y-3">
            {stats.porCanal.map(c => (
              <BarRow key={c.key} label={CANALES[c.key]?.label || c.key} count={c.count} total={stats.total} color={CANALES[c.key]?.color || 'bg-gray-400'} />
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600"><StickyNote size={15} className="text-amber-500" /> {stats.recados} recados tomados</div>
            <div className="flex items-center gap-2 text-gray-600"><PhoneForwarded size={15} className="text-purple-500" /> {stats.transferidas} transferencias</div>
          </div>
        </div>
      </div>

      {/* Temas */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><MessageCircle size={18} className="text-teal-500" /> Qué pregunta la gente</h3>
        {stats.topTemas.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no hay temas etiquetados en las conversaciones.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {stats.topTemas.map(t => (
              <span key={t.tema} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-sm font-medium">
                {t.tema} <span className="text-teal-500/70 text-xs tabular-nums">×{t.count}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actividad por día */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500" /> Actividad por día</h3>
        <div className="flex items-end gap-1 h-32">
          {stats.serie.map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group" title={`${s.label}: ${s.count}`}>
              <div className="w-full rounded-t bg-gradient-to-t from-teal-500 to-emerald-400 min-h-[2px] transition-all group-hover:opacity-80"
                style={{ height: `${(s.count / maxSerie) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-2">
          <span>{stats.serie[0]?.label}</span>
          <span>{stats.serie[stats.serie.length - 1]?.label}</span>
        </div>
      </div>
    </div>
  );
}
