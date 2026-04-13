import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

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
 * This is the server-driven approach: your POS backend sends commands
 * to the reader through Stripe's API, and the reader renders the UI.
 *
 * For full custom branding (splash screens, animations), use the
 * "Apps on Devices" approach with an Android APK deployed to the reader.
 *
 * Actions:
 *   - set_reader_display: Show cart/line items on the reader screen
 *   - clear_reader_display: Clear the reader screen
 *   - process_payment: Initiate payment collection on the reader
 *   - cancel_action: Cancel in-progress reader action
 *
 * Docs: https://docs.stripe.com/terminal/payments/collect-payment?terminal-sdk-platform=server-driven
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
    const supabase = createClient(supabaseUrl, serviceKey);

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

    // Verify org access — must be admin/manager
    const { data: membership } = await supabase
      .from("organization_admins")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const hasRole = roles?.some((r: { role: string }) =>
        ["admin", "manager", "super_admin"].includes(r.role)
      );
      if (!hasRole) {
        return jsonResponse({ error: "Admin or manager role required" }, 403);
      }
    }

    // Get the connected account's stripe_account_id for the reader's location
    // Readers are always scoped to a location → org
    const { data: locData } = await supabase
      .from("locations")
      .select("stripe_account_id")
      .eq("organization_id", organization_id)
      .not("stripe_account_id", "is", null)
      .limit(1)
      .maybeSingle();

    const stripeAccountId = locData?.stripe_account_id;

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });
    const stripeOpts = stripeAccountId ? { stripeAccount: stripeAccountId } : {};

    // ---- set_reader_display: Show cart on reader ----
    if (action === "set_reader_display") {
      const { line_items, currency = "usd" } = body;

      if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
        return jsonResponse({ error: "line_items array is required" }, 400);
      }

      // Build the cart object for the reader display
      // Stripe expects: { type: 'cart', cart: { line_items: [...], tax, total, currency } }
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

    // ---- clear_reader_display: Reset to default ----
    if (action === "clear_reader_display") {
      const readerAction = await stripe.terminal.readers.clearReaderDisplay(
        reader_id,
        stripeOpts
      );
      return jsonResponse({ success: true, reader: readerAction });
    }

    // ---- process_payment: Collect payment on reader ----
    if (action === "process_payment") {
      const { payment_intent_id } = body;
      if (!payment_intent_id) {
        return jsonResponse({ error: "payment_intent_id is required" }, 400);
      }

      const readerAction = await stripe.terminal.readers.processPaymentIntent(
        reader_id,
        { payment_intent: payment_intent_id },
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

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("Terminal reader display error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
