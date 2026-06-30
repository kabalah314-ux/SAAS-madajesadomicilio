// Edge Function: webhook de Stripe. Marca la reserva como pagada cuando el
// Checkout se completa. Requiere STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET.
// Despliega con --no-verify-jwt (Stripe llama sin JWT; se valida la firma).
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "",
    );
  } catch (err) {
    return new Response(`Webhook signature error: ${(err as Error).message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const reservaId = session.metadata?.reserva_id;
    const paymentIntent = String(session.payment_intent ?? "");
    if (reservaId) {
      await supabase.from("reservas")
        .update({ pago_estado: "pagado", stripe_payment_intent_id: paymentIntent })
        .eq("id", reservaId);

      await supabase.from("pagos_stripe").upsert({
        reserva_id: reservaId,
        stripe_payment_intent_id: paymentIntent,
        monto_eur: (session.amount_total ?? 0) / 100,
        estado: "pagado",
        metodo: "card",
        raw_event: event as unknown as Record<string, unknown>,
      }, { onConflict: "stripe_payment_intent_id" });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
