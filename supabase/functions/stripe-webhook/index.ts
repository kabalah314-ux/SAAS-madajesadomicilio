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

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, WEBHOOK_SECRET);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return new Response(
      JSON.stringify({ error: "Invalid signature" }),
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment succeeded:", paymentIntent.id);

        // Update payment record
        await supabase
          .from("pagos_stripe")
          .update({
            estado: "pagado",
            stripe_charge_id: paymentIntent.latest_charge as string,
            raw_event: event as any,
          })
          .eq("stripe_payment_intent_id", paymentIntent.id);

        // Update reservation as paid
        await supabase
          .from("reservas")
          .update({ pago_estado: "pagado" })
          .eq("stripe_payment_intent_id", paymentIntent.id);

        // Create notification for client
        const { data: reserva } = await supabase
          .from("reservas")
          .select("cliente_id, codigo")
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .single();

        if (reserva) {
          await supabase.from("notificaciones").insert({
            user_id: reserva.cliente_id,
            tipo: "pago_recibido",
            titulo: "Pago confirmado",
            mensaje: `Tu pago para la reserva ${reserva.codigo} ha sido procesado correctamente`,
            payload: { reserva_id: reserva.id },
          });
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment failed:", paymentIntent.id);

        // Update payment record
        await supabase
          .from("pagos_stripe")
          .update({
            estado: "fallido",
            raw_event: event as any,
          })
          .eq("stripe_payment_intent_id", paymentIntent.id);

        // Notify client
        const { data: reserva } = await supabase
          .from("reservas")
          .select("cliente_id, codigo")
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .single();

        if (reserva) {
          await supabase.from("notificaciones").insert({
            user_id: reserva.cliente_id,
            tipo: "sistema",
            titulo: "Error en el pago",
            mensaje: `El pago para la reserva ${reserva.codigo} falló. Por favor, intenta de nuevo.`,
            payload: { reserva_id: reserva.id },
          });
        }

        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        console.log("Charge refunded:", charge.id);

        // Update payment record
        await supabase
          .from("pagos_stripe")
          .update({
            estado: "reembolsado",
            raw_event: event as any,
          })
          .eq("stripe_charge_id", charge.id);

        // Get reservation and notify client
        const { data: pago } = await supabase
          .from("pagos_stripe")
          .select("reserva_id")
          .eq("stripe_charge_id", charge.id)
          .single();

        if (pago) {
          const { data: reserva } = await supabase
            .from("reservas")
            .select("cliente_id, codigo")
            .eq("id", pago.reserva_id)
            .single();

          if (reserva) {
            await supabase.from("notificaciones").insert({
              user_id: reserva.cliente_id,
              tipo: "sistema",
              titulo: "Reembolso procesado",
              mensaje: `Se ha procesado un reembolso para la reserva ${reserva.codigo}`,
              payload: { reserva_id: reserva.id },
            });
          }
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500 }
    );
  }
});
