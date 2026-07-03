import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const cors = corsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  // Verify caller is admin
  const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!authHeader) return new Response("Unauthorized", { status: 401, headers: cors });

  const { data: { user } } = await supabase.auth.getUser(authHeader);
  if (!user) return new Response("Unauthorized", { status: 401, headers: cors });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return new Response("Forbidden", { status: 403, headers: cors });

  const { action, payload } = await req.json();

  switch (action) {
    case "create_user": {
      const { email, password, full_name, role, phone } = payload;
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role, phone },
      });
      if (error) return json({ error: error.message }, 400);
      return json({ user_id: newUser.user.id });
    }

    case "delete_user": {
      const { user_id } = payload;
      const { error } = await supabase.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    case "update_role": {
      const { user_id, new_role } = payload;
      const { error } = await supabase
        .from("profiles")
        .update({ role: new_role })
        .eq("id", user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    case "invite_masajista": {
      // Invita a un masajista por email: crea el usuario (invitado, sin contraseña)
      // y genera el enlace para que fije su contraseña; el enlace se envía por Resend
      // (función send-email). El usuario nace con rol 'masajista' (metadata → trigger).
      const { email, full_name, redirect_to } = payload;
      if (!email) return json({ error: "Falta el email" }, 400);
      const redirectTo = redirect_to || "https://saas-madajesadomicilio.vercel.app/?setpw=1";
      const { data: link, error } = await supabase.auth.admin.generateLink({
        type: "invite",
        email,
        options: { data: { full_name: full_name ?? "", role: "masajista" }, redirectTo },
      });
      if (error) return json({ error: error.message }, 400);
      const actionLink = (link as any)?.properties?.action_link ?? null;

      // Enviar el email de invitación vía la función send-email (Resend).
      let email_sent = false;
      let email_error: string | null = null;
      try {
        const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif">
          <div style="max-width:520px;margin:0 auto;padding:24px">
            <div style="background:linear-gradient(135deg,#14b8a6,#059669);border-radius:16px;padding:20px;text-align:center">
              <span style="font-size:28px">💆‍♀️</span>
              <div style="color:#fff;font-weight:bold;font-size:20px;margin-top:4px">MassFlow</div>
            </div>
            <div style="background:#fff;border-radius:16px;padding:24px;margin-top:16px">
              <h2 style="color:#111827;margin:0 0 8px">Te han invitado como masajista</h2>
              <p style="color:#374151;line-height:1.6">Hola ${full_name ?? ""}, el equipo de MassFlow te invita a unirte como masajista. Pulsa el botón para crear tu contraseña y acceder a tu cuenta:</p>
              <p style="text-align:center;margin:24px 0">
                <a href="${actionLink}" style="background:#0d9488;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Crear mi cuenta</a>
              </p>
              <p style="color:#9ca3af;font-size:12px">Si el botón no funciona, copia y pega este enlace en tu navegador:<br>${actionLink}</p>
            </div>
          </div></body></html>`;
        const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-webhook-secret": Deno.env.get("WEBHOOK_SECRET") ?? "" },
          body: JSON.stringify({ to: email, subject: "Invitación a MassFlow (masajista)", html }),
        });
        const j = await res.json().catch(() => ({}));
        email_sent = !!(j as any).sent;
        if (!email_sent) email_error = JSON.stringify(j);
      } catch (e) {
        email_error = String((e as Error).message ?? e);
      }
      return json({ success: true, email_sent, email_error, action_link: actionLink });
    }

    case "close_ciclo": {
      const { fecha_inicio, fecha_fin } = payload;
      // Create payment cycle
      const { data: ciclo, error: cicloErr } = await supabase
        .from("ciclos_pago")
        .insert({ fecha_inicio, fecha_fin, is_closed: true, closed_at: new Date().toISOString() })
        .select()
        .single();
      if (cicloErr) return json({ error: cicloErr.message }, 400);

      // Calculate amounts per masajista
      const { data: reservas } = await supabase
        .from("reservas")
        .select("masajista_id, pago_masajista")
        .eq("estado", "completada")
        .gte("fecha", fecha_inicio)
        .lte("fecha", fecha_fin)
        .not("masajista_id", "is", null);

      if (reservas && reservas.length > 0) {
        const grouped: Record<string, { total: number; count: number }> = {};
        for (const r of reservas) {
          if (!grouped[r.masajista_id]) grouped[r.masajista_id] = { total: 0, count: 0 };
          grouped[r.masajista_id].total += Number(r.pago_masajista);
          grouped[r.masajista_id].count += 1;
        }

        const transfers = Object.entries(grouped).map(([mid, { total, count }]) => ({
          ciclo_id: ciclo.id,
          masajista_id: mid,
          monto_eur: total,
          num_sesiones: count,
          estado: "pendiente",
        }));

        await supabase.from("transferencias").insert(transfers);
      }

      return json({ ciclo_id: ciclo.id, reservas_processed: reservas?.length ?? 0 });
    }

    default:
      return json({ error: "Unknown action" }, 400);
  }
});
