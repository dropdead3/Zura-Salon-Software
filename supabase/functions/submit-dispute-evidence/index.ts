import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  dispute_id: z.string().uuid("dispute_id must be a valid UUID"),
  organization_id: z.string().uuid("organization_id must be a valid UUID"),
  cancellation_policy_disclosure: z.string().max(5000).optional(),
  cancellation_rebuttal: z.string().max(5000).optional(),
  uncategorized_text: z.string().max(10000).optional(),
  submit: z.boolean().default(true),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate JWT using getClaims
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await anonClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate request body
    const rawBody = await req.json();
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      dispute_id,
      organization_id,
      cancellation_policy_disclosure,
      cancellation_rebuttal,
      uncategorized_text,
      submit,
    } = parsed.data;

    // Service-role client for DB writes
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the dispute record — include status for fallback
    const { data: disputeRecord, error: fetchError } = await supabase
      .from("payment_disputes")
      .select("stripe_dispute_id, status, metadata")
      .eq("id", dispute_id)
      .eq("organization_id", organization_id)
      .single();

    if (fetchError || !disputeRecord) {
      return new Response(JSON.stringify({ error: "Dispute not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeDisputeId = disputeRecord.stripe_dispute_id;
    const connectedAccount = disputeRecord.metadata?.connected_account;

    // Build Stripe evidence params
    const evidenceParams = new URLSearchParams();
    if (cancellation_policy_disclosure) {
      evidenceParams.append("evidence[cancellation_policy_disclosure]", cancellation_policy_disclosure);
    }
    if (cancellation_rebuttal) {
      evidenceParams.append("evidence[cancellation_rebuttal]", cancellation_rebuttal);
    }
    if (uncategorized_text) {
      evidenceParams.append("evidence[uncategorized_text]", uncategorized_text);
    }
    if (submit) {
      evidenceParams.append("submit", "true");
    }

    // Call Stripe API to update dispute with evidence
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    };
    if (connectedAccount) {
      headers["Stripe-Account"] = connectedAccount;
    }

    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/disputes/${stripeDisputeId}`,
      {
        method: "POST",
        headers,
        body: evidenceParams.toString(),
      }
    );

    const stripeResult = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error("Stripe dispute update failed:", stripeResult);
      return new Response(JSON.stringify({ error: stripeResult.error?.message || "Failed to submit evidence" }), {
        status: stripeResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update local record
    await supabase
      .from("payment_disputes")
      .update({
        evidence_submitted_at: new Date().toISOString(),
        status: submit ? "under_review" : disputeRecord.status,
      })
      .eq("id", dispute_id);

    console.log(`Evidence ${submit ? "submitted" : "staged"} for dispute ${stripeDisputeId}`);

    return new Response(JSON.stringify({ success: true, submitted: submit }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error submitting dispute evidence:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
