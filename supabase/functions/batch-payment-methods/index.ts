import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify platform user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check platform role
    const { data: platformRole } = await supabase
      .from("platform_roles")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!platformRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { stripe_customer_ids } = await req.json();

    if (!Array.isArray(stripe_customer_ids) || stripe_customer_ids.length === 0) {
      return new Response(JSON.stringify({ payment_methods: {} }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap batch size
    const ids = stripe_customer_ids.slice(0, 100);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const results = await Promise.allSettled(
      ids.map(async (customerId: string) => {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const defaultPmId =
          (customer as any).invoice_settings?.default_payment_method ||
          (customer as any).default_source;

        if (!defaultPmId) return { customerId, pm: null };

        if (typeof defaultPmId === "string" && defaultPmId.startsWith("pm_")) {
          const pm = await stripe.paymentMethods.retrieve(defaultPmId);
          if (pm.card) {
            return {
              customerId,
              pm: { brand: pm.card.brand, last4: pm.card.last4 },
            };
          }
        }

        // Fallback: list payment methods
        const pms = await stripe.paymentMethods.list({
          customer: customerId,
          type: "card",
          limit: 1,
        });

        if (pms.data.length > 0 && pms.data[0].card) {
          return {
            customerId,
            pm: { brand: pms.data[0].card.brand, last4: pms.data[0].card.last4 },
          };
        }

        return { customerId, pm: null };
      })
    );

    const paymentMethods: Record<string, { brand: string; last4: string } | null> = {};
    for (const result of results) {
      if (result.status === "fulfilled") {
        paymentMethods[result.value.customerId] = result.value.pm;
      }
    }

    return new Response(JSON.stringify({ payment_methods: paymentMethods }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("batch-payment-methods error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
