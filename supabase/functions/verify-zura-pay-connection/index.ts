import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

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

const RequestSchema = z.object({
  organization_id: z.string().uuid("organization_id must be a valid UUID"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey) as any;
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

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

    // Validate input
    const rawBody = await req.json();
    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid request", details: parsed.error.flatten().fieldErrors }, 400);
    }
    const { organization_id } = parsed.data;

    // Verify caller is org member
    const isMember = await supabase.rpc("is_org_member", {
      _user_id: user.id,
      _org_id: organization_id,
    });
    if (!isMember.data) {
      return jsonResponse({ error: "Not a member of this organization" }, 403);
    }

    // Get org's payment connect account
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

    // Retrieve the account from payment processor
    const account = await stripe.accounts.retrieve(org.stripe_connect_account_id, {
      expand: ['external_accounts'],
    });

    // Extract bank account last4 for display
    const bankLast4 = account.external_accounts?.data?.[0]?.last4 || null;

    const newStatus = account.charges_enabled ? "active" : "pending";

    // Update org status if changed
    if (org.stripe_connect_status !== newStatus) {
      const { count, error: updateError } = await supabase
        .from("organizations")
        .update({ stripe_connect_status: newStatus })
        .eq("id", organization_id)
        .select('id', { count: 'exact', head: true });
      if (updateError) {
        console.error("Failed to update org connect status:", updateError);
      } else if (count === 0) {
        console.warn(`verify-zura-pay: update matched 0 rows for org ${organization_id}`);
      }
    }

    // Auto-connect single-location orgs when status transitions to active
    let auto_connected_location_id: string | null = null;
    if (newStatus === "active" && org.stripe_connect_status !== "active") {
      const { data: unconnectedLocs } = await supabase
        .from("locations")
        .select("id")
        .eq("organization_id", organization_id)
        .is("stripe_account_id", null)
        .eq("is_active", true);

      if (unconnectedLocs?.length === 1) {
        const { error: locErr } = await supabase
          .from("locations")
          .update({
            stripe_account_id: org.stripe_connect_account_id,
            stripe_status: "active",
            stripe_payments_enabled: true,
            stripe_connect_status: "active",
          })
          .eq("id", unconnectedLocs[0].id);

        if (locErr) {
          console.error("Auto-connect location failed:", locErr);
        } else {
          auto_connected_location_id = unconnectedLocs[0].id;
          console.log(`Auto-connected location ${auto_connected_location_id} for org ${organization_id}`);
        }
      }
    }

    return jsonResponse({
      status: newStatus,
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
      payouts_enabled: account.payouts_enabled,
      account_id: org.stripe_connect_account_id,
      auto_connected_location_id,
      bank_last4: bankLast4,
    });
  } catch (error: any) {
    console.error("verify-zura-pay-connection error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
