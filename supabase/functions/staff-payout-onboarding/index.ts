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
    const { action, organization_id } = body;

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get org's Stripe secret key
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, stripe_connect_account_id")
      .eq("id", organization_id)
      .single();

    if (!org) {
      return new Response(JSON.stringify({ error: "Organization not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use platform Stripe key for Connect operations
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Derive app URL from request origin with fallback
    const allowedOrigins = ["https://getzura.com", "https://id-preview--b06a5744-64b6-4629-9f76-e0e2cb73ea52.lovable.app"];
    const requestOrigin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/+$/, "") || "";
    const appUrl = allowedOrigins.includes(requestOrigin) || requestOrigin.endsWith(".lovable.app")
      ? requestOrigin
      : Deno.env.get("APP_URL") || "https://getzura.com";

    if (action === "create_account") {
      // Check if account already exists
      const { data: existing } = await supabase
        .from("staff_payout_accounts")
        .select("id, stripe_account_id, stripe_status")
        .eq("organization_id", organization_id)
        .eq("user_id", user.id)
        .maybeSingle();

      let stripeAccountId: string;

      if (existing?.stripe_account_id) {
        stripeAccountId = existing.stripe_account_id;
      } else {
        // Get user profile for pre-fill
        const { data: profile } = await supabase
          .from("employee_profiles")
          .select("full_name, email, display_name")
          .eq("user_id", user.id)
          .maybeSingle();

        // Create Stripe Express Connected Account
        const account = await stripe.accounts.create({
          type: "express",
          country: "US",
          email: user.email || profile?.email || undefined,
          capabilities: {
            transfers: { requested: true },
          },
          business_type: "individual",
          settings: {
            payouts: {
              schedule: { interval: "manual" },
            },
          },
          metadata: {
            user_id: user.id,
            organization_id,
            platform: "zura",
          },
        });

        stripeAccountId = account.id;

        // Upsert staff_payout_accounts
        await supabase.from("staff_payout_accounts").upsert(
          {
            organization_id,
            user_id: user.id,
            stripe_account_id: stripeAccountId,
            stripe_status: "pending",
            charges_enabled: false,
            payouts_enabled: false,
            details_submitted: false,
          },
          { onConflict: "organization_id,user_id" }
        );
      }

      // Create onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${appUrl}/dashboard/my-pay?onboarding=refresh`,
        return_url: `${appUrl}/dashboard/my-pay?onboarding=complete`,
        type: "account_onboarding",
      });

      return new Response(
        JSON.stringify({
          onboarding_url: accountLink.url,
          account_id: stripeAccountId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "create_login_link") {
      const { data: account } = await supabase
        .from("staff_payout_accounts")
        .select("stripe_account_id")
        .eq("organization_id", organization_id)
        .eq("user_id", user.id)
        .single();

      if (!account?.stripe_account_id) {
        return new Response(JSON.stringify({ error: "No payout account found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const loginLink = await stripe.accounts.createLoginLink(account.stripe_account_id);

      return new Response(JSON.stringify({ login_url: loginLink.url }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify_status") {
      const { data: dbAccount } = await supabase
        .from("staff_payout_accounts")
        .select("stripe_account_id")
        .eq("organization_id", organization_id)
        .eq("user_id", user.id)
        .single();

      if (!dbAccount?.stripe_account_id) {
        return new Response(JSON.stringify({ error: "No payout account found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch latest from Stripe
      const stripeAccount = await stripe.accounts.retrieve(dbAccount.stripe_account_id);

      let newStatus = "pending";
      if (stripeAccount.charges_enabled && stripeAccount.payouts_enabled && stripeAccount.details_submitted) {
        newStatus = "active";
      } else if (stripeAccount.details_submitted && !stripeAccount.charges_enabled) {
        newStatus = "restricted";
      }

      // Get bank info
      const bankAccount = stripeAccount.external_accounts?.data?.find(
        (a: any) => a.object === "bank_account"
      ) as any;

      await supabase
        .from("staff_payout_accounts")
        .update({
          stripe_status: newStatus,
          charges_enabled: stripeAccount.charges_enabled || false,
          payouts_enabled: stripeAccount.payouts_enabled || false,
          details_submitted: stripeAccount.details_submitted || false,
          bank_last4: bankAccount?.last4 || null,
          bank_name: bankAccount?.bank_name || null,
        })
        .eq("organization_id", organization_id)
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({ status: newStatus, payouts_enabled: stripeAccount.payouts_enabled }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
