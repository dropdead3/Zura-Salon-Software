import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChurnRiskFactor {
  factor: string;
  weight: number;
  value: boolean | number;
  contribution: number;
}

interface ChurnAnalysis {
  organization_id: string;
  organization_name: string;
  risk_score: number; // 0-100
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  factors: ChurnRiskFactor[];
  recommendations: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey) as any;

    // Get all active/trialing organizations
    const { data: organizations, error: orgsError } = await adminClient
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        subscription_status,
        created_at,
        activated_at,
        billing_email
      `)
      .in('subscription_status', ['active', 'trialing', 'past_due']);

    if (orgsError) throw orgsError;

    const now = new Date();
    const analyses: ChurnAnalysis[] = [];
    const highRiskOrgs: string[] = [];

    for (const org of organizations || []) {
      const factors: ChurnRiskFactor[] = [];
      let totalWeight = 0;
      let weightedScore = 0;

      // Factor 1: No logins in last 14 days
      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const { count: recentLogins } = await adminClient
        .from('employee_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .gte('last_sign_in_at', twoWeeksAgo.toISOString());

      const noRecentLogins = (recentLogins || 0) === 0;
      factors.push({
        factor: 'No logins in 14 days',
        weight: 30,
        value: noRecentLogins,
        contribution: noRecentLogins ? 30 : 0,
      });
      totalWeight += 30;
      if (noRecentLogins) weightedScore += 30;

      // Factor 2: Low user adoption (< 50% of users active)
      const { count: totalUsers } = await adminClient
        .from('employee_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .eq('is_approved', true);

      const { count: activeUsers } = await adminClient
        .from('employee_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .gte('last_sign_in_at', twoWeeksAgo.toISOString());

      const adoptionRate = totalUsers ? ((activeUsers || 0) / totalUsers) * 100 : 0;
      const lowAdoption = adoptionRate < 50;
      factors.push({
        factor: 'Low user adoption (<50%)',
        weight: 20,
        value: adoptionRate,
        contribution: lowAdoption ? 20 : 0,
      });
      totalWeight += 20;
      if (lowAdoption) weightedScore += 20;

      // Factor 3: Payment issues
      const hasPaymentIssues = org.subscription_status === 'past_due';
      factors.push({
        factor: 'Payment issues',
        weight: 25,
        value: hasPaymentIssues,
        contribution: hasPaymentIssues ? 25 : 0,
      });
      totalWeight += 25;
      if (hasPaymentIssues) weightedScore += 25;

      // Factor 4: No appointments in last 30 days
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: recentAppointments } = await adminClient
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const noRecentActivity = (recentAppointments || 0) === 0;
      factors.push({
        factor: 'No appointments in 30 days',
        weight: 15,
        value: noRecentActivity,
        contribution: noRecentActivity ? 15 : 0,
      });
      totalWeight += 15;
      if (noRecentActivity) weightedScore += 15;

      // Factor 5: Support tickets unresolved
      const { count: openTickets } = await adminClient
        .from('platform_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'support_request')
        .is('resolved_at', null);

      const hasOpenTickets = (openTickets || 0) > 0;
      factors.push({
        factor: 'Unresolved support tickets',
        weight: 10,
        value: openTickets || 0,
        contribution: hasOpenTickets ? 10 : 0,
      });
      totalWeight += 10;
      if (hasOpenTickets) weightedScore += 10;

      // Calculate risk score
      const riskScore = Math.round((weightedScore / totalWeight) * 100);
      
      let riskLevel: ChurnAnalysis['risk_level'];
      if (riskScore >= 75) riskLevel = 'critical';
      else if (riskScore >= 50) riskLevel = 'high';
      else if (riskScore >= 25) riskLevel = 'medium';
      else riskLevel = 'low';

      // Generate recommendations
      const recommendations: string[] = [];
      if (noRecentLogins) recommendations.push('Reach out to re-engage users');
      if (lowAdoption) recommendations.push('Offer training or onboarding assistance');
      if (hasPaymentIssues) recommendations.push('Follow up on payment status');
      if (noRecentActivity) recommendations.push('Check if they need help with features');
      if (hasOpenTickets) recommendations.push('Prioritize resolving support tickets');

      const analysis: ChurnAnalysis = {
        organization_id: org.id,
        organization_name: org.name,
        risk_score: riskScore,
        risk_level: riskLevel,
        factors,
        recommendations,
      };

      analyses.push(analysis);

      // Store churn analysis (upsert)
      await adminClient.from('churn_risk_scores').upsert({
        organization_id: org.id,
        risk_score: riskScore,
        risk_level: riskLevel,
        factors: factors,
        recommendations: recommendations,
        analyzed_at: now.toISOString(),
      }, { onConflict: 'organization_id' });

      // Alert on high risk
      if (riskLevel === 'critical' || riskLevel === 'high') {
        highRiskOrgs.push(org.name);

        await adminClient.from('platform_notifications').insert({
          type: 'churn_risk',
          severity: riskLevel === 'critical' ? 'critical' : 'warning',
          title: `Churn Risk: ${org.name}`,
          message: `${org.name} has a ${riskLevel} churn risk (score: ${riskScore}). Recommended actions: ${recommendations.slice(0, 2).join(', ')}`,
          metadata: {
            organization_id: org.id,
            risk_score: riskScore,
            risk_level: riskLevel,
          },
        });
      }
    }

    // Log function execution
    await adminClient.from('edge_function_logs').insert({
      function_name: 'churn-detection',
      status: 'success',
      metadata: {
        organizations_analyzed: organizations?.length || 0,
        high_risk_count: highRiskOrgs.length,
        high_risk_orgs: highRiskOrgs,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        analyzed: organizations?.length || 0,
        high_risk: highRiskOrgs.length,
        analyses: analyses.filter((a: any) => a.risk_level === 'high' || a.risk_level === 'critical'),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Churn detection error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
