import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { ciclo_id } = await req.json();

    if (!ciclo_id) {
      return new Response(
        JSON.stringify({ error: "ciclo_id requerido" }),
        { status: 400 }
      );
    }

    // Get cycle info
    const { data: ciclo, error: cicloError } = await supabase
      .from("ciclos_pago")
      .select("*")
      .eq("id", ciclo_id)
      .single();

    if (cicloError || !ciclo) {
      return new Response(
        JSON.stringify({ error: "Ciclo no encontrado" }),
        { status: 404 }
      );
    }

    if (ciclo.is_closed) {
      return new Response(
        JSON.stringify({ error: "Ciclo ya fue cerrado" }),
        { status: 400 }
      );
    }

    // Get all completed reservations in this cycle that haven't been paid yet
    const { data: reservas, error: resError } = await supabase
      .from("reservas")
      .select("id, masajista_id, pago_masajista, empresa_id")
      .gte("completed_en", ciclo.fecha_inicio)
      .lte("completed_en", ciclo.fecha_fin)
      .eq("estado", "completada")
      .eq("pago_estado", "pagado")
      .not("id", "in", `(${
        (
          await supabase
            .from("transferencias")
            .select("referencia")
            .eq("ciclo_id", ciclo_id)
        ).data?.map((t: any) => t.referencia).join(",") || "null"
      })`);

    if (resError) {
      return new Response(
        JSON.stringify({ error: "Error fetching reservations" }),
        { status: 500 }
      );
    }

    // Group by masajista
    const byMasajista = new Map<string, { monto: number; sesiones: number; reservas: string[] }>();

    for (const res of reservas || []) {
      if (!res.masajista_id) continue;

      const key = res.masajista_id;
      const current = byMasajista.get(key) || {
        monto: 0,
        sesiones: 0,
        reservas: [],
      };

      current.monto += Number(res.pago_masajista);
      current.sesiones += 1;
      current.reservas.push(res.id);

      byMasajista.set(key, current);
    }

    const resultados = [];

    // Process each masajista
    for (const [masajista_id, datos] of byMasajista) {
      // Get masajista Connect account
      const { data: masajista, error: masError } = await supabase
        .from("masajistas")
        .select("stripe_account_id, profiles!inner(email)")
        .eq("id", masajista_id)
        .single();

      if (masError || !masajista?.stripe_account_id) {
        console.error(`Masajista ${masajista_id} sin Stripe Connect account`);
        resultados.push({
          masajista_id,
          estado: "error",
          razon: "Sin cuenta Stripe Connect",
        });
        continue;
      }

      try {
        // Create transfer to masajista
        const transfer = await stripe.transfers.create({
          amount: Math.round(datos.monto * 100), // cents
          currency: "eur",
          destination: masajista.stripe_account_id,
          description: `Pagos masajes ciclo ${ciclo.fecha_inicio} a ${ciclo.fecha_fin}`,
          metadata: {
            ciclo_id,
            masajista_id,
            num_sesiones: datos.sesiones,
          },
        });

        // Record transfer in DB
        const referencia = datos.reservas.join(",");

        await supabase.from("transferencias").insert({
          ciclo_id,
          masajista_id,
          monto_eur: datos.monto,
          num_sesiones: datos.sesiones,
          estado: "enviada",
          stripe_transfer_id: transfer.id,
          referencia,
        });

        resultados.push({
          masajista_id,
          estado: "enviada",
          monto: datos.monto,
          sesiones: datos.sesiones,
          transfer_id: transfer.id,
        });

        // Notify masajista
        await supabase.from("notificaciones").insert({
          user_id: masajista_id,
          tipo: "pago_recibido",
          titulo: "Pago procesado",
          mensaje: `Se han transferido €${datos.monto.toFixed(2)} por ${datos.sesiones} sesiones completadas`,
          payload: {
            ciclo_id,
            monto: datos.monto,
            transfer_id: transfer.id,
          },
        });
      } catch (error) {
        console.error(`Error transferring to ${masajista_id}:`, error);
        resultados.push({
          masajista_id,
          estado: "error",
          razon: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Mark cycle as closed
    await supabase
      .from("ciclos_pago")
      .update({ is_closed: true, closed_at: new Date().toISOString() })
      .eq("id", ciclo_id);

    return new Response(
      JSON.stringify({
        ciclo_id,
        total_masajistas: byMasajista.size,
        resultados,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing payouts:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
});
