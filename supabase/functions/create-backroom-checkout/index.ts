import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Backroom pricing tiers
const BACKROOM_PLANS = {
  starter: {
    name: "Starter",
    monthly_price_id: "price_1TBK3IEUkhnzWpRkDJSYe1vj",
    annual_price_id: "price_1TBKCpEUkhnzWpRkqMPguboA",
    product_id: "prod_U9dJkcp3KNBItL",
  },
  professional: {
    name: "Professional",
    monthly_price_id: "price_1TBK49EUkhnzWpRkg0yFOwnZ",
    annual_price_id: "price_1TBKDNEUkhnzWpRk2FdXKWk9",
    product_id: "prod_U9dKsEb2qj6AOo",
  },
  unlimited: {
    name: "Unlimited",
    monthly_price_id: "price_1TBK5AEUkhnzWpRkoj0Nggwd",
    annual_price_id: "price_1TBKFzEUkhnzWpRkJY02bnW1",
    product_id: "prod_U9dL7r3Uck9Qqs",
  },
} as const;

const SCALE_LICENSE_PRICE_ID = "price_1TBK5pEUkhnzWpRkPMCKIAst";
const SCALE_HARDWARE_PRICE_ID = "price_1TBK6aEUkhnzWpRkjBYdCww0";

type PlanKey = keyof typeof BACKROOM_PLANS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { organization_id, plan, scale_count = 0, billing_interval = 'monthly', trial_days = 0, success_url, cancel_url } = await req.json();
    const validTrialDays = [7, 14].includes(trial_days) ? trial_days : 0;

    if (!organization_id) {
      throw new Error("organization_id is required");
    }

    if (!plan || !BACKROOM_PLANS[plan as PlanKey]) {
      throw new Error("Invalid plan. Must be one of: starter, professional, unlimited");
    }

    const isAnnual = billing_interval === 'annual';
    const selectedPlan = BACKROOM_PLANS[plan as PlanKey];
    const planPriceId = isAnnual ? selectedPlan.annual_price_id : selectedPlan.monthly_price_id;
    const scaleQty = Math.max(0, Math.min(10, parseInt(scale_count) || 0));

    // Annual plans get 1 free scale (hardware only, license still charged)
    const hardwareQty = isAnnual ? Math.max(0, scaleQty - 1) : scaleQty;

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, slug, stripe_customer_id, billing_email")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      throw new Error("Organization not found");
    }

    // Get or create Stripe customer
    let customerId = org.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        email: org.billing_email || userData.user.email,
        metadata: { organization_id: org.id, organization_slug: org.slug },
      });
      customerId = customer.id;

      await supabase
        .from("organizations")
        .update({ stripe_customer_id: customerId })
        .eq("id", org.id);
    }

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: planPriceId, quantity: 1 },
    ];

    // Scale licenses (recurring)
    if (scaleQty > 0) {
      lineItems.push({ price: SCALE_LICENSE_PRICE_ID, quantity: scaleQty });
    }

    // Scale hardware (one-time) — reduced by 1 for annual plans
    if (hardwareQty > 0) {
      lineItems.push({ price: SCALE_HARDWARE_PRICE_ID, quantity: hardwareQty });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: lineItems,
      success_url: success_url || `${req.headers.get("origin")}/dashboard/admin/backroom-settings?checkout=success`,
      cancel_url: cancel_url || `${req.headers.get("origin")}/dashboard/admin/backroom-settings?checkout=cancelled`,
      metadata: {
        organization_id: org.id,
        addon_type: "backroom",
        backroom_plan: plan,
        scale_count: String(scaleQty),
        billing_interval: billing_interval,
        trial_days: String(validTrialDays),
      },
      subscription_data: {
        ...(validTrialDays > 0 ? { trial_period_days: validTrialDays } : {}),
        metadata: {
          organization_id: org.id,
          addon_type: "backroom",
          backroom_plan: plan,
          scale_count: String(scaleQty),
          billing_interval: billing_interval,
        },
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
