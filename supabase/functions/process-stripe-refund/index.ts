import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";

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

/**
 * Process Stripe Refund — issues a refund via Stripe for card-present payments
 *
 * Expects:
 *   - payment_intent_id: The Stripe PaymentIntent ID to refund
 *   - amount: Refund amount in cents
 *   - organization_id: The org (to resolve Connected Account)
 *   - refund_record_id: The local refund_records row to update on success
 *   - reason?: 'requested_by_customer' | 'duplicate' | 'fraudulent'
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeSecretKey) {
      return jsonResponse({ error: "Stripe not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Role check
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const userRoles = (roles || []).map((r: { role: string }) => r.role);
    const allowed = ["admin", "manager", "super_admin"];
    if (!userRoles.some((r: string) => allowed.includes(r))) {
      return jsonResponse({ error: "Insufficient permissions" }, 403);
    }

    const body = await req.json();
    const { payment_intent_id, amount, organization_id, refund_record_id, reason } = body;

    if (!payment_intent_id || !amount || !organization_id || !refund_record_id) {
      return jsonResponse({ error: "Missing required fields: payment_intent_id, amount, organization_id, refund_record_id" }, 400);
    }

    // Resolve Connected Account
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("stripe_connect_account_id")
      .eq("id", organization_id)
      .single();

    if (orgError || !orgData?.stripe_connect_account_id) {
      return jsonResponse({ error: "Zura Pay is not connected for this organization" }, 400);
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

    // Issue refund on the Connected Account
    const refund = await stripe.refunds.create(
      {
        payment_intent: payment_intent_id,
        amount, // in cents
        reason: reason || "requested_by_customer",
      },
      { stripeAccount: orgData.stripe_connect_account_id }
    );

    // Update local refund record
    const { error: updateError } = await supabase
      .from("refund_records")
      .update({
        status: "completed",
        processed_by: user.id,
        processed_at: new Date().toISOString(),
        notes: `Stripe refund ID: ${refund.id}`,
      })
      .eq("id", refund_record_id);

    if (updateError) {
      console.error("Refund issued but failed to update local record:", updateError);
    }

    console.log(`Stripe refund ${refund.id} issued for PI ${payment_intent_id} (${amount} cents)`);

    return jsonResponse({
      success: true,
      stripe_refund_id: refund.id,
      status: refund.status,
    });
  } catch (error: unknown) {
    console.error("Refund error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 400);
  }
});
