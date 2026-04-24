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

const AFTERPAY_MIN_CENTS = 100;      // $1.00
const AFTERPAY_MAX_CENTS = 400000;   // $4,000.00

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ─────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    ) as any;

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // ── Input ────────────────────────────────────────────────────
    const body = await req.json();
    const {
      organization_id,
      appointment_id,
      amount_cents,
      client_email,
      client_phone,
      client_name,
      success_url,
      cancel_url,
    } = body;

    if (!organization_id || typeof organization_id !== "string") {
      return jsonResponse({ error: "organization_id is required" }, 400);
    }
    if (!appointment_id || typeof appointment_id !== "string") {
      return jsonResponse({ error: "appointment_id is required" }, 400);
    }
    if (!amount_cents || typeof amount_cents !== "number" || amount_cents < 50) {
      return jsonResponse({ error: "amount_cents must be at least 50 ($0.50)" }, 400);
    }

    // ── Verify membership ────────────────────────────────────────
    const { data: isMember } = await supabase.rpc("is_org_member", {
      _user_id: user.id,
      _org_id: organization_id,
    });
    if (!isMember) {
      return jsonResponse({ error: "Unauthorized" }, 403);
    }

    // ── Org config ───────────────────────────────────────────────
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("stripe_connect_account_id, afterpay_enabled, afterpay_surcharge_enabled, afterpay_surcharge_rate, name")
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

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
    const connectedAccountId = org.stripe_connect_account_id;

    // ── Determine Afterpay eligibility ───────────────────────────
    const afterpayEligible =
      org.afterpay_enabled &&
      amount_cents >= AFTERPAY_MIN_CENTS &&
      amount_cents <= AFTERPAY_MAX_CENTS;

    const surchargeEnabled = afterpayEligible && org.afterpay_surcharge_enabled;
    const surchargeRate = org.afterpay_surcharge_rate ?? 0.06;

    // ── Build payment method types ───────────────────────────────
    // When surcharging, restrict to Afterpay-only so the fee is justified
    let paymentMethodTypes: string[];
    if (surchargeEnabled) {
      paymentMethodTypes = ["afterpay_clearpay"];
    } else {
      paymentMethodTypes = ["card"];
      if (afterpayEligible) {
        paymentMethodTypes.push("afterpay_clearpay");
      }
    }

    // ── Build line items ─────────────────────────────────────────
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Payment — ${org.name || "Appointment"}`,
            description: `Appointment payment`,
          },
          unit_amount: amount_cents,
        },
        quantity: 1,
      },
    ];

    let surchargeAmountCents = 0;
    if (surchargeEnabled) {
      surchargeAmountCents = Math.round(amount_cents * surchargeRate);
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Afterpay Processing Fee",
            description: `${parseFloat((surchargeRate * 100).toFixed(2))}% processing fee for Afterpay payment`,
          },
          unit_amount: surchargeAmountCents,
        },
        quantity: 1,
      });
    }

    // ── Create Stripe Checkout Session on Connected Account ──────
    const baseUrl = success_url || req.headers.get("origin") || "https://getzura.com";
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: paymentMethodTypes,
        line_items: lineItems,
        customer_email: client_email || undefined,
        metadata: {
          appointment_id,
          organization_id,
          source: "payment_link",
          fee_type: "send_to_pay",
          is_split: amount_cents < (body.original_amount_cents || amount_cents) ? "true" : "false",
          surcharge_amount_cents: surchargeAmountCents.toString(),
          surcharge_rate: surchargeRate.toString(),
        },
        success_url: success_url || `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url || `${baseUrl}/payment-cancelled`,
      },
      { stripeAccount: connectedAccountId }
    );

    // ── Update appointment with payment link ─────────────────────
    const isSplit = amount_cents < (body.original_amount_cents || amount_cents);
    const linkUpdate: Record<string, unknown> = {
      payment_link_url: session.url,
      payment_link_sent_at: new Date().toISOString(),
      payment_link_expires_at: new Date(session.expires_at * 1000).toISOString(),
    };
    if (isSplit) {
      linkUpdate.split_payment_link_intent_id = session.id;
    }
    await supabase
      .from("appointments")
      .update(linkUpdate)
      .eq("id", appointment_id);

    return jsonResponse({
      checkout_url: session.url,
      session_id: session.id,
      afterpay_available: paymentMethodTypes.includes("afterpay_clearpay"),
      surcharge_amount_cents: surchargeAmountCents,
    });
  } catch (error: any) {
    console.error("create-checkout-payment-link error:", error);
    return jsonResponse(
      { error: error.message || "An unexpected error occurred" },
      500
    );
  }
});
