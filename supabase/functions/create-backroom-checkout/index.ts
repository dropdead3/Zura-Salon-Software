import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { organization_id, success_url, cancel_url } = await req.json();

    if (!organization_id) {
      throw new Error("organization_id is required");
    }

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

    // Find or create the Backroom product+price
    let priceId: string | undefined;

    // Search for existing product
    const products = await stripe.products.search({
      query: `metadata['type']:'backroom_addon'`,
    });

    if (products.data.length > 0) {
      const product = products.data[0];
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
        type: "recurring",
        limit: 1,
      });
      priceId = prices.data[0]?.id;
    }

    // Create product+price if not found
    if (!priceId) {
      const product = await stripe.products.create({
        name: "Zura Backroom",
        description: "Inventory intelligence, chemical tracking, and cost optimization for your salon backroom.",
        metadata: { type: "backroom_addon" },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: 4900, // $49/mo
        currency: "usd",
        recurring: { interval: "month" },
      });
      priceId = price.id;
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success_url || `${req.headers.get("origin")}/dashboard/admin/backroom-settings?checkout=success`,
      cancel_url: cancel_url || `${req.headers.get("origin")}/dashboard/admin/backroom-settings?checkout=cancelled`,
      metadata: {
        organization_id: org.id,
        addon_type: "backroom",
      },
      subscription_data: {
        metadata: {
          organization_id: org.id,
          addon_type: "backroom",
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
