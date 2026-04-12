import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ── Constants ── */

const STRIPE_API_VERSION = "2024-12-18.acacia";
const STRIPE_CAPITAL_OFFERS_URL = "https://api.stripe.com/v1/capital/financing_offers?status=delivered&limit=10";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Input validation: accept optional body with dry_run flag
    let dryRun = false;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (typeof body.dry_run === "boolean") dryRun = body.dry_run;
      } catch {
        // No body or invalid JSON is fine — proceed with defaults
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get all organizations with capital_enabled = true
    const { data: enabledFlags, error: flagError } = await supabase
      .from("organization_feature_flags")
      .select("organization_id")
      .eq("flag_key", "capital_enabled")
      .eq("is_enabled", true);

    if (flagError) throw flagError;

    const orgIds = (enabledFlags || []).map((f: any) => f.organization_id);
    if (orgIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No capital-enabled organizations", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get locations with stripe_account_id for these orgs
    const { data: locations, error: locError } = await supabase
      .from("locations")
      .select("id, organization_id, stripe_account_id, name")
      .in("organization_id", orgIds)
      .not("stripe_account_id", "is", null)
      .eq("is_active", true);

    if (locError) throw locError;

    if (!locations || locations.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No locations with Stripe Connect accounts found",
          processed: 0,
          detail: "Capital detection requires locations to have a stripe_account_id configured.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let offersDetected = 0;
    let offersCreated = 0;
    const errors: string[] = [];

    // 3. For each location, check Stripe Capital for financing offers
    for (const loc of locations) {
      try {
        const stripeAccountId = loc.stripe_account_id;

        // Poll Stripe Capital API for financing offers on this connected account
        const stripeResponse = await fetch(STRIPE_CAPITAL_OFFERS_URL, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            "Stripe-Account": stripeAccountId,
            "Stripe-Version": STRIPE_API_VERSION,
          },
        });

        if (!stripeResponse.ok) {
          const errBody = await stripeResponse.text();
          // 403 or 404 may indicate Capital isn't enabled for this account
          if (stripeResponse.status === 403 || stripeResponse.status === 404) {
            console.log(`Capital not available for account ${stripeAccountId}: ${stripeResponse.status}`);
            continue;
          }
          errors.push(`Stripe error for ${stripeAccountId}: ${stripeResponse.status} ${errBody}`);
          continue;
        }

        const stripeData = await stripeResponse.json();
        const offers = stripeData?.data || [];

        for (const offer of offers) {
          offersDetected++;

          if (dryRun) continue;

          // Check if we already have this offer
          const { data: existing } = await supabase
            .from("capital_funding_opportunities")
            .select("id")
            .eq("organization_id", loc.organization_id)
            .eq("stripe_offer_id", offer.id)
            .maybeSingle();

          if (existing) continue;

          // Map Stripe offer to capital_funding_opportunities
          const offeredAmountCents = offer.offered_terms?.advance_amount ?? 0;
          const feeCents = offer.offered_terms?.advance_fee_flat_amount ?? 0;

          // locations.id is text type — store in provider_offer_details for reference
          const { error: insertError } = await supabase
            .from("capital_funding_opportunities")
            .insert({
              organization_id: loc.organization_id,
              location_id: null, // locations.id is text, opps.location_id is UUID — stored in provider_offer_details instead
              title: `Stripe Capital Offer — ${loc.name}`,
              opportunity_type: "stripe_capital",
              status: "identified",
              eligibility_status: "eligible_provider",
              constraint_type: "capital_access",
              required_investment_cents: offeredAmountCents,
              stripe_offer_id: offer.id,
              stripe_offer_available: true,
              provider_offer_details: {
                offered_amount_cents: offeredAmountCents,
                fee_amount_cents: feeCents,
                withhold_rate: offer.offered_terms?.advance_paid_out_amount
                  ? ((offeredAmountCents + feeCents - (offer.offered_terms?.advance_paid_out_amount ?? 0)) / (offeredAmountCents + feeCents))
                  : null,
                currency: offer.offered_terms?.currency ?? "usd",
                expires_after: offer.expires_after,
                stripe_status: offer.status,
                location_id_text: loc.id,
                location_name: loc.name,
                stripe_account_id: stripeAccountId,
              },
              expires_at: offer.expires_after
                ? new Date(offer.expires_after * 1000).toISOString()
                : null,
              roe_score: 0,
              confidence_score: 0,
              risk_level: "low",
              momentum_score: null,
            });

          if (insertError) {
            errors.push(`Insert error for offer ${offer.id}: ${insertError.message}`);
          } else {
            offersCreated++;
          }
        }
      } catch (locErr) {
        errors.push(`Error processing location ${loc.id}: ${(locErr as Error).message}`);
      }
    }

    // 4. Log summary
    console.log(`Detection complete: ${orgIds.length} orgs, ${locations.length} locations, ${offersDetected} offers found, ${offersCreated} created`);

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: dryRun,
        organizations_checked: orgIds.length,
        locations_checked: locations.length,
        offers_detected: offersDetected,
        offers_created: offersCreated,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("detect-capital-opportunities error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
