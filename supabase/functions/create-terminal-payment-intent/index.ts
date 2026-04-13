import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

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

const CreatePaymentIntentSchema = z.object({
  organization_id: z.string().uuid(),
  amount: z.number().int().min(50).max(99999999), // in cents
  currency: z.string().length(3).default("usd"),
  tip_amount: z.number().int().min(0).default(0),
  appointment_id: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.string()).optional(),
});

/**
 * create-terminal-payment-intent
 *
 * Creates a Stripe PaymentIntent with `card_present` payment method type
 * for in-person terminal collection, scoped to the org's Connected Account.
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Parse + validate body
    const rawBody = await req.json();
    const parsed = CreatePaymentIntentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        400
      );
    }

    const { organization_id, amount, currency, tip_amount, appointment_id, description, metadata } =
      parsed.data;

    // Verify org membership
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
        ["admin", "manager", "super_admin", "stylist"].includes(r.role)
      );
      if (!hasRole) {
        return jsonResponse({ error: "Insufficient permissions" }, 403);
      }
    }

    // B1 fix: use correct column name stripe_connect_account_id
    const { data: orgData } = await supabase
      .from("organizations")
      .select("stripe_connect_account_id")
      .eq("id", organization_id)
      .maybeSingle();

    if (!orgData?.stripe_connect_account_id) {
      return jsonResponse(
        { error: "Zura Pay is not connected for this organization" },
        400
      );
    }

    const stripeAccountId = orgData.stripe_connect_account_id;
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

    const totalAmount = amount + tip_amount;

    // Create PaymentIntent on the Connected Account
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: totalAmount,
        currency,
        payment_method_types: ["card_present"],
        capture_method: "automatic",
        description: description || "In-person checkout",
        metadata: {
          ...metadata,
          ...(appointment_id ? { appointment_id } : {}),
          tip_amount: String(tip_amount),
          created_by: user.id,
          source: "zura_scheduler",
        },
      },
      { stripeAccount: stripeAccountId }
    );

    return jsonResponse({
      success: true,
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      status: paymentIntent.status,
    });
  } catch (error) {
    console.error("create-terminal-payment-intent error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
