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
 * Reconcile Till — Cross-references local appointment records against Stripe PaymentIntents.
 *
 * Actions:
 *   - reconcile_daily: Fetch Stripe PIs for a date and compare with local records
 *   - collect_deposit: Create a pre-auth (uncaptured) PI for a deposit
 *   - capture_deposit: Capture a previously held deposit PI
 *   - cancel_deposit: Cancel/release a held deposit PI
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

    // Auth
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
    const { action, organization_id } = body;

    if (!organization_id) {
      return jsonResponse({ error: "organization_id required" }, 400);
    }

    // Resolve Connected Account
    const { data: orgData } = await supabase
      .from("organizations")
      .select("stripe_connect_account_id")
      .eq("id", organization_id)
      .single();

    const stripeAccountId = orgData?.stripe_connect_account_id;

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

    switch (action) {
      case "reconcile_daily": {
        if (!stripeAccountId) {
          return jsonResponse({ error: "Zura Pay not connected" }, 400);
        }

        const { date } = body; // YYYY-MM-DD
        if (!date) return jsonResponse({ error: "date required" }, 400);

        // Build time range for the date (UTC)
        const dayStart = Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);
        const dayEnd = Math.floor(new Date(`${date}T23:59:59Z`).getTime() / 1000);

        // Fetch Stripe PIs for this date on the Connected Account
        const stripePIs: Stripe.PaymentIntent[] = [];
        let hasMore = true;
        let startingAfter: string | undefined;

        while (hasMore) {
          const params: Stripe.PaymentIntentListParams = {
            created: { gte: dayStart, lte: dayEnd },
            limit: 100,
          };
          if (startingAfter) params.starting_after = startingAfter;

          const page = await stripe.paymentIntents.list(params, {
            stripeAccount: stripeAccountId,
          });

          stripePIs.push(...page.data);
          hasMore = page.has_more;
          if (page.data.length > 0) {
            startingAfter = page.data[page.data.length - 1].id;
          }
        }

        // Fetch local appointments with stripe_payment_intent_id for the date
        const { data: localAppointments } = await supabase
          .from("appointments")
          .select("id, stripe_payment_intent_id, payment_status, payment_method, total_price, tip_amount")
          .eq("appointment_date", date)
          .not("stripe_payment_intent_id", "is", null);

        const localPIIds = new Set((localAppointments || []).map((a: any) => a.stripe_payment_intent_id));

        // Categorize
        const succeeded = stripePIs.filter(pi => pi.status === "succeeded");
        const totalStripeAmount = succeeded.reduce((sum, pi) => sum + pi.amount, 0); // cents
        const totalStripeTips = succeeded.reduce((sum, pi) => {
          const tipMeta = pi.metadata?.tip_amount;
          return sum + (tipMeta ? parseInt(tipMeta, 10) : 0);
        }, 0);

        // Find unmatched PIs (in Stripe but not in local records)
        const unmatchedPIs = succeeded
          .filter(pi => !localPIIds.has(pi.id))
          .map(pi => ({
            id: pi.id,
            amount: pi.amount,
            created: pi.created,
            status: pi.status,
            metadata: pi.metadata,
          }));

        // Find local records with PIs not in Stripe (data integrity issue)
        const stripePIIds = new Set(stripePIs.map(pi => pi.id));
        const orphanedLocal = (localAppointments || [])
          .filter((a: any) => a.stripe_payment_intent_id && !stripePIIds.has(a.stripe_payment_intent_id))
          .map((a: any) => ({
            appointment_id: a.id,
            stripe_payment_intent_id: a.stripe_payment_intent_id,
            local_status: a.payment_status,
          }));

        return jsonResponse({
          success: true,
          date,
          stripe: {
            total_payments: succeeded.length,
            total_amount_cents: totalStripeAmount,
            total_tips_cents: totalStripeTips,
            net_amount_cents: totalStripeAmount - totalStripeTips,
          },
          local: {
            matched_count: localAppointments?.length || 0,
          },
          discrepancies: {
            unmatched_stripe: unmatchedPIs,
            orphaned_local: orphanedLocal,
          },
          is_reconciled: unmatchedPIs.length === 0 && orphanedLocal.length === 0,
        });
      }

      case "collect_deposit": {
        if (!stripeAccountId) {
          return jsonResponse({ error: "Zura Pay not connected" }, 400);
        }

        const { amount, appointment_id, reader_id, description } = body;
        if (!amount || !appointment_id) {
          return jsonResponse({ error: "amount and appointment_id required" }, 400);
        }

        // Create an uncaptured PaymentIntent (pre-auth hold)
        const piParams: Stripe.PaymentIntentCreateParams = {
          amount, // cents
          currency: body.currency || "usd",
          capture_method: "manual", // Key: this creates a hold, not an immediate charge
          metadata: {
            appointment_id,
            type: "deposit",
            organization_id,
          },
          description: description || "Appointment deposit",
        };

        const pi = await stripe.paymentIntents.create(piParams, {
          stripeAccount: stripeAccountId,
        });

        // If a reader_id is provided, process on the reader
        if (reader_id) {
          await stripe.terminal.readers.processPaymentIntent(
            reader_id,
            { payment_intent: pi.id },
            { stripeAccount: stripeAccountId }
          );
        }

        // Update appointment with deposit info
        await supabase
          .from("appointments")
          .update({
            deposit_required: true,
            deposit_amount: amount / 100,
            deposit_status: "held",
            deposit_stripe_payment_id: pi.id,
          })
          .eq("id", appointment_id);

        return jsonResponse({
          success: true,
          payment_intent_id: pi.id,
          amount,
          status: pi.status, // requires_capture
        });
      }

      case "capture_deposit": {
        if (!stripeAccountId) {
          return jsonResponse({ error: "Zura Pay not connected" }, 400);
        }

        const { payment_intent_id, capture_amount } = body;
        if (!payment_intent_id) {
          return jsonResponse({ error: "payment_intent_id required" }, 400);
        }

        // Capture the held deposit (optionally with a different amount)
        const captureParams: Stripe.PaymentIntentCaptureParams = {};
        if (capture_amount) captureParams.amount_to_capture = capture_amount;

        const captured = await stripe.paymentIntents.capture(
          payment_intent_id,
          captureParams,
          { stripeAccount: stripeAccountId }
        );

        // Update appointment
        await supabase
          .from("appointments")
          .update({
            deposit_status: "captured",
            deposit_collected_at: new Date().toISOString(),
            deposit_applied_to_total: true,
          })
          .match({ deposit_stripe_payment_id: payment_intent_id });

        return jsonResponse({
          success: true,
          status: captured.status,
          amount_captured: captured.amount_received,
        });
      }

      case "cancel_deposit": {
        if (!stripeAccountId) {
          return jsonResponse({ error: "Zura Pay not connected" }, 400);
        }

        const { payment_intent_id: cancelPiId } = body;
        if (!cancelPiId) {
          return jsonResponse({ error: "payment_intent_id required" }, 400);
        }

        const cancelled = await stripe.paymentIntents.cancel(cancelPiId, {}, {
          stripeAccount: stripeAccountId,
        });

        await supabase
          .from("appointments")
          .update({
            deposit_status: "released",
          })
          .match({ deposit_stripe_payment_id: cancelPiId });

        return jsonResponse({
          success: true,
          status: cancelled.status,
        });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error: unknown) {
    console.error("reconcile-till error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 400);
  }
});
