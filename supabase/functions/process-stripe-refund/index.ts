import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { resolveConnectAccount } from "../_shared/resolve-connect-account.ts";

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
 * Accepts EITHER:
 *   - payment_intent_id directly, OR
 *   - original_transaction_id (resolves PI ID from phorest_sales_transactions or appointments)
 *
 * - amount: Refund amount in DOLLARS (converted to cents internally)
 * - organization_id: The org (to resolve Connected Account)
 * - refund_record_id: The local refund_records row to update on success
 * - reason?: 'requested_by_customer' | 'duplicate' | 'fraudulent'
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

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
    const { payment_intent_id, original_transaction_id, amount, organization_id, refund_record_id, reason } = body;

    if (!amount || !organization_id || !refund_record_id) {
      return jsonResponse({ error: "Missing required fields: amount, organization_id, refund_record_id" }, 400);
    }

    // B1: Resolve payment_intent_id from original_transaction_id if not provided directly
    let resolvedPiId = payment_intent_id;
    let locationId: string | null = null;

    if (!resolvedPiId && original_transaction_id) {
      // Try phorest_sales_transactions first
      const { data: txn } = await supabase
        .from("phorest_sales_transactions")
        .select("phorest_transaction_id")
        .eq("id", original_transaction_id)
        .single();

      if (txn?.phorest_transaction_id?.startsWith("pi_")) {
        resolvedPiId = txn.phorest_transaction_id;
      } else {
        // Fallback: look up from appointments table
        const { data: apt } = await supabase
          .from("appointments")
          .select("stripe_payment_intent_id, location_id")
          .eq("id", original_transaction_id)
          .single();

        if (apt?.stripe_payment_intent_id) {
          resolvedPiId = apt.stripe_payment_intent_id;
        }
        if (apt?.location_id) {
          locationId = apt.location_id;
        }
      }
    }

    if (!resolvedPiId) {
      return jsonResponse({
        error: "Could not resolve payment_intent_id. Provide payment_intent_id or a valid original_transaction_id."
      }, 400);
    }

    // Resolve Connect Account: location-first, then org fallback
    const stripeAccountId = await resolveConnectAccount(supabase, organization_id, locationId);

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

    // Convert amount from dollars to cents
    const amountCents = Math.round(amount * 100);

    // Issue refund on the Connected Account
    const refund = await stripe.refunds.create(
      {
        payment_intent: resolvedPiId,
        amount: amountCents,
        reason: reason || "requested_by_customer",
      },
      { stripeAccount: stripeAccountId }
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

    console.log(`Stripe refund ${refund.id} issued for PI ${resolvedPiId} (${amountCents} cents)`);

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