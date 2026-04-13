import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { organization_id } = body;

    if (!organization_id) {
      return jsonResponse({ error: "organization_id is required" }, 400);
    }

    // Verify caller is org member
    const isMember = await supabase.rpc("is_org_member", {
      _user_id: user.id,
      _org_id: organization_id,
    });
    if (!isMember.data) {
      return jsonResponse({ error: "Not a member of this organization" }, 403);
    }

    // Get org's stripe connect account
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, stripe_connect_account_id, stripe_connect_status")
      .eq("id", organization_id)
      .single();

    if (orgErr || !org) {
      return jsonResponse({ error: "Organization not found" }, 404);
    }

    if (!org.stripe_connect_account_id) {
      return jsonResponse({
        status: "not_connected",
        charges_enabled: false,
        details_submitted: false,
        payouts_enabled: false,
      });
    }

    // Retrieve the Stripe account
    const account = await stripe.accounts.retrieve(org.stripe_connect_account_id);

    const newStatus = account.charges_enabled ? "active" : "pending";

    // Update org status if changed
    if (org.stripe_connect_status !== newStatus) {
      await supabase
        .from("organizations")
        .update({ stripe_connect_status: newStatus })
        .eq("id", organization_id);
    }

    return jsonResponse({
      status: newStatus,
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
      payouts_enabled: account.payouts_enabled,
      account_id: org.stripe_connect_account_id,
    });
  } catch (error) {
    console.error("verify-zura-pay-connection error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
