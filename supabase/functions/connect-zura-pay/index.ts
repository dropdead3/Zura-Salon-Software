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
    const { action, organization_id, location_id, return_url, refresh_url } = body;

    if (!organization_id) {
      return jsonResponse({ error: "organization_id is required" }, 400);
    }

    // Verify caller is org admin
    const isAdmin = await supabase.rpc("is_org_admin", {
      _user_id: user.id,
      _org_id: organization_id,
    });
    if (!isAdmin.data) {
      return jsonResponse({ error: "Must be an organization admin" }, 403);
    }

    // Get org
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name, stripe_connect_account_id, stripe_connect_status")
      .eq("id", organization_id)
      .single();
    if (orgErr || !org) {
      return jsonResponse({ error: "Organization not found" }, 404);
    }

    if (action === "create_account_and_link") {
      let accountId = org.stripe_connect_account_id;

      // Create Express account if none exists
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          business_type: "company",
          metadata: {
            organization_id: organization_id,
            platform: "zura",
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });
        accountId = account.id;

        // Store on org
        const { error: updateErr } = await supabase
          .from("organizations")
          .update({
            stripe_connect_account_id: accountId,
            stripe_connect_status: "pending",
          })
          .eq("id", organization_id);

        if (updateErr) {
          console.error("Failed to update org:", updateErr);
          return jsonResponse({ error: "Failed to save account" }, 500);
        }
      }

      // Create Account Link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refresh_url || `${req.headers.get("origin") || "https://app.getzura.com"}/dashboard/admin/settings?tab=terminals&zura_pay_refresh=true`,
        return_url: return_url || `${req.headers.get("origin") || "https://app.getzura.com"}/dashboard/admin/settings?tab=terminals&zura_pay_return=true`,
        type: "account_onboarding",
      });

      return jsonResponse({
        onboarding_url: accountLink.url,
        account_id: accountId,
        status: "pending",
      });
    }

    if (action === "connect_location") {
      if (!location_id) {
        return jsonResponse({ error: "location_id is required" }, 400);
      }

      // Org must have active connect account
      if (org.stripe_connect_status !== "active" || !org.stripe_connect_account_id) {
        return jsonResponse({ error: "Organization Stripe account is not yet active. Complete onboarding first." }, 400);
      }

      // Update the location with the org's stripe account
      const { error: locErr, count } = await supabase
        .from("locations")
        .update({
          stripe_account_id: org.stripe_connect_account_id,
          stripe_status: "active",
          stripe_payments_enabled: true,
        })
        .eq("id", location_id)
        .eq("organization_id", organization_id);

      if (locErr) {
        console.error("Failed to update location:", locErr);
        return jsonResponse({ error: "Failed to connect location" }, 500);
      }

      if (count === 0) {
        return jsonResponse({ error: "Location not found or does not belong to this organization" }, 404);
      }

      return jsonResponse({ success: true });
    }

    if (action === "get_onboarding_link") {
      // Re-generate an Account Link for an existing account
      if (!org.stripe_connect_account_id) {
        return jsonResponse({ error: "No Stripe account exists for this organization. Use create_account_and_link first." }, 400);
      }

      const accountLink = await stripe.accountLinks.create({
        account: org.stripe_connect_account_id,
        refresh_url: refresh_url || `${req.headers.get("origin") || "https://app.getzura.com"}/dashboard/admin/settings?tab=terminals&zura_pay_refresh=true`,
        return_url: return_url || `${req.headers.get("origin") || "https://app.getzura.com"}/dashboard/admin/settings?tab=terminals&zura_pay_return=true`,
        type: "account_onboarding",
      });

      return jsonResponse({
        onboarding_url: accountLink.url,
        account_id: org.stripe_connect_account_id,
      });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("connect-zura-pay error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
