// Creates a Stripe Checkout session for the Zura Reputation subscription ($49/mo).
// On checkout.session.completed the platform stripe-webhook upserts a reputation_subscriptions
// row, which flips the reputation_enabled flag via the sync_reputation_entitlement trigger.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REPUTATION_PRICE_ID = "price_1TSrTTEUkhnzWpRkUScYmGoO";
const TRIAL_DAYS = 14;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const { organization_id } = await req.json();
    if (!organization_id) throw new Error("organization_id required");

    // Authorize: caller must be an org admin
    const { data: isAdmin } = await supabase.rpc("is_org_admin", {
      _user_id: user.id,
      _org_id: organization_id,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, slug, stripe_customer_id")
      .eq("id", organization_id)
      .single();
    if (!org) throw new Error("Organization not found");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    let customerId = org.stripe_customer_id as string | null;
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    }
    if (!customerId) {
      const created = await stripe.customers.create({
        email: user.email!,
        name: org.name,
        metadata: { organization_id: org.id, organization_slug: org.slug },
      });
      customerId = created.id;
      await supabase
        .from("organizations")
        .update({ stripe_customer_id: customerId })
        .eq("id", org.id);
    }

    const origin = req.headers.get("origin") || "https://getzura.com";
    const session = await stripe.checkout.sessions.create({
      customer: customerId!,
      mode: "subscription",
      line_items: [{ price: REPUTATION_PRICE_ID, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          addon_type: "reputation",
          organization_id: org.id,
        },
      },
      metadata: {
        addon_type: "reputation",
        organization_id: org.id,
      },
      success_url: `${origin}/org/${org.slug}/dashboard/admin/feedback?reputation=success`,
      cancel_url: `${origin}/org/${org.slug}/dashboard/apps?reputation=canceled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[create-reputation-checkout]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
