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
 * Terminal Reader Display — Server-Driven Integration
 *
 * Controls the S710 reader display via the Stripe Terminal API.
 *
 * Actions:
 *   - set_reader_display: Show cart/line items on the reader screen
 *   - clear_reader_display: Clear the reader screen
 *   - process_payment: Initiate payment collection on the reader
 *   - cancel_action: Cancel in-progress reader action
 *   - check_reader_status: Poll reader state for payment completion
 *   - check_payment_intent: Verify PaymentIntent status directly (B4 fix)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return jsonResponse({ error: "Payment system not configured" }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey) as any;

    // Authenticate
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
    const { action, reader_id, organization_id } = body;

    if (!reader_id || !organization_id) {
      return jsonResponse({ error: "reader_id and organization_id are required" }, 400);
    }

    // Verify org membership via employee_profiles (org-scoped, prevents cross-tenant access)
    const { data: membership } = await supabase
      .from("employee_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("organization_id", organization_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!membership) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    // B2 fix: Query organizations.stripe_connect_account_id (same source as PI creation)
    const { data: orgData } = await supabase
      .from("organizations")
      .select("stripe_connect_account_id")
      .eq("id", organization_id)
      .maybeSingle();

    const stripeAccountId = orgData?.stripe_connect_account_id;

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });
    const stripeOpts = stripeAccountId ? { stripeAccount: stripeAccountId } : {};

    // ---- set_reader_display: Show cart on reader ----
    if (action === "set_reader_display") {
      const { line_items, currency = "usd" } = body;

      if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
        return jsonResponse({ error: "line_items array is required" }, 400);
      }

      const total = line_items.reduce(
        (sum: number, item: { amount: number; quantity?: number }) =>
          sum + item.amount * (item.quantity || 1),
        0
      );

      const readerAction = await stripe.terminal.readers.setReaderDisplay(
        reader_id,
        {
          type: "cart",
          cart: {
            line_items: line_items.map((item: { description: string; amount: number; quantity?: number }) => ({
              description: item.description,
              amount: item.amount,
              quantity: item.quantity || 1,
            })),
            tax: body.tax || 0,
            total: total + (body.tax || 0),
            currency,
          },
        },
        stripeOpts
      );

      return jsonResponse({ success: true, reader: readerAction });
    }

    // ---- clear_reader_display: Reset reader to default idle screen ----
    // NOTE: This uses the same Stripe method (cancelAction) as cancel_action below.
    // Stripe's Terminal API uses cancelAction for both clearing a display cart and
    // cancelling an in-progress payment collection. We keep them as separate actions
    // for semantic clarity: clear_reader_display = UI test cleanup, cancel_action = payment cancellation.
    if (action === "clear_reader_display") {
      const readerAction = await stripe.terminal.readers.cancelAction(
        reader_id,
        stripeOpts
      );
      return jsonResponse({ success: true, reader: readerAction });
    }

    // ---- process_payment: Collect payment on reader ----
    if (action === "process_payment") {
      const { payment_intent_id, tip_eligible_amount } = body;
      if (!payment_intent_id) {
        return jsonResponse({ error: "payment_intent_id is required" }, 400);
      }

      // When `tip_eligible_amount` (cents) is supplied, configure native
      // on-reader tipping. The S710 prompts the client for a tip computed
      // off the eligible base, then updates the PaymentIntent amount.
      const processArgs: Record<string, unknown> = { payment_intent: payment_intent_id };
      if (typeof tip_eligible_amount === "number" && tip_eligible_amount > 0) {
        processArgs.process_config = {
          tipping: { amount_eligible: tip_eligible_amount },
        };
      }

      const readerAction = await stripe.terminal.readers.processPaymentIntent(
        reader_id,
        processArgs as { payment_intent: string },
        stripeOpts
      );

      return jsonResponse({ success: true, reader: readerAction });
    }

    // ---- cancel_action: Cancel in-progress reader action ----
    if (action === "cancel_action") {
      const readerAction = await stripe.terminal.readers.cancelAction(
        reader_id,
        stripeOpts
      );
      return jsonResponse({ success: true, reader: readerAction });
    }

    // ---- check_reader_status: Poll reader state for payment completion ----
    if (action === "check_reader_status") {
      const reader = await stripe.terminal.readers.retrieve(
        reader_id,
        stripeOpts
      );
      return jsonResponse({
        success: true,
        reader: {
          id: reader.id,
          status: reader.status,
          action: reader.action,
          device_type: reader.device_type,
          label: reader.label,
        },
      });
    }

    // ---- check_payment_intent: Verify PI status directly (B4 fix) ----
    if (action === "check_payment_intent") {
      const { payment_intent_id } = body;
      if (!payment_intent_id) {
        return jsonResponse({ error: "payment_intent_id is required" }, 400);
      }

      const pi = await stripe.paymentIntents.retrieve(
        payment_intent_id,
        stripeOpts
      );

      // Final tip (in cents) — populated by Stripe when on-reader tipping was used.
      const tipFromMetadata = Number(pi.metadata?.tip_amount ?? 0);
      const tipFromAmountDetails =
        ((pi as unknown as { amount_details?: { tip?: { amount?: number } } })
          .amount_details?.tip?.amount) ?? null;
      const finalTipAmount =
        typeof tipFromAmountDetails === "number" ? tipFromAmountDetails : tipFromMetadata;

      return jsonResponse({
        success: true,
        payment_intent: {
          id: pi.id,
          status: pi.status,
          amount: pi.amount,
          amount_received: pi.amount_received,
          tip_amount: finalTipAmount,
          tip_mode: (pi.metadata?.tip_mode as string | undefined) ?? "app",
          payment_method_id:
            (pi.payment_method as string | null) ?? null,
        },
      });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (error: any) {
    console.error("Terminal reader display error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
