import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

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
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { organization_id } = await req.json();
    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller belongs to this organization
    const { data: membership } = await supabase
      .from("employee_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("organization_id", organization_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden: not a member of this organization" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the org's connected Stripe account ID
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: org, error: orgError } = await serviceClient
      .from("organizations")
      .select("stripe_connect_account_id, stripe_connect_status")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: "Organization not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!org.stripe_connect_account_id || org.stripe_connect_status !== "active") {
      return new Response(
        JSON.stringify({ error: "Zura Pay is not active for this organization" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Payment provider not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const connectAccountId = org.stripe_connect_account_id;

    // Fetch balance and payouts in parallel
    const [balance, payouts] = await Promise.all([
      stripe.balance.retrieve({}, { stripeAccount: connectAccountId }),
      stripe.payouts.list({ limit: 25 }, { stripeAccount: connectAccountId }),
    ]);

    return new Response(
      JSON.stringify({
        balance: {
          available: balance.available,
          pending: balance.pending,
        },
        payouts: payouts.data.map((p: any) => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          arrival_date: p.arrival_date,
          created: p.created,
          method: p.method,
          type: p.type,
          description: p.description,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("zura-pay-payouts error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
