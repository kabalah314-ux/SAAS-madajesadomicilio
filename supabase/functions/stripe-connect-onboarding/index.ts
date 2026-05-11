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

const RETURN_URL = Deno.env.get("STRIPE_RETURN_URL") || "http://localhost:3000/masajista/payments";

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
    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    // Get masajista profile
    const { data: masajista, error: masError } = await supabase
      .from("masajistas")
      .select("*, profiles!inner(email, full_name)")
      .eq("id", user.id)
      .single();

    if (masError || !masajista) {
      return new Response(
        JSON.stringify({ error: "Masajista profile not found" }),
        { status: 404 }
      );
    }

    // If already has account, return existing link
    if (masajista.stripe_account_id) {
      const accountLink = await stripe.accountLinks.create({
        account: masajista.stripe_account_id,
        type: "account_onboarding",
        refresh_url: `${RETURN_URL}?status=refresh`,
        return_url: `${RETURN_URL}?status=success`,
      });

      return new Response(
        JSON.stringify({
          onboarding_url: accountLink.url,
          account_id: masajista.stripe_account_id,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Create new Express Connect account
    const account = await stripe.accounts.create({
      type: "express",
      country: "ES",
      email: masajista.profiles.email,
      business_type: "individual",
      individual: {
        first_name: masajista.profiles.full_name.split(" ")[0],
        last_name: masajista.profiles.full_name.split(" ").slice(1).join(" "),
        email: masajista.profiles.email,
      },
      metadata: {
        masajista_id: masajista.id,
      },
    });

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      type: "account_onboarding",
      refresh_url: `${RETURN_URL}?status=refresh`,
      return_url: `${RETURN_URL}?status=success`,
    });

    // Save account ID
    await supabase
      .from("masajistas")
      .update({ stripe_account_id: account.id })
      .eq("id", masajista.id);

    return new Response(
      JSON.stringify({
        onboarding_url: accountLink.url,
        account_id: account.id,
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
    console.error("Error creating Connect account:", error);
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
