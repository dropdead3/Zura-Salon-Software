import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    ) as any;

    // Get all active organizations
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('is_active', true);

    if (orgError) throw orgError;

    const results: Array<{ org_id: string; zos: number; eligibility: string }> = [];

    for (const org of orgs ?? []) {
      // 1. Average SPI across org locations
      const { data: spiRows } = await supabase
        .from('salon_performance_index')
        .select('spi_score')
        .eq('organization_id', org.id);

      const spiScores = (spiRows ?? []).map((r: any) => Number(r.spi_score));
      const spiAvg = spiScores.length > 0 ? spiScores.reduce((a: number, b: number) => a + b, 0) / spiScores.length : 0;

      // 2. Revenue consistency (CV from appointments in last 90 days)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
      const { data: revenueRows } = await supabase
        .from('v_all_appointments')
        .select('total_price')
        .eq('organization_id', org.id)
        .gte('appointment_date', ninetyDaysAgo)
        .not('total_price', 'is', null);

      let consistencyScore = 50; // default
      if (revenueRows && revenueRows.length >= 5) {
        const values = revenueRows.map((r: any) => Number(r.total_price));
        const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
        const variance = values.reduce((a: number, b: number) => a + (b - mean) ** 2, 0) / values.length;
        const stddev = Math.sqrt(variance);
        const cv = mean > 0 ? stddev / mean : 1;
        consistencyScore = Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
      }

      // 3. Task execution reliability
      const { data: taskRows } = await supabase
        .from('seo_tasks')
        .select('status')
        .eq('organization_id', org.id);

      let executionReliability = 50;
      if (taskRows && taskRows.length >= 5) {
        const completed = taskRows.filter((t: any) => t.status === 'completed' || t.status === 'verified').length;
        executionReliability = Math.round((completed / taskRows.length) * 100);
      }

      // 4. Growth responsiveness — simplified: revenue trend positive?
      const growthResponsiveness = spiAvg >= 60 ? Math.min(100, Math.round(spiAvg * 0.9)) : 40;

      // 5. Team stability — inverse of stylist concentration
      const teamStability = 60; // placeholder; would need deeper stylist revenue queries

      // 6. Market position from domination scores
      const { data: domScores } = await supabase
        .from('seo_domination_scores')
        .select('domination_score')
        .eq('organization_id', org.id);

      let marketPosition = 50;
      if (domScores && domScores.length > 0) {
        const avg = domScores.reduce((a: number, d: any) => a + Number(d.domination_score), 0) / domScores.length;
        marketPosition = Math.round(avg);
      }

      // ZOS computation
      const zos = Math.round(
        spiAvg * 0.30 +
        consistencyScore * 0.20 +
        executionReliability * 0.15 +
        growthResponsiveness * 0.15 +
        teamStability * 0.10 +
        marketPosition * 0.10
      );
      const clamped = Math.max(0, Math.min(100, zos));

      // Hard filters
      const totalRevenue = revenueRows
        ? revenueRows.reduce((sum: number, r: any) => sum + Number(r.total_price || 0), 0)
        : 0;
      const monthlyRevenue = totalRevenue / 3; // 90 days ≈ 3 months

      const hardFilters = {
        revenuePass: monthlyRevenue >= 30000,
        reviewPass: true, // placeholder
        momentumPass: consistencyScore >= 40,
        stabilityPass: true, // placeholder
        allPass: monthlyRevenue >= 30000 && consistencyScore >= 40,
      };

      let eligibility: string;
      if (!hardFilters.allPass) {
        eligibility = 'ineligible';
      } else if (clamped >= 85) {
        eligibility = 'prime';
      } else if (clamped >= 70) {
        eligibility = 'watchlist';
      } else {
        eligibility = 'ineligible';
      }

      // Upsert into network_ownership_scores
      const { error: upsertError } = await supabase
        .from('network_ownership_scores')
        .upsert({
          organization_id: org.id,
          zos_score: clamped,
          spi_component: Math.round(spiAvg),
          consistency_component: consistencyScore,
          execution_reliability: executionReliability,
          growth_responsiveness: growthResponsiveness,
          team_stability: teamStability,
          market_position: marketPosition,
          eligibility_status: eligibility,
          hard_filter_results: hardFilters,
          factors: { spi_count: spiScores.length, task_count: taskRows?.length ?? 0 },
          scored_at: new Date().toISOString(),
        }, { onConflict: 'organization_id' });

      if (upsertError) {
        console.error(`ZOS upsert failed for org ${org.id}:`, upsertError);
      }

      results.push({ org_id: org.id, zos: clamped, eligibility });
    }

    return new Response(JSON.stringify({ success: true, scored: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('calculate-zos error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
