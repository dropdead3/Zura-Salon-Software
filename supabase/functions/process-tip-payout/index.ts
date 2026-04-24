import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@16.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { distribution_id, organization_id } = body;

    if (!distribution_id || !organization_id) {
      return new Response(
        JSON.stringify({ error: "distribution_id and organization_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is org admin
    const { data: isAdmin } = await supabase.rpc("is_org_admin", {
      _user_id: user.id,
      _org_id: organization_id,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get distribution
    const { data: dist, error: distError } = await supabase
      .from("tip_distributions")
      .select("*")
      .eq("id", distribution_id)
      .eq("organization_id", organization_id)
      .single();

    if (distError || !dist) {
      return new Response(JSON.stringify({ error: "Distribution not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (dist.status === "paid") {
      return new Response(JSON.stringify({ error: "Already paid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get staff payout account
    const { data: payoutAccount } = await supabase
      .from("staff_payout_accounts")
      .select("stripe_account_id, stripe_status, payouts_enabled")
      .eq("organization_id", organization_id)
      .eq("user_id", dist.stylist_user_id)
      .single();

    if (!payoutAccount?.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: "Staff member has no connected payout account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payoutAccount.payouts_enabled) {
      return new Response(
        JSON.stringify({ error: "Staff payout account is not verified for payouts" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get org's Stripe Connect account
    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_connect_account_id")
      .eq("id", organization_id)
      .single();

    if (!org?.stripe_connect_account_id) {
      return new Response(
        JSON.stringify({ error: "Organization has no payment account configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const amountCents = Math.round(Number(dist.total_tips) * 100);
    if (amountCents < 100) {
      return new Response(
        JSON.stringify({ error: "Minimum payout amount is $1.00" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create transfer from org's Connected Account to staff's account
    const transfer = await stripe.transfers.create(
      {
        amount: amountCents,
        currency: "usd",
        destination: payoutAccount.stripe_account_id,
        description: `Tip payout for ${dist.distribution_date}`,
        metadata: {
          distribution_id: dist.id,
          stylist_user_id: dist.stylist_user_id,
          organization_id,
          distribution_date: dist.distribution_date,
        },
      },
      {
        stripeAccount: org.stripe_connect_account_id,
        idempotencyKey: `tip_payout_${dist.id}`,
      }
    );

    // Update distribution as paid
    await supabase
      .from("tip_distributions")
      .update({
        status: "paid",
        method: "direct_deposit",
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        stripe_transfer_id: transfer.id,
      })
      .eq("id", distribution_id);

    console.log(`Tip payout processed: ${transfer.id} for distribution ${distribution_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        transfer_id: transfer.id,
        amount: amountCents / 100,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Payout error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
