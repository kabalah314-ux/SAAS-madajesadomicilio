import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  // Verify caller is admin
  const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const { data: { user } } = await supabase.auth.getUser(authHeader);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return new Response("Forbidden", { status: 403 });

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
      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ user_id: newUser.user.id });
    }

    case "delete_user": {
      const { user_id } = payload;
      const { error } = await supabase.auth.admin.deleteUser(user_id);
      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ success: true });
    }

    case "update_role": {
      const { user_id, new_role } = payload;
      const { error } = await supabase
        .from("profiles")
        .update({ role: new_role })
        .eq("id", user_id);
      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ success: true });
    }

    case "close_ciclo": {
      const { fecha_inicio, fecha_fin } = payload;
      // Create payment cycle
      const { data: ciclo, error: cicloErr } = await supabase
        .from("ciclos_pago")
        .insert({ fecha_inicio, fecha_fin, is_closed: true, closed_at: new Date().toISOString() })
        .select()
        .single();
      if (cicloErr) return Response.json({ error: cicloErr.message }, { status: 400 });

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

      return Response.json({ ciclo_id: ciclo.id, reservas_processed: reservas?.length ?? 0 });
    }

    default:
      return Response.json({ error: "Unknown action" }, { status: 400 });
  }
});
