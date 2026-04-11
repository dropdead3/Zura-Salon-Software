import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Deterministic eligibility thresholds (mirror client-side config)
const THRESHOLDS = {
  minROE: 1.5,
  allowedConfidence: ["high", "medium"],
  allowedRisk: ["low", "moderate"],
  minCapitalRequired: 5000,
  allowedStatuses: ["identified", "evaluating"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

  const anonClient = createClient(supabaseUrl, anonKey);
  const serviceClient = createClient(supabaseUrl, serviceKey);

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { opportunityId, organizationId } = await req.json();
    if (!opportunityId || !organizationId) throw new Error("Missing opportunityId or organizationId");

    // Verify org admin
    const { data: isAdmin } = await serviceClient.rpc("is_org_admin", {
      _user_id: user.id,
      _org_id: organizationId,
    });
    if (!isAdmin) throw new Error("Only organization admins can initiate financing");

    // Load opportunity
    const { data: opp, error: oppErr } = await serviceClient
      .from("expansion_opportunities")
      .select("*")
      .eq("id", opportunityId)
      .eq("organization_id", organizationId)
      .single();
    if (oppErr || !opp) throw new Error("Opportunity not found");

    // Server-side eligibility re-validation
    const roe = Number(opp.capital_required) > 0
      ? Number(opp.predicted_annual_lift) / Number(opp.capital_required)
      : 0;
    const confidence = opp.confidence || "medium";
    const riskLevel = (opp.risk_factors as any)?.level ?? "moderate";
    const capital = Number(opp.capital_required);

    const failures: string[] = [];
    if (roe < THRESHOLDS.minROE) failures.push("ROE below threshold");
    if (!THRESHOLDS.allowedConfidence.includes(confidence)) failures.push("Confidence level ineligible");
    if (!THRESHOLDS.allowedRisk.includes(riskLevel)) failures.push("Risk level too high");
    if (capital < THRESHOLDS.minCapitalRequired) failures.push("Capital below minimum");

    if (failures.length > 0) {
      return new Response(JSON.stringify({ error: "Not eligible", reasons: failures }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Create Stripe checkout session
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Expansion Financing: ${opp.title}`,
              description: `Capital investment for ${opp.title}. ROE: ${roe.toFixed(1)}x`,
            },
            unit_amount: Math.round(capital * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        opportunity_id: opportunityId,
        organization_id: organizationId,
        type: "expansion_financing",
      },
      success_url: `${req.headers.get("origin")}/dashboard/capital?funded=true`,
      cancel_url: `${req.headers.get("origin")}/dashboard/capital`,
    });

    // Record financed project
    const breakEvenMonths = opp.break_even_months ?? 12;
    const targetCompletion = new Date();
    targetCompletion.setMonth(targetCompletion.getMonth() + Number(breakEvenMonths));

    await serviceClient.from("financed_projects").insert({
      organization_id: organizationId,
      opportunity_id: opportunityId,
      stripe_checkout_session_id: session.id,
      funded_amount: capital,
      predicted_annual_lift: Number(opp.predicted_annual_lift),
      predicted_break_even_months: Number(breakEvenMonths),
      roe_at_funding: Math.round(roe * 100) / 100,
      confidence_at_funding: confidence,
      risk_level_at_funding: riskLevel,
      status: "pending_payment",
      repayment_total: capital,
      repayment_remaining: capital,
      target_completion_at: targetCompletion.toISOString(),
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
