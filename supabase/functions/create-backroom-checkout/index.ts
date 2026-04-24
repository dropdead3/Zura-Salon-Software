import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Flat pricing: $20/mo per location
const BACKROOM_LOCATION_PRICE_ID = "price_1TBPh6EUkhnzWpRkFzJ7LeL7";

// Usage-based: $0.50/color service (metered)
const BACKROOM_USAGE_PRICE_ID = "price_1TBPidEUkhnzWpRkh2zE6G25";

const SCALE_LICENSE_PRICE_ID = "price_1TBK5pEUkhnzWpRkPMCKIAst";
const SCALE_HARDWARE_PRICE_ID = "price_1TBK6aEUkhnzWpRkjBYdCww0";

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[create-backroom-checkout] ${step}${d}`);
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

    const supabase = createClient(supabaseUrl, supabaseKey) as any;
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep("Authenticated user", { userId: userData.user.id });

    const body = await req.json();
    const { organization_id, location_ids, scale_count = 0, success_url, cancel_url } = body;

    // Support legacy location_plans format
    let resolvedLocationIds: string[] = [];
    if (Array.isArray(location_ids) && location_ids.length > 0) {
      resolvedLocationIds = location_ids;
    } else if (Array.isArray(body.location_plans)) {
      resolvedLocationIds = body.location_plans.map((lp: any) => lp.location_id);
    } else {
      throw new Error("location_ids[] is required");
    }

    if (!organization_id) throw new Error("organization_id is required");
    if (resolvedLocationIds.length === 0) throw new Error("At least one location is required");

    const scaleQty = Math.max(0, Math.min(10, parseInt(scale_count) || 0));
    logStep("Checkout params", { organization_id, locations: resolvedLocationIds.length, scaleQty });

    // Get organization details + hardware price in parallel
    const [orgResult, hardwarePriceResult] = await Promise.all([
      supabase
        .from("organizations")
        .select("id, name, slug, stripe_customer_id, billing_email")
        .eq("id", organization_id)
        .single(),
      scaleQty > 0
        ? stripe.prices.retrieve(SCALE_HARDWARE_PRICE_ID)
        : Promise.resolve(null),
    ]);

    const { data: org, error: orgError } = orgResult;
    if (orgError || !org) throw new Error("Organization not found");

    // Get or create Stripe customer
    let customerId = org.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        email: org.billing_email || userData.user.email,
        metadata: { organization_id: org.id, organization_slug: org.slug },
      });
      customerId = customer.id;
      logStep("Created Stripe customer", { customerId });

      await supabase
        .from("organizations")
        .update({ stripe_customer_id: customerId })
        .eq("id", org.id);
    } else {
      logStep("Existing Stripe customer", { customerId });
    }

    // Build line items — recurring subscription items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: BACKROOM_LOCATION_PRICE_ID, quantity: resolvedLocationIds.length },
      { price: BACKROOM_USAGE_PRICE_ID, quantity: 1 },
    ];

    // Scale licenses (recurring)
    if (scaleQty > 0) {
      lineItems.push({ price: SCALE_LICENSE_PRICE_ID, quantity: scaleQty });
    }

    logStep("Line items built", { count: lineItems.length, scaleQty });

    const sharedMetadata = {
      organization_id: org.id,
      addon_type: "backroom",
      color_bar_plan: "standard",
      scale_count: String(scaleQty),
      billing_interval: "monthly",
      location_ids: JSON.stringify(resolvedLocationIds),
    };

    // Add one-time hardware as pending invoice item (attaches to first subscription invoice)
    if (scaleQty > 0 && hardwarePriceResult) {
      const unitAmount = hardwarePriceResult.unit_amount ?? 19900;
      await stripe.invoiceItems.create({
        customer: customerId,
        pricing: { price: SCALE_HARDWARE_PRICE_ID },
        quantity: scaleQty,
        description: `Precision Scale hardware × ${scaleQty}`,
      });
      logStep("Added one-time hardware invoice item", { scaleQty, unitAmount });
    }

    // Create Checkout Session (subscription mode — recurring items only)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: lineItems,
      success_url: success_url || `${req.headers.get("origin")}/dashboard/admin/color-bar-settings?checkout=success`,
      cancel_url: cancel_url || `${req.headers.get("origin")}/dashboard/admin/color-bar-settings?checkout=cancelled`,
      metadata: sharedMetadata,
      subscription_data: {
        metadata: sharedMetadata,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[create-backroom-checkout] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
