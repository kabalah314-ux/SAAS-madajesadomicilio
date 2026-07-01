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

function plantilla(titulo: string, mensaje: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif">
    <div style="max-width:520px;margin:0 auto;padding:24px">
      <div style="background:linear-gradient(135deg,#14b8a6,#059669);border-radius:16px;padding:20px;text-align:center">
        <span style="font-size:28px">💆‍♀️</span>
        <div style="color:#fff;font-weight:bold;font-size:20px;margin-top:4px">MassFlow</div>
      </div>
      <div style="background:#fff;border-radius:16px;padding:24px;margin-top:16px">
        <h2 style="color:#111827;margin:0 0 8px">${titulo}</h2>
        <p style="color:#374151;line-height:1.6;margin:0">${mensaje}</p>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px">
        Este es un email automático de MassFlow.
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

    // Caso 1: llamada directa { to, subject, html }
    if (body.to && body.subject) {
      const result = await enviarResend(body.to, body.subject, body.html ?? plantilla(body.subject, body.text ?? ""));
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
    const result = await enviarResend(profile.email, titulo, plantilla(titulo, mensaje));
    return Response.json({ sent: true, to: profile.email, result });
  } catch (err) {
    // No reventar el flujo por un fallo de email; se registra y se responde 200.
    console.error("send-email error:", (err as Error).message);
    return Response.json({ error: (err as Error).message }, { status: 200 });
  }
});
