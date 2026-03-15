import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SCALE_LICENSE_PRICE_ID = "price_1TBK5pEUkhnzWpRkPMCKIAst";

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

    const { organization_id } = await req.json();
    if (!organization_id) throw new Error("organization_id required");

    const { data: org } = await supabase
      .from("organizations")
      .select("id, stripe_customer_id")
      .eq("id", organization_id)
      .single();

    if (!org?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ subscribed: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: org.stripe_customer_id,
      status: "active",
      limit: 10,
    });

    const backroomSub = subscriptions.data.find(
      (s) => (s.metadata as Record<string, string>)?.addon_type === "backroom"
    );

    if (!backroomSub) {
      return new Response(
        JSON.stringify({ subscribed: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const meta = backroomSub.metadata as Record<string, string>;
    const scaleItem = backroomSub.items.data.find(
      (item) => item.price.id === SCALE_LICENSE_PRICE_ID
    );

    // Calculate monthly cost from items
    let monthlyCost = 0;
    for (const item of backroomSub.items.data) {
      const unitAmount = (item.price.unit_amount || 0) / 100;
      const qty = item.quantity || 1;
      const interval = item.price.recurring?.interval;
      if (interval === "year") {
        monthlyCost += (unitAmount * qty) / 12;
      } else {
        monthlyCost += unitAmount * qty;
      }
    }

    return new Response(
      JSON.stringify({
        subscribed: true,
        plan: meta.backroom_plan || "starter",
        billing_interval: meta.billing_interval || "monthly",
        scale_count: parseInt(meta.scale_count || "0", 10),
        scale_licenses: scaleItem?.quantity || 0,
        status: backroomSub.status,
        current_period_end: new Date(backroomSub.current_period_end * 1000).toISOString(),
        monthly_cost: Math.round(monthlyCost * 100) / 100,
        subscription_id: backroomSub.id,
      }),
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
