// Applies the Reputation retention coupon ($20 off for 3 months, coupon
// `l1tzNWQq`) to the org's active Reputation subscription. Surfaces the
// "save offer" inline in Feedback Hub before the operator clicks through to
// the Stripe Billing Portal cancel flow.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RETENTION_COUPON_ID = "l1tzNWQq";

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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { organization_id } = await req.json();
    if (!organization_id) throw new Error("organization_id required");

    const { data: isAdmin } = await supabase.rpc("is_org_admin", {
      _user_id: userData.user.id,
      _org_id: organization_id,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: sub } = await supabase
      .from("reputation_subscriptions")
      .select("stripe_subscription_id, retention_coupon_applied_at")
      .eq("organization_id", organization_id)
      .maybeSingle();
    if (!sub?.stripe_subscription_id) throw new Error("No active Reputation subscription");
    if (sub.retention_coupon_applied_at) {
      return new Response(JSON.stringify({ error: "Save offer already redeemed" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      coupon: RETENTION_COUPON_ID,
    });

    await supabase
      .from("reputation_subscriptions")
      .update({ retention_coupon_applied_at: new Date().toISOString() })
      .eq("organization_id", organization_id);

    console.log(`[reputation-retention-coupon] applied ${RETENTION_COUPON_ID} to ${sub.stripe_subscription_id}`);

    return new Response(JSON.stringify({ ok: true, coupon: RETENTION_COUPON_ID }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[reputation-retention-coupon]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
