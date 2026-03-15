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

interface LocationPlan {
  location_id: string;
  plan_tier: PlanKey;
  stylist_count: number;
}

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

    const body = await req.json();
    const { organization_id, location_plans, scale_count = 0, billing_interval = 'monthly', success_url, cancel_url } = body;

    // Support both new location_plans[] and legacy plan+location_ids
    let resolvedLocationPlans: LocationPlan[] = [];

    if (Array.isArray(location_plans) && location_plans.length > 0) {
      // New per-location plan format
      for (const lp of location_plans) {
        if (!lp.location_id || !lp.plan_tier || !BACKROOM_PLANS[lp.plan_tier as PlanKey]) {
          throw new Error(`Invalid location plan: ${JSON.stringify(lp)}`);
        }
        resolvedLocationPlans.push({
          location_id: lp.location_id,
          plan_tier: lp.plan_tier as PlanKey,
          stylist_count: lp.stylist_count ?? 0,
        });
      }
    } else if (body.plan && body.location_ids) {
      // Legacy: single plan for all locations
      const plan = body.plan as PlanKey;
      if (!BACKROOM_PLANS[plan]) {
        throw new Error("Invalid plan. Must be one of: starter, professional, unlimited");
      }
      for (const locId of body.location_ids) {
        resolvedLocationPlans.push({ location_id: locId, plan_tier: plan, stylist_count: 0 });
      }
    } else {
      throw new Error("Either location_plans[] or plan+location_ids is required");
    }

    if (!organization_id) {
      throw new Error("organization_id is required");
    }

    const isAnnual = billing_interval === 'annual';
    const scaleQty = Math.max(0, Math.min(10, parseInt(scale_count) || 0));
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

    // Group locations by tier to create line items with quantities
    const tierCounts = new Map<PlanKey, number>();
    for (const lp of resolvedLocationPlans) {
      tierCounts.set(lp.plan_tier, (tierCounts.get(lp.plan_tier) ?? 0) + 1);
    }

    // Build line items - one per tier with quantity = number of locations on that tier
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    for (const [tier, qty] of tierCounts) {
      const plan = BACKROOM_PLANS[tier];
      const priceId = isAnnual ? plan.annual_price_id : plan.monthly_price_id;
      lineItems.push({ price: priceId, quantity: qty });
    }

    // Scale licenses (recurring)
    if (scaleQty > 0) {
      lineItems.push({ price: SCALE_LICENSE_PRICE_ID, quantity: scaleQty });
    }

    // Scale hardware (one-time) — reduced by 1 for annual plans
    if (hardwareQty > 0) {
      lineItems.push({ price: SCALE_HARDWARE_PRICE_ID, quantity: hardwareQty });
    }

    // Derive a single "primary" plan for backward compat in metadata
    const primaryPlan = resolvedLocationPlans.length > 0 ? resolvedLocationPlans[0].plan_tier : 'starter';
    const locationIds = resolvedLocationPlans.map((lp) => lp.location_id);

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
        backroom_plan: primaryPlan,
        scale_count: String(scaleQty),
        billing_interval: billing_interval,
        location_ids: JSON.stringify(locationIds),
        location_plans: JSON.stringify(resolvedLocationPlans),
      },
      subscription_data: {
        metadata: {
          organization_id: org.id,
          addon_type: "backroom",
          backroom_plan: primaryPlan,
          scale_count: String(scaleQty),
          billing_interval: billing_interval,
          location_ids: JSON.stringify(locationIds),
          location_plans: JSON.stringify(resolvedLocationPlans),
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
