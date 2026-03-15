import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Same price IDs as create-backroom-checkout
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

type PlanKey = keyof typeof BACKROOM_PLANS;

interface LocationPlan {
  location_id: string;
  plan_tier: PlanKey;
  scale_count: number;
}

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-ACTIVATE-BACKROOM] ${step}${d}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Authenticate caller
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

    const userId = userData.user.id;
    logStep("Authenticated", { userId });

    // Verify platform admin
    const { data: platformRole } = await supabase
      .from("platform_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (!platformRole) {
      return new Response(JSON.stringify({ error: "Platform admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep("Platform admin verified", { role: platformRole.role });

    const body = await req.json();
    const {
      organization_id,
      location_plans,
      billing_interval = "monthly",
    } = body as {
      organization_id: string;
      location_plans: LocationPlan[];
      billing_interval: string;
    };

    if (!organization_id) throw new Error("organization_id is required");
    if (!Array.isArray(location_plans) || location_plans.length === 0) {
      throw new Error("location_plans[] is required and must not be empty");
    }

    // Validate plan tiers
    for (const lp of location_plans) {
      if (!lp.location_id || !BACKROOM_PLANS[lp.plan_tier]) {
        throw new Error(`Invalid location plan: ${JSON.stringify(lp)}`);
      }
    }

    const isAnnual = billing_interval === "annual";
    logStep("Request parsed", { organization_id, locationCount: location_plans.length, billing_interval });

    // Get organization + stripe customer
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, slug, stripe_customer_id, billing_email")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) throw new Error("Organization not found");
    if (!org.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: "No payment method on file. The organization must have a Stripe customer with a card before admin activation." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Org found", { orgName: org.name, customerId: org.stripe_customer_id });

    // Verify customer has a default payment method
    const customer = await stripe.customers.retrieve(org.stripe_customer_id);
    if ((customer as any).deleted) throw new Error("Stripe customer has been deleted");

    const defaultPm =
      (customer as Stripe.Customer).invoice_settings?.default_payment_method ||
      (customer as Stripe.Customer).default_source;

    if (!defaultPm) {
      return new Response(
        JSON.stringify({ error: "Organization has no default payment method on file. They need to add a card first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    logStep("Payment method verified");

    // Build subscription items
    const tierCounts = new Map<PlanKey, number>();
    let totalScales = 0;
    for (const lp of location_plans) {
      tierCounts.set(lp.plan_tier, (tierCounts.get(lp.plan_tier) ?? 0) + 1);
      totalScales += lp.scale_count || 0;
    }

    const items: Stripe.SubscriptionCreateParams.Item[] = [];
    for (const [tier, qty] of tierCounts) {
      const plan = BACKROOM_PLANS[tier];
      const priceId = isAnnual ? plan.annual_price_id : plan.monthly_price_id;
      items.push({ price: priceId, quantity: qty });
    }

    if (totalScales > 0) {
      items.push({ price: SCALE_LICENSE_PRICE_ID, quantity: totalScales });
    }

    const primaryPlan = location_plans[0].plan_tier;
    const locationIds = location_plans.map((lp) => lp.location_id);

    logStep("Creating subscription", { items: items.length, totalScales });

    // Create subscription — charge immediately
    const subscription = await stripe.subscriptions.create({
      customer: org.stripe_customer_id,
      items,
      payment_behavior: "error_if_incomplete",
      metadata: {
        organization_id: org.id,
        addon_type: "backroom",
        backroom_plan: primaryPlan,
        scale_count: String(totalScales),
        billing_interval,
        location_ids: JSON.stringify(locationIds),
        location_plans: JSON.stringify(location_plans),
        activated_by_admin: userId,
      },
    });

    logStep("Subscription created", { subscriptionId: subscription.id, status: subscription.status });

    // Enable org feature flag
    await supabase.from("organization_feature_flags").upsert(
      {
        organization_id: org.id,
        flag_key: "backroom_enabled",
        is_enabled: true,
        override_reason: `Admin-activated by platform admin`,
      } as any,
      { onConflict: "organization_id,flag_key" }
    );
    logStep("Feature flag enabled");

    // Create location entitlements
    const refundEligibleUntil = new Date();
    refundEligibleUntil.setDate(refundEligibleUntil.getDate() + 30);

    for (const lp of location_plans) {
      await supabase.from("backroom_location_entitlements").upsert(
        {
          organization_id: org.id,
          location_id: lp.location_id,
          plan_tier: lp.plan_tier,
          scale_count: lp.scale_count || 0,
          status: "active",
          billing_interval,
          stripe_subscription_id: subscription.id,
          activated_at: new Date().toISOString(),
          activated_by: userId,
          refund_eligible_until: refundEligibleUntil.toISOString(),
        } as any,
        { onConflict: "organization_id,location_id" }
      );
    }
    logStep("Location entitlements created", { count: location_plans.length });

    // Audit log
    await supabase.from("platform_audit_log").insert({
      organization_id: org.id,
      user_id: userId,
      action: "admin_activate_backroom",
      entity_type: "backroom_subscription",
      entity_id: subscription.id as any,
      details: {
        billing_interval,
        location_plans,
        stripe_subscription_id: subscription.id,
        total_scales: totalScales,
      },
    } as any);
    logStep("Audit log recorded");

    return new Response(
      JSON.stringify({
        success: true,
        subscription_id: subscription.id,
        message: `Backroom activated for ${location_plans.length} location(s). Subscription charged to card on file.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[ADMIN-ACTIVATE-BACKROOM] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
