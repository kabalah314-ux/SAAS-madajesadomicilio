// Edge Function: crea una sesión de Stripe Checkout para pagar una reserva.
// Requiere el secreto STRIPE_SECRET_KEY (supabase secrets set STRIPE_SECRET_KEY=sk_test_...).
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  const cors = corsHeaders(req);
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // El que paga debe estar autenticado y ser la dueña de la reserva.
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token ?? "");
  if (!user) return json({ error: "Unauthorized" }, 401);

  const { reserva_id, success_url, cancel_url } = await req.json();

  const { data: reserva } = await supabase
    .from("reservas")
    .select("*, servicios(nombre)")
    .eq("id", reserva_id)
    .single();

  if (!reserva || reserva.cliente_id !== user.id) {
    return json({ error: "Reserva no válida" }, 400);
  }
  if (reserva.pago_estado === "pagado") {
    return json({ error: "La reserva ya está pagada" }, 400);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "eur",
        product_data: { name: reserva.servicios?.nombre ?? "Sesión de masaje", description: `Reserva ${reserva.codigo}` },
        unit_amount: Math.round(Number(reserva.precio_total) * 100),
      },
      quantity: 1,
    }],
    metadata: { reserva_id },
    success_url: success_url ?? `${req.headers.get("origin") ?? ""}/?pago=ok`,
    cancel_url: cancel_url ?? `${req.headers.get("origin") ?? ""}/?pago=cancelado`,
  });

  return json({ url: session.url });
});
