import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SCALE_LICENSE_PRICE_ID = "price_1TBK5pEUkhnzWpRkPMCKIAst";
const SCALE_HARDWARE_PRICE_ID = "price_1TBK6aEUkhnzWpRkjBYdCww0";

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
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Auth
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

    const { organization_id, additional_scales } = await req.json();
    if (!organization_id || !additional_scales || additional_scales < 1) {
      throw new Error("organization_id and additional_scales (>= 1) required");
    }
    const qty = Math.min(10, Math.max(1, parseInt(additional_scales)));

    // Get org's Stripe customer
    const { data: org } = await supabase
      .from("organizations")
      .select("id, stripe_customer_id")
      .eq("id", organization_id)
      .single();

    if (!org?.stripe_customer_id) {
      throw new Error("No active billing account found");
    }

    // Find existing color bar subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: org.stripe_customer_id,
      status: "active",
      limit: 10,
    });

    const colorBarSub = subscriptions.data.find(
      (s) => (s.metadata as Record<string, string>)?.addon_type === "backroom"
    );

    if (!colorBarSub) {
      throw new Error("No active Color Bar subscription found");
    }

    // Check if scale license item already exists on the subscription
    const existingLicenseItem = colorBarSub.items.data.find(
      (item) => item.price.id === SCALE_LICENSE_PRICE_ID
    );

    if (existingLicenseItem) {
      // Update quantity
      await stripe.subscriptionItems.update(existingLicenseItem.id, {
        quantity: (existingLicenseItem.quantity || 0) + qty,
      });
    } else {
      // Add new line item
      await stripe.subscriptionItems.create({
        subscription: colorBarSub.id,
        price: SCALE_LICENSE_PRICE_ID,
        quantity: qty,
      });
    }

    // Create a one-time checkout for hardware
    const hardwareSession = await stripe.checkout.sessions.create({
      customer: org.stripe_customer_id,
      mode: "payment",
      line_items: [{ price: SCALE_HARDWARE_PRICE_ID, quantity: qty }],
      success_url: `${req.headers.get("origin")}/dashboard/admin/backroom-subscription?scales=added`,
      cancel_url: `${req.headers.get("origin")}/dashboard/admin/backroom-subscription`,
      metadata: {
        organization_id: org.id,
        addon_type: "backroom_scale_hardware",
        scale_count: String(qty),
      },
    });

    // Update scale count in metadata
    const currentScales = parseInt(colorBarSub.metadata?.scale_count || "0", 10);
    await stripe.subscriptions.update(colorBarSub.id, {
      metadata: {
        ...colorBarSub.metadata,
        scale_count: String(currentScales + qty),
      },
    });

    // Update feature flag
    await supabase
      .from("organization_feature_flags")
      .upsert({
        organization_id: org.id,
        flag_key: "color_bar_plan",
        is_enabled: true,
        override_reason: JSON.stringify({
          plan: colorBarSub.metadata?.color_bar_plan || "professional",
          scale_count: currentScales + qty,
          billing_interval: colorBarSub.metadata?.billing_interval || "monthly",
        }),
        updated_at: new Date().toISOString(),
      }, { onConflict: "organization_id,flag_key" });

    return new Response(
      JSON.stringify({ url: hardwareSession.url, licenses_added: qty }),
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
