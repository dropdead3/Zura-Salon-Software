import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const THRESHOLDS = {
  minROE: 1.5,
  maxRisk: ["low", "moderate", "medium"],
  minCapitalCents: 500_000,
  maxConcurrentProjects: 2,
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
    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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

    // Duplicate guard: check capital_funding_projects
    const { data: existingProject } = await serviceClient
      .from("capital_funding_projects")
      .select("id")
      .eq("funding_opportunity_id", opportunityId)
      .limit(1);

    if (existingProject && existingProject.length > 0) {
      return new Response(JSON.stringify({ error: "A funding project already exists for this opportunity" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    // Also check legacy financed_projects
    const { data: legacyPending } = await serviceClient
      .from("financed_projects")
      .select("id")
      .eq("opportunity_id", opportunityId)
      .eq("organization_id", organizationId)
      .eq("status", "pending_payment")
      .limit(1);

    if (legacyPending && legacyPending.length > 0) {
      return new Response(JSON.stringify({ error: "A financing request is already pending" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    // Load from capital_funding_opportunities first, fallback to expansion_opportunities
    let opp: any = null;
    let isProductionOpp = false;

    const { data: capitalOpp } = await serviceClient
      .from("capital_funding_opportunities")
      .select("*")
      .eq("id", opportunityId)
      .eq("organization_id", organizationId)
      .single();

    if (capitalOpp) {
      opp = capitalOpp;
      isProductionOpp = true;
    } else {
      const { data: legacyOpp, error: oppErr } = await serviceClient
        .from("expansion_opportunities")
        .select("*")
        .eq("id", opportunityId)
        .eq("organization_id", organizationId)
        .single();
      if (oppErr || !legacyOpp) throw new Error("Opportunity not found");
      opp = legacyOpp;
    }

    // Server-side eligibility
    const failures: string[] = [];

    if (isProductionOpp) {
      const roe = Number(opp.roe_score);
      const riskLevel = opp.risk_level || "medium";
      const capitalCents = Number(opp.required_investment_cents);

      if (roe < THRESHOLDS.minROE) failures.push("ROE below threshold");
      if (!THRESHOLDS.maxRisk.includes(riskLevel)) failures.push("Risk level too high");
      if (capitalCents < THRESHOLDS.minCapitalCents) failures.push("Capital below minimum");
    } else {
      const roe = Number(opp.capital_required) > 0
        ? Number(opp.predicted_annual_lift) / Number(opp.capital_required) : 0;
      const riskLevel = (opp.risk_factors as any)?.level ?? "moderate";
      const capital = Number(opp.capital_required);

      if (roe < THRESHOLDS.minROE) failures.push("ROE below threshold");
      if (!THRESHOLDS.maxRisk.includes(riskLevel)) failures.push("Risk level too high");
      if (capital < THRESHOLDS.minCapitalCents / 100) failures.push("Capital below minimum");
    }

    // Concurrent project check across both tables
    const { data: activeCapital } = await serviceClient
      .from("capital_funding_projects")
      .select("id")
      .eq("organization_id", organizationId)
      .in("status", ["active", "on_track", "above_forecast", "below_forecast", "at_risk"]);

    const { data: activeLegacy } = await serviceClient
      .from("financed_projects")
      .select("id")
      .eq("organization_id", organizationId)
      .in("status", ["active", "pending_payment"]);

    const totalActive = (activeCapital?.length ?? 0) + (activeLegacy?.length ?? 0);
    if (totalActive >= THRESHOLDS.maxConcurrentProjects) {
      failures.push("Maximum concurrent funded projects reached");
    }

    if (failures.length > 0) {
      return new Response(JSON.stringify({ error: "Not eligible", reasons: failures }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Create Stripe checkout
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const capitalCents = isProductionOpp
      ? Number(opp.required_investment_cents)
      : Math.round(Number(opp.capital_required) * 100);

    const title = opp.title || "Growth Funding";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Capital Investment: ${title}`,
              description: `Growth funding for ${title}`,
            },
            unit_amount: capitalCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        opportunity_id: opportunityId,
        organization_id: organizationId,
        user_id: user.id,
        type: "zura_capital",
        is_production: isProductionOpp ? "true" : "false",
      },
      success_url: `${req.headers.get("origin")}/dashboard/capital?funded=true`,
      cancel_url: `${req.headers.get("origin")}/dashboard/capital`,
    });

    // Create capital_funding_projects record if production opportunity
    if (isProductionOpp) {
      const coverageRatio = opp.provider_offer_amount_cents
        ? Number(opp.provider_offer_amount_cents) / capitalCents
        : 1.0;

      await serviceClient.from("capital_funding_projects").insert({
        organization_id: organizationId,
        funding_opportunity_id: opportunityId,
        provider: "stripe",
        provider_offer_id: session.id,
        funded_amount_cents: capitalCents,
        required_investment_cents: capitalCents,
        coverage_ratio: Math.round(coverageRatio * 10000) / 10000,
        funding_start_date: new Date().toISOString().split("T")[0],
        repayment_status: "not_started",
        estimated_total_repayment_cents: capitalCents,
        expected_monthly_payment_cents: Math.round(capitalCents / Math.max(1, Number(opp.break_even_months_expected) || 12)),
        status: "active",
        activation_status: "pending",
      });

      // Update opportunity status
      await serviceClient
        .from("capital_funding_opportunities")
        .update({
          status: "initiated",
          eligibility_status: "surfaced",
          initiated_at: new Date().toISOString(),
        })
        .eq("id", opportunityId);
    } else {
      // Legacy path
      const breakEvenMonths = opp.break_even_months ?? 12;
      const targetCompletion = new Date();
      targetCompletion.setMonth(targetCompletion.getMonth() + Number(breakEvenMonths));

      await serviceClient.from("financed_projects").insert({
        organization_id: organizationId,
        opportunity_id: opportunityId,
        stripe_checkout_session_id: session.id,
        funded_amount: capitalCents / 100,
        predicted_annual_lift: Number(opp.predicted_annual_lift),
        predicted_break_even_months: Number(breakEvenMonths),
        roe_at_funding: Number(opp.roe_score),
        confidence_at_funding: opp.confidence || "medium",
        risk_level_at_funding: (opp.risk_factors as any)?.level ?? "moderate",
        status: "pending_payment",
        repayment_total: capitalCents / 100,
        repayment_remaining: capitalCents / 100,
        target_completion_at: targetCompletion.toISOString(),
        funding_source: "stripe",
        estimated_total_repayment: capitalCents / 100,
        expected_monthly_payment: Math.round((capitalCents / 100) / Number(breakEvenMonths)),
      });
    }

    // Log event
    await serviceClient.from("capital_event_log").insert({
      organization_id: organizationId,
      user_id: user.id,
      opportunity_id: opportunityId,
      funding_opportunity_id: isProductionOpp ? opportunityId : null,
      event_type: "funding_initiated",
      surface_area: "capital_queue",
      metadata_json: { stripe_session_id: session.id, is_production: isProductionOpp },
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
