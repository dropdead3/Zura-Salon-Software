import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
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

const CreatePaymentIntentSchema = z.object({
  organization_id: z.string().uuid(),
  location_id: z.string().optional(),
  amount: z.number().int().min(50).max(99999999), // in cents
  currency: z.string().length(3).default("usd"),
  tip_amount: z.number().int().min(0).default(0),
  appointment_id: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.string()).optional(),
  /**
   * When true, configure the PaymentIntent so the S710 reader prompts the
   * client for a tip on-device (Stripe-native tipping). The supplied
   * `amount` should be the pre-tip subtotal in cents — the reader UI
   * computes percentages off `amount_eligible`.
   */
  collect_tip_on_reader: z.boolean().optional().default(false),
});

/**
 * create-terminal-payment-intent
 *
 * Creates a Stripe PaymentIntent with `card_present` payment method type
 * for in-person terminal collection, scoped to the location's or org's Connected Account.
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

    const {
      organization_id,
      location_id,
      amount,
      currency,
      tip_amount,
      appointment_id,
      description,
      metadata,
      collect_tip_on_reader,
    } = parsed.data;

    // Look up client email for receipt and resolve location from appointment
    let receiptEmail: string | null = null;
    let resolvedLocationId = location_id || null;
    if (appointment_id) {
      const { data: appt } = await supabase
        .from("appointments")
        .select("client_email, location_id")
        .eq("id", appointment_id)
        .maybeSingle();
      if (appt?.client_email) {
        receiptEmail = appt.client_email;
      }
      if (!resolvedLocationId && appt?.location_id) {
        resolvedLocationId = appt.location_id;
      }
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

    // Resolve Connect account: location-first, then org fallback
    const stripeAccountId = await resolveConnectAccount(supabase, organization_id, resolvedLocationId);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

    // When tipping is collected on-reader, the PaymentIntent is created with
    // the pre-tip subtotal; the reader updates `amount` after the client
    // selects a tip and the captured PI reflects the final total.
    const totalAmount = collect_tip_on_reader ? amount : amount + tip_amount;

    // Create PaymentIntent on the Connected Account
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: totalAmount,
        currency,
        payment_method_types: ["card_present"],
        capture_method: "automatic",
        description: description || "In-person checkout",
        ...(receiptEmail ? { receipt_email: receiptEmail } : {}),
        metadata: {
          ...metadata,
          ...(appointment_id ? { appointment_id } : {}),
          tip_amount: String(collect_tip_on_reader ? 0 : tip_amount),
          tip_mode: collect_tip_on_reader ? "reader" : "app",
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
      collect_tip_on_reader,
      // Surface the pre-tip subtotal so the caller can pass it as
      // `amount_eligible` into terminal-reader-display when tipping on reader.
      tip_eligible_amount: collect_tip_on_reader ? amount : 0,
    });
  } catch (error: any) {
    console.error("create-terminal-payment-intent error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});