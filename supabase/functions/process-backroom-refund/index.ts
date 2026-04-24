import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PROCESS-BACKROOM-REFUND] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey) as any;

  try {
    // 1. Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");
    logStep("Authenticated", { userId: user.id });

    const { organization_id, location_id } = await req.json();
    if (!organization_id || !location_id) throw new Error("Missing organization_id or location_id");

    // 2. Verify caller is platform admin or org admin
    const { data: isAdmin } = await supabase.rpc("is_org_admin", {
      _user_id: user.id,
      _org_id: organization_id,
    });
    const { data: isPlatform } = await supabase.rpc("is_platform_user", {
      _user_id: user.id,
    });
    if (!isAdmin && !isPlatform) throw new Error("Forbidden: requires admin access");
    logStep("Authorization verified");

    // 3. Look up entitlement
    const { data: ent, error: entErr } = await supabase
      .from("backroom_location_entitlements")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("location_id", location_id)
      .single();
    if (entErr || !ent) throw new Error("Entitlement not found");

    // Validate refund eligibility
    if (ent.refunded_at) throw new Error("Already refunded");
    if (!ent.refund_eligible_until || new Date(ent.refund_eligible_until) <= new Date()) {
      throw new Error("Refund window has expired");
    }

    logStep("Entitlement validated", {
      status: ent.status,
      stripeSubId: ent.stripe_subscription_id,
      refundEligibleUntil: ent.refund_eligible_until,
    });

    // 4. Stripe operations
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let refundAmount = 0;
    const subId = ent.stripe_subscription_id;

    if (subId) {
      // Cancel subscription immediately
      await stripe.subscriptions.cancel(subId, {
        prorate: false,
        invoice_now: false,
      });
      logStep("Subscription cancelled", { subId });

      // Find latest paid invoice for this subscription
      const invoices = await stripe.invoices.list({
        subscription: subId,
        status: "paid",
        limit: 1,
      });

      if (invoices.data.length > 0 && invoices.data[0].payment_intent) {
        const paymentIntentId =
          typeof invoices.data[0].payment_intent === "string"
            ? invoices.data[0].payment_intent
            : invoices.data[0].payment_intent.id;

        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
        });
        refundAmount = refund.amount / 100; // convert cents to dollars
        logStep("Refund issued", { refundId: refund.id, amount: refundAmount });
      } else {
        logStep("No paid invoice found for refund — subscription cancelled only");
      }
    } else {
      logStep("No stripe_subscription_id — updating entitlement status only");
    }

    // 5. Update entitlement
    const { error: updateErr } = await supabase
      .from("backroom_location_entitlements")
      .update({
        status: "refunded",
        refunded_at: new Date().toISOString(),
        refunded_by: user.id,
        prior_refund_count: (ent.prior_refund_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organization_id)
      .eq("location_id", location_id);

    if (updateErr) throw new Error("Failed to update entitlement: " + updateErr.message);
    logStep("Entitlement updated to refunded");

    // 6. Audit log
    await supabase.from("platform_audit_log").insert({
      organization_id,
      user_id: user.id,
      action: "backroom_refund_processed",
      entity_type: "backroom_location_entitlement",
      entity_id: ent.id,
      details: {
        location_id,
        refund_amount: refundAmount,
        stripe_subscription_id: subId || null,
        prior_refund_count: (ent.prior_refund_count || 0) + 1,
      },
    });
    logStep("Audit log created");

    return new Response(
      JSON.stringify({
        success: true,
        refund_amount: refundAmount,
        message: `Refund of $${refundAmount.toFixed(2)} processed. Access revoked.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
