import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.95.0/cors';

const SCORE_WEIGHTS = {
  reviewDominance: 0.30,
  contentDominance: 0.20,
  pageStrength: 0.20,
  conversionStrength: 0.15,
  competitorSuppression: 0.15,
};

const MARKET_DEMAND_FACTOR = 2.5;
const MIN_DEMAND = 5000;

type Strategy = 'attack' | 'expand' | 'defend' | 'abandon';

function assignStrategy(score: number, momentumDir?: string, demand?: number): Strategy {
  if (score >= 80 && momentumDir !== 'losing') return 'defend';
  if (score >= 60 && score <= 79 && momentumDir === 'gaining') return 'expand';
  if (score <= 39 && (demand ?? 0) < MIN_DEMAND) return 'abandon';
  if (score >= 40) return 'attack';
  return 'abandon';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey) as any;

    const { organization_id } = await req.json();
    if (!organization_id) {
      return new Response(JSON.stringify({ error: 'organization_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch active targets
    const { data: targets, error: tErr } = await supabase
      .from('seo_domination_targets')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('is_active', true);

    if (tErr) throw tErr;
    if (!targets || targets.length === 0) {
      return new Response(JSON.stringify({ scored: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch locations for city matching
    const { data: locations } = await supabase
      .from('locations')
      .select('id, name, city')
      .eq('organization_id', organization_id)
      .eq('is_active', true);

    // Fetch latest health scores
    const { data: healthScores } = await supabase
      .from('seo_health_scores')
      .select('seo_object_id, domain, score, raw_signals')
      .eq('organization_id', organization_id)
      .order('scored_at', { ascending: false });

    // Fetch SEO objects
    const { data: seoObjects } = await supabase
      .from('seo_objects')
      .select('id, label, object_type, location_id, parent_object_id, metadata')
      .eq('organization_id', organization_id)
      .eq('is_active', true);

    // Build location-city map
    const locationCityMap: Record<string, string> = {};
    for (const loc of locations ?? []) {
      locationCityMap[loc.id] = (loc.city ?? '').toLowerCase();
    }

    // Dedupe health scores: latest per object-domain
    const latestHealth = new Map<string, { score: number; raw_signals: any }>();
    for (const h of healthScores ?? []) {
      const key = `${h.seo_object_id}::${h.domain}`;
      if (!latestHealth.has(key)) latestHealth.set(key, { score: h.score, raw_signals: h.raw_signals });
    }

    let scored = 0;

    for (const target of targets) {
      const cityLower = target.city.toLowerCase();
      const serviceLower = target.service_category.toLowerCase();

      // Find contributing locations by city match
      const contributingLocationIds = (locations ?? [])
        .filter((l: any) => (l.city ?? '').toLowerCase() === cityLower)
        .map((l: any) => l.id);

      // Find matching SEO objects (in contributing locations, matching service category in label/metadata)
      const matchingObjects = (seoObjects ?? []).filter((o: any) => {
        if (!contributingLocationIds.includes(o.location_id)) return false;
        const label = (o.label ?? '').toLowerCase();
        const meta = o.metadata ?? {};
        return label.includes(serviceLower) || (meta.service_category ?? '').toLowerCase() === serviceLower;
      });

      const competitorObjects = (seoObjects ?? []).filter((o: any) => {
        if (o.object_type !== 'competitor') return false;
        if (!contributingLocationIds.includes(o.location_id)) return false;
        const label = (o.label ?? '').toLowerCase();
        return label.includes(serviceLower);
      });

      // Aggregate health scores
      let pageScores: number[] = [];
      let conversionScores: number[] = [];
      let competitorGapScores: number[] = [];
      let orgReviewCount = 0;
      let competitorReviewCount = 0;
      let orgContentPages = 0;
      let competitorContentPages = 0;

      for (const obj of matchingObjects) {
        const pageH = latestHealth.get(`${obj.id}::page`);
        if (pageH) pageScores.push(pageH.score);

        const convH = latestHealth.get(`${obj.id}::conversion`);
        if (convH) conversionScores.push(convH.score);

        const gapH = latestHealth.get(`${obj.id}::competitive_gap`);
        if (gapH) competitorGapScores.push(gapH.score);

        const reviewH = latestHealth.get(`${obj.id}::review`);
        if (reviewH?.raw_signals) {
          orgReviewCount += Number(reviewH.raw_signals.review_velocity_30d ?? 0);
        }

        const contentH = latestHealth.get(`${obj.id}::content`);
        if (contentH) orgContentPages++;
      }

      for (const obj of competitorObjects) {
        const reviewH = latestHealth.get(`${obj.id}::review`);
        if (reviewH?.raw_signals) {
          competitorReviewCount += Number(reviewH.raw_signals.review_velocity_30d ?? 0);
        }
        competitorContentPages++;
      }

      // Compute component scores
      const totalReviews = orgReviewCount + competitorReviewCount;
      const reviewDominance = totalReviews > 0 ? Math.round((orgReviewCount / totalReviews) * 100) : 0;

      const totalContent = orgContentPages + competitorContentPages;
      const contentDominance = totalContent > 0 ? Math.round((orgContentPages / totalContent) * 100) : 0;

      const avgPage = pageScores.length > 0 ? Math.round(pageScores.reduce((a: any, b: any) => a + b, 0) / pageScores.length) : 0;
      const avgConversion = conversionScores.length > 0 ? Math.round(conversionScores.reduce((a: any, b: any) => a + b, 0) / conversionScores.length) : 0;
      const avgGap = competitorGapScores.length > 0 ? Math.round(competitorGapScores.reduce((a: any, b: any) => a + b, 0) / competitorGapScores.length) : 0;
      const competitorSuppression = Math.max(0, 100 - avgGap);

      const dominationScore = Math.round(
        reviewDominance * SCORE_WEIGHTS.reviewDominance +
        contentDominance * SCORE_WEIGHTS.contentDominance +
        avgPage * SCORE_WEIGHTS.pageStrength +
        avgConversion * SCORE_WEIGHTS.conversionStrength +
        competitorSuppression * SCORE_WEIGHTS.competitorSuppression,
      );

      const visibleMarketShare = totalReviews > 0 ? orgReviewCount / totalReviews : 0;
      const avgTicket = 150; // Default; could be parameterized
      const estimatedMarketDemand = totalReviews * avgTicket * MARKET_DEMAND_FACTOR;
      const capturedRevenueShare = estimatedMarketDemand > 0 ? Math.min(1, 0) : 0; // Revenue data would come from attribution

      const strategyState = assignStrategy(dominationScore, undefined, estimatedMarketDemand);

      // Upsert score
      const { error: upsertErr } = await supabase
        .from('seo_domination_scores')
        .insert({
          organization_id,
          target_id: target.id,
          domination_score: dominationScore,
          review_dominance: reviewDominance,
          content_dominance: contentDominance,
          page_strength: avgPage,
          conversion_strength: avgConversion,
          competitor_suppression: competitorSuppression,
          visible_market_share: visibleMarketShare,
          captured_revenue_share: capturedRevenueShare,
          strategy_state: strategyState,
          contributing_location_ids: contributingLocationIds,
          estimated_market_demand: estimatedMarketDemand,
          factors: {
            orgReviewCount,
            competitorReviewCount,
            orgContentPages,
            competitorContentPages,
            avgPageHealth: avgPage,
            avgConversionHealth: avgConversion,
            avgCompetitorGap: avgGap,
          },
          scored_at: new Date().toISOString(),
        });

      if (upsertErr) {
        console.error(`Failed to score target ${target.id}:`, upsertErr);
      } else {
        scored++;
      }
    }

    return new Response(JSON.stringify({ scored }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('seo-domination-score error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
