import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organization_id, appointment_id, amount, client_email } = await req.json();

    // ── Validation ──────────────────────────────────────────────
    if (!organization_id || typeof organization_id !== "string") {
      return jsonResponse({ error: "organization_id is required" }, 400);
    }
    if (!appointment_id || typeof appointment_id !== "string") {
      return jsonResponse({ error: "appointment_id is required" }, 400);
    }
    if (!client_email || typeof client_email !== "string") {
      return jsonResponse({ error: "client_email is required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Validate appointment belongs to org ──────────────────────
    const { data: appt, error: apptErr } = await supabase
      .from("appointments")
      .select("id, organization_id, status")
      .eq("id", appointment_id)
      .eq("organization_id", organization_id)
      .maybeSingle();

    if (apptErr) throw apptErr;
    if (!appt) {
      return jsonResponse({ error: "Appointment not found" }, 404);
    }

    // ── Look up Connected Account + Afterpay setting ────────────
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("stripe_connect_account_id, afterpay_enabled")
      .eq("id", organization_id)
      .maybeSingle();

    if (orgErr) throw orgErr;
    if (!org?.stripe_connect_account_id) {
      return jsonResponse({ error: "Payment processing is not configured" }, 400);
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return jsonResponse({ error: "Payment configuration incomplete" }, 500);
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const connectedAccountId = org.stripe_connect_account_id;

    // ── Find or create customer on Connected Account ────────────
    const existingCustomers = await stripe.customers.list(
      { email: client_email.toLowerCase(), limit: 1 },
      { stripeAccount: connectedAccountId }
    );

    let customerId: string;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create(
        { email: client_email.toLowerCase() },
        { stripeAccount: connectedAccountId }
      );
      customerId = newCustomer.id;
    }

    const amountCents = amount && amount > 0 ? Math.round(amount * 100) : 0;

    if (amountCents > 0) {
      // ── Build payment method types (conditionally include Afterpay) ──
      const paymentMethodTypes: string[] = ["card"];
      if (
        org.afterpay_enabled &&
        amountCents >= 100 &&   // Afterpay min: $1.00
        amountCents <= 400000   // Afterpay max: $4,000.00
      ) {
        paymentMethodTypes.push("afterpay_clearpay");
      }

      // ── Create PaymentIntent for deposit ──────────────────────
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: "usd",
          customer: customerId,
          capture_method: "automatic",
          payment_method_types: paymentMethodTypes,
          metadata: {
            appointment_id,
            organization_id,
            source: "online_booking",
            fee_type: "deposit",
          },
        },
        { stripeAccount: connectedAccountId }
      );

      // Update appointment with Stripe PI reference
      await supabase
        .from("appointments")
        .update({
          deposit_stripe_payment_id: paymentIntent.id,
        })
        .eq("id", appointment_id);

      return jsonResponse({
        client_secret: paymentIntent.client_secret,
        intent_type: "payment",
        connected_account_id: connectedAccountId,
      });
    } else {
      // ── Create SetupIntent for card-on-file ───────────────────
      const setupIntent = await stripe.setupIntents.create(
        {
          customer: customerId,
          metadata: {
            appointment_id,
            organization_id,
            source: "online_booking",
          },
        },
        { stripeAccount: connectedAccountId }
      );

      return jsonResponse({
        client_secret: setupIntent.client_secret,
        intent_type: "setup",
        connected_account_id: connectedAccountId,
      });
    }
  } catch (error) {
    console.error("create-booking-payment-intent error:", error);
    return jsonResponse(
      { error: error.message || "An unexpected error occurred" },
      500
    );
  }
});
