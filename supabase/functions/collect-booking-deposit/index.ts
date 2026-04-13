import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { organization_id, client_id, card_on_file_id, amount, currency, appointment_id, capture_method } = await req.json();

    if (!organization_id || !amount || !appointment_id) {
      return new Response(JSON.stringify({ error: "organization_id, amount, and appointment_id are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Look up the card on file
    let cardQuery = supabase.from("client_cards_on_file").select("*").eq("organization_id", organization_id);
    if (card_on_file_id) {
      cardQuery = cardQuery.eq("id", card_on_file_id);
    } else if (client_id) {
      cardQuery = cardQuery.eq("client_id", client_id).eq("is_default", true);
    } else {
      return new Response(JSON.stringify({ error: "card_on_file_id or client_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: card, error: cardError } = await cardQuery.limit(1).single();
    if (cardError || !card) {
      return new Response(JSON.stringify({ error: "No card on file found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Look up org's Stripe connected account
    const { data: stripeAccount, error: saError } = await supabase
      .from("organization_stripe_accounts")
      .select("stripe_account_id")
      .eq("organization_id", organization_id)
      .limit(1)
      .single();

    if (saError || !stripeAccount?.stripe_account_id) {
      return new Response(JSON.stringify({ error: "No Stripe account connected for this organization" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Get Stripe secret key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // 4. Create PaymentIntent with manual capture (pre-auth hold)
    const amountCents = Math.round(amount * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: currency || "usd",
      customer: card.stripe_customer_id,
      payment_method: card.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      capture_method: capture_method === "automatic" ? "automatic" : "manual",
      description: `Booking deposit for appointment ${appointment_id}`,
      metadata: {
        organization_id,
        appointment_id,
        charge_type: "booking_deposit",
      },
    }, {
      stripeAccount: stripeAccount.stripe_account_id,
    });

    // 5. Update appointment with deposit status
    const depositStatus = paymentIntent.status === "requires_capture" ? "held" : 
                          paymentIntent.status === "succeeded" ? "collected" : "pending";

    await supabase
      .from("appointments")
      .update({
        deposit_status: depositStatus,
        deposit_stripe_payment_id: paymentIntent.id,
        deposit_amount: amount,
        deposit_collected_at: new Date().toISOString(),
        deposit_required: true,
        card_on_file_id: card.id,
      })
      .eq("id", appointment_id);

    return new Response(JSON.stringify({
      success: true,
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      deposit_status: depositStatus,
      amount: amountCents,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("collect-booking-deposit error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
