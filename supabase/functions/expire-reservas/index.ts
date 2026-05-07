import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const { data: cfg } = await supabase
    .from("configuracion")
    .select("valor")
    .eq("clave", "solicitud_timeout_min")
    .single();
  const timeoutMin = Number(cfg?.valor ?? 60);

  const cutoff = new Date(Date.now() - timeoutMin * 60 * 1000).toISOString();

  const { data: expired, error } = await supabase
    .from("reservas")
    .update({ estado: "expirada" })
    .eq("estado", "pendiente")
    .lt("created_at", cutoff)
    .select("id, codigo, cliente_id");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Notify clients about expired reservations
  if (expired && expired.length > 0) {
    const notifications = expired.map((r: any) => ({
      user_id: r.cliente_id,
      tipo: "reserva_cancelada",
      titulo: "Reserva expirada",
      mensaje: `Tu reserva ${r.codigo} ha expirado por falta de respuesta. Puedes crear una nueva.`,
      payload: { reserva_id: r.id },
    }));
    await supabase.from("notificaciones").insert(notifications);
  }

  return Response.json({
    expired_count: expired?.length ?? 0,
    expired_ids: expired?.map((r: any) => r.id) ?? [],
  });
});
