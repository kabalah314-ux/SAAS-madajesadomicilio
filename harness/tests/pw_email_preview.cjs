// Renderiza visualmente la plantilla de email (réplica 1:1 de send-email/index.ts)
// para hacer QA visual del diseño sin depender de un cliente de correo real.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'C:/Users/oscar/AppData/Local/Temp/claude/C--Users-oscar-Documents-Antigravity--claude-worktrees-vigilant-austin-c4f442/ef293282-6b6a-467f-8274-f77dfc516ca7/scratchpad';

function fmtFecha(iso) {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}
function detallesDesdePayload(payload) {
  const filas = [];
  if (payload.servicio) filas.push(['Servicio', payload.servicio]);
  if (payload.fecha) filas.push(['Fecha', fmtFecha(payload.fecha)]);
  if (payload.hora) filas.push(['Hora', String(payload.hora).slice(0, 5)]);
  if (payload.direccion) filas.push(['Dirección', payload.direccion]);
  if (payload.precio) filas.push(['Precio', `${Number(payload.precio).toFixed(2)} €`]);
  if (payload.codigo) filas.push(['Código de reserva', payload.codigo]);
  return filas;
}
function plantilla({ icono = '💆‍♀️', titulo, mensaje, detalles = [], ctaTexto, ctaUrl }) {
  const filasHtml = detalles.map(([label, value]) => `
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:13px;width:40%">${label}</td>
        <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;text-align:right">${value}</td>
      </tr>`).join('');
  const detallesHtml = filasHtml ? `
      <table role="presentation" width="100%" style="border-top:1px solid #e5e7eb;margin-top:16px;padding-top:4px;border-collapse:collapse">
        ${filasHtml}
      </table>` : '';
  const ctaHtml = ctaTexto && ctaUrl ? `
      <div style="text-align:center;margin-top:24px">
        <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#14b8a6,#059669);color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px">${ctaTexto}</a>
      </div>` : '';
  return `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
    <div style="max-width:520px;margin:0 auto;padding:24px 16px">
      <div style="background:linear-gradient(135deg,#14b8a6,#059669);border-radius:16px 16px 0 0;padding:24px 20px;text-align:center">
        <span style="font-size:26px">💆‍♀️</span>
        <div style="color:#fff;font-weight:bold;font-size:18px;margin-top:2px;letter-spacing:0.2px">MassFlow</div>
      </div>
      <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
        <div style="font-size:32px;line-height:1;margin-bottom:10px">${icono}</div>
        <h1 style="color:#111827;margin:0 0 10px;font-size:20px;font-weight:700">${titulo}</h1>
        <p style="color:#4b5563;line-height:1.6;margin:0;font-size:15px">${mensaje}</p>
        ${detallesHtml}
        ${ctaHtml}
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:18px;line-height:1.5">
        Este es un email automático de MassFlow — masajes a domicilio.<br>No hace falta que respondas a este correo.
      </p>
    </div></body></html>`;
}

const casos = [
  { file: 'pw_email_1_solicitud.png', icono: '📩', titulo: 'Hemos recibido tu solicitud', mensaje: 'Tu solicitud MF-001074 se ha registrado correctamente. Te avisaremos en cuanto una masajista la confirme.',
    detalles: detallesDesdePayload({ servicio: 'Masaje Relajante 60 min', fecha: '2026-09-30', hora: '17:00:00', direccion: 'Calle Prueba 22', precio: 55, codigo: 'MF-001074' }),
    ctaTexto: 'Ver en MassFlow', ctaUrl: 'https://saas-madajesadomicilio.vercel.app' },
  { file: 'pw_email_2_aceptada.png', icono: '✅', titulo: 'Reserva confirmada', mensaje: 'Tu reserva MF-001074 fue aceptada',
    detalles: detallesDesdePayload({ servicio: 'Masaje Relajante 60 min', fecha: '2026-09-30', hora: '17:00:00', direccion: 'Calle Prueba 22', precio: 55, codigo: 'MF-001074' }),
    ctaTexto: 'Ver en MassFlow', ctaUrl: 'https://saas-madajesadomicilio.vercel.app' },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 560, height: 700 } });
  for (const c of casos) {
    const html = plantilla(c);
    const path = `${OUT}/${c.file.replace('.png', '.html')}`;
    fs.writeFileSync(path, html);
    await page.goto('file:///' + path.replace(/\\/g, '/'));
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/${c.file}`, fullPage: true });
    console.log('OK', c.file);
  }
  await browser.close();
})();
