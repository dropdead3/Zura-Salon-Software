// Creates a Stripe Billing Portal session for the org's Reputation subscription.
// Lets subscribed orgs self-serve cancel, update card, swap plan from the
// Feedback Hub instead of waiting on Stripe email receipts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const { organization_id } = await req.json();
    if (!organization_id) throw new Error("organization_id required");

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

    // Prefer the customer ID stored on the reputation subscription (set by webhook).
    // Fall back to the org-level stripe_customer_id.
    const { data: sub } = await supabase
      .from("reputation_subscriptions")
      .select("stripe_customer_id")
      .eq("organization_id", organization_id)
      .maybeSingle();

    let customerId = sub?.stripe_customer_id as string | null;
    if (!customerId) {
      const { data: org } = await supabase
        .from("organizations")
        .select("slug, stripe_customer_id")
        .eq("id", organization_id)
        .single();
      customerId = org?.stripe_customer_id ?? null;
    }
    if (!customerId) throw new Error("No Stripe customer for this organization");

    const { data: org } = await supabase
      .from("organizations")
      .select("slug")
      .eq("id", organization_id)
      .single();

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const origin = req.headers.get("origin") || "https://getzura.com";
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/org/${org?.slug ?? ""}/dashboard/admin/feedback`,
    });

    return new Response(JSON.stringify({ url: portal.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[reputation-customer-portal]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
