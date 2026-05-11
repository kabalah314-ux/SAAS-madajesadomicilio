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
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { reserva_id } = await req.json();

    if (!reserva_id) {
      return new Response(JSON.stringify({ error: "reserva_id requerido" }), {
        status: 400,
      });
    }

    // Get reservation with client and service info
    const { data: reserva, error: resError } = await supabase
      .from("reservas")
      .select(
        `
        id,
        codigo,
        precio_total,
        cliente_id,
        empresa_id,
        clientes!inner(
          id,
          stripe_customer_id,
          profiles!inner(id, email, full_name)
        ),
        servicios!inner(nombre)
      `
      )
      .eq("id", reserva_id)
      .single();

    if (resError || !reserva) {
      return new Response(
        JSON.stringify({ error: "Reserva no encontrada" }),
        { status: 404 }
      );
    }

    const cliente = reserva.clientes;
    let customerId = cliente.stripe_customer_id;

    // Create or get Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: cliente.profiles.email,
        name: cliente.profiles.full_name,
        metadata: {
          empresa_id: reserva.empresa_id,
          cliente_id: cliente.id,
        },
      });

      customerId = customer.id;

      // Save Stripe customer ID
      await supabase
        .from("clientes")
        .update({ stripe_customer_id: customerId })
        .eq("id", cliente.id);
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(reserva.precio_total * 100), // cents
      currency: "eur",
      customer: customerId,
      metadata: {
        reserva_id: reserva.id,
        codigo: reserva.codigo,
        empresa_id: reserva.empresa_id,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Record in database
    await supabase.from("pagos_stripe").insert({
      reserva_id: reserva.id,
      stripe_payment_intent_id: paymentIntent.id,
      monto_eur: reserva.precio_total,
      estado: "pendiente",
    });

    // Update reservation with payment intent ID
    await supabase
      .from("reservas")
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq("id", reserva.id);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
