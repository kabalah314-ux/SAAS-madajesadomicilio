import { useState } from 'react';
import { UserPlus, ShieldCheck, Mail, Copy, Check } from 'lucide-react';
import { useApp } from '../../AppContext';

// Sección admin "Accesos": (1) invitar masajistas por email (enlace para fijar
// contraseña), (2) dar rol de admin a una cuenta existente.
export default function GestionAccesos() {
  const { inviteMasajista, promoteToAdmin, masajistas, clientas } = useApp() as any;

  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteRes, setInviteRes] = useState<{ ok: boolean; msg: string; link?: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [promoteMsg, setPromoteMsg] = useState('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteRes(null);
    if (!email) return;
    setInviting(true);
    try {
      const r = await inviteMasajista(email.trim(), nombre.trim());
      if (r?.email_sent) {
        setInviteRes({ ok: true, msg: `Invitación enviada a ${email}. Recibirá un email para crear su contraseña.`, link: r.action_link });
      } else {
        setInviteRes({ ok: true, msg: `Cuenta de masajista creada. El email automático no está activo (falta verificar dominio en Resend), así que comparte tú este enlace con ${email} para que fije su contraseña:`, link: r?.action_link });
      }
      setEmail(''); setNombre('');
    } catch (err: any) {
      setInviteRes({ ok: false, msg: err?.message || 'No se pudo invitar (¿el email ya está registrado?).' });
    } finally {
      setInviting(false);
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard?.writeText(link);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const handlePromote = async (id: string, nombre: string) => {
    if (!confirm(`¿Dar acceso de ADMINISTRADOR a ${nombre}? Podrá gestionar todo el negocio.`)) return;
    setPromoting(id); setPromoteMsg('');
    try {
      await promoteToAdmin(id);
      setPromoteMsg(`✅ ${nombre} ahora es administrador.`);
    } catch (err: any) {
      setPromoteMsg(err?.message || 'No se pudo cambiar el rol.');
    } finally {
      setPromoting(null);
    }
  };

  const personas = [
    ...(masajistas || []).map((m: any) => ({ id: m.id, nombre: `${m.nombre ?? ''} ${m.apellidos ?? ''}`.trim() || m.email, email: m.email, tipo: 'Masajista' })),
    ...(clientas || []).map((c: any) => ({ id: c.id, nombre: `${c.nombre ?? ''} ${c.apellidos ?? ''}`.trim() || c.email, email: c.email, tipo: 'Cliente' })),
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><UserPlus size={26} /> Accesos</h2>
        <p className="text-gray-600 mt-1">Invita masajistas y gestiona quién es administrador.</p>
      </div>

      {/* Invitar masajista */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-1"><Mail size={18} className="text-teal-500" /> Invitar masajista</h3>
        <p className="text-sm text-gray-500 mb-4">Se le envía un email con un enlace para que cree su contraseña y acceda. Los masajistas <strong>no</strong> pueden registrarse solos.</p>
        <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-[1fr,1fr,auto] gap-2">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="email@masajista.com"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500" />
          <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre (opcional)"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500" />
          <button type="submit" disabled={inviting} className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {inviting ? 'Invitando…' : 'Invitar'}
          </button>
        </form>
        {inviteRes && (
          <div className={`mt-3 text-sm rounded-lg px-3 py-2 ${inviteRes.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <div>{inviteRes.msg}</div>
            {inviteRes.link && (
              <div className="mt-2 flex items-center gap-2">
                <input readOnly value={inviteRes.link} className="flex-1 px-2 py-1 border border-green-200 rounded bg-white text-xs text-gray-600" />
                <button onClick={() => copyLink(inviteRes.link!)} className="px-2 py-1 bg-white border border-green-300 rounded text-xs flex items-center gap-1">
                  {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dar acceso de admin */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-1"><ShieldCheck size={18} className="text-indigo-500" /> Administradores</h3>
        <p className="text-sm text-gray-500 mb-4">Da acceso de administrador a una cuenta existente. Se gestiona todo desde la cuenta principal.</p>
        {promoteMsg && <div className="mb-3 text-sm rounded-lg px-3 py-2 bg-indigo-50 text-indigo-700">{promoteMsg}</div>}
        {personas.length === 0 ? (
          <p className="text-sm text-gray-500">No hay cuentas todavía.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {personas.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm font-medium text-gray-900">{p.nombre}</div>
                  <div className="text-xs text-gray-500">{p.email} · {p.tipo}</div>
                </div>
                <button onClick={() => handlePromote(p.id, p.nombre)} disabled={promoting === p.id}
                  className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 disabled:opacity-50 flex items-center gap-1">
                  <ShieldCheck size={13} /> {promoting === p.id ? '…' : 'Hacer admin'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
