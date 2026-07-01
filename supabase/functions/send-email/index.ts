// Edge Function: send-email
// Envía emails transaccionales con Resend (https://resend.com).
// Pensada para dispararse desde un **Database Webhook** de Supabase sobre
// INSERT en `notificaciones` (formato { type, table, record }), pero también
// acepta una llamada directa { to, subject, html }.
//
// Degradación elegante: si no hay RESEND_API_KEY configurada, responde 200
// sin enviar nada (la app sigue funcionando; el email es opcional hasta que
// el negocio cree su cuenta Resend). Guía: harness/07_EMAIL.md
//
// Secrets necesarios (supabase secrets set ...):
//   RESEND_API_KEY   · clave de Resend
//   EMAIL_FROM       · remitente verificado, p.ej. "MassFlow <hola@tu-dominio.com>"
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (inyectadas por la plataforma)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "MassFlow <onboarding@resend.dev>";
// Secreto compartido con el trigger de BD (se despliega con --no-verify-jwt,
// así que esto es lo que impide que cualquiera invoque la función).
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const APP_URL = Deno.env.get("APP_URL") ?? "https://saas-madajesadomicilio.vercel.app";

// Icono según el tipo de notificación (y el `evento` fino en el payload, cuando lo hay).
function iconoPara(tipo: string, evento?: string): string {
  if (evento === "solicitud_recibida") return "📩";
  if (evento === "asignada") return "🧑‍🔧";
  if (tipo === "reserva_aceptada") return "✅";
  if (tipo === "reserva_rechazada") return "❌";
  if (tipo === "reserva_cancelada") return "🚫";
  if (tipo === "reserva_nueva") return "📅";
  if (tipo === "documento_verificado") return "🪪";
  if (tipo === "pago_recibido") return "💶";
  if (tipo === "valoracion_recibida") return "⭐";
  return "🔔";
}

function fmtFecha(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return iso; }
}

// Construye las filas de la "tarjeta de detalles" (servicio/fecha/hora/precio/…)
// a partir del payload jsonb que guarda el trigger de BD. Si no hay datos, no hay tarjeta.
function detallesDesdePayload(payload: Record<string, any> | undefined): [string, string][] {
  if (!payload) return [];
  const filas: [string, string][] = [];
  if (payload.servicio) filas.push(["Servicio", String(payload.servicio)]);
  if (payload.fecha) filas.push(["Fecha", fmtFecha(payload.fecha)]);
  if (payload.hora) filas.push(["Hora", String(payload.hora).slice(0, 5)]);
  if (payload.direccion) filas.push(["Dirección", String(payload.direccion)]);
  if (payload.precio) filas.push(["Precio", `${Number(payload.precio).toFixed(2)} €`]);
  if (payload.codigo) filas.push(["Código de reserva", String(payload.codigo)]);
  return filas;
}

function plantilla(opts: { icono?: string; titulo: string; mensaje: string; detalles?: [string, string][]; ctaTexto?: string; ctaUrl?: string }): string {
  const { icono = "💆‍♀️", titulo, mensaje, detalles = [], ctaTexto, ctaUrl } = opts;
  const filasHtml = detalles.map(([label, value]) => `
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:13px;width:40%">${label}</td>
        <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;text-align:right">${value}</td>
      </tr>`).join("");
  const detallesHtml = filasHtml ? `
      <table role="presentation" width="100%" style="border-top:1px solid #e5e7eb;margin-top:16px;padding-top:4px;border-collapse:collapse">
        ${filasHtml}
      </table>` : "";
  const ctaHtml = ctaTexto && ctaUrl ? `
      <div style="text-align:center;margin-top:24px">
        <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#14b8a6,#059669);color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px">${ctaTexto}</a>
      </div>` : "";

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

async function enviarResend(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend ${res.status}: ${text}`);
  }
  return await res.json();
}

serve(async (req) => {
  // Degradación: sin clave Resend, no-op (la app funciona igual).
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ skipped: "no RESEND_API_KEY" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  // Si hay secreto configurado, exigirlo (la función se despliega sin JWT).
  if (WEBHOOK_SECRET && req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "no autorizado" }), { status: 401 });
  }

  try {
    const body = await req.json();

    // Caso 1: llamada directa { to, subject, html } (p.ej. invitación de masajista, que
    // construye su propio HTML). Si no viene `html`, se usa la plantilla con estilo MassFlow.
    if (body.to && body.subject) {
      const html = body.html ?? plantilla({ titulo: body.subject, mensaje: body.text ?? "" });
      const result = await enviarResend(body.to, body.subject, html);
      return Response.json({ sent: true, result });
    }

    // Caso 2: Database Webhook sobre notificaciones (INSERT)
    const record = body.record ?? body;
    if (!record?.user_id) {
      return Response.json({ skipped: "sin user_id" }, { status: 200 });
    }

    // Resolver el email del destinatario.
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", record.user_id)
      .single();
    if (!profile?.email) {
      return Response.json({ skipped: "sin email" }, { status: 200 });
    }

    const titulo = record.titulo ?? "Notificación de MassFlow";
    const mensaje = record.mensaje ?? "";
    const payload = record.payload ?? {};
    const evento = payload.evento as string | undefined;
    const html = plantilla({
      icono: iconoPara(record.tipo ?? "", evento),
      titulo,
      mensaje,
      detalles: detallesDesdePayload(payload),
      ctaTexto: "Ver en MassFlow",
      ctaUrl: APP_URL,
    });
    const result = await enviarResend(profile.email, titulo, html);
    return Response.json({ sent: true, to: profile.email, result });
  } catch (err) {
    // No reventar el flujo por un fallo de email; se registra y se responde 200.
    console.error("send-email error:", (err as Error).message);
    return Response.json({ error: (err as Error).message }, { status: 200 });
  }
});
