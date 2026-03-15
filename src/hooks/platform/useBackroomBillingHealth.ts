import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BackroomBillingOrg {
  orgId: string;
  orgName: string;
  billingEmail: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  locationCount: number;
  activeLocationCount: number;
  trialLocationCount: number;
  cancelledLocationCount: number;
  suspendedLocationCount: number;
  earliestTrialEnd: string | null;
  planTiers: string[];
  totalScales: number;
  estimatedMRR: number;
}

export interface BackroomBillingMetrics {
  totalActiveSubscriptions: number;
  totalTrialOrgs: number;
  totalPastDueOrgs: number;
  totalMRR: number;
  mrrAtRisk: number;
  orgs: BackroomBillingOrg[];
}

const PLAN_PRICES: Record<string, number> = {
  starter: 49,
  professional: 129,
  unlimited: 299,
};

export function useBackroomBillingHealth() {
  return useQuery({
    queryKey: ['backroom-billing-health'],
    queryFn: async (): Promise<BackroomBillingMetrics> => {
      // Get all orgs with backroom enabled
      const { data: flags, error: fErr } = await supabase
        .from('organization_feature_flags')
        .select('organization_id')
        .eq('flag_key', 'backroom_enabled')
        .eq('is_enabled', true);
      if (fErr) throw fErr;

      const enabledOrgIds = (flags || []).map((f: any) => f.organization_id);
      if (enabledOrgIds.length === 0) {
        return {
          totalActiveSubscriptions: 0,
          totalTrialOrgs: 0,
          totalPastDueOrgs: 0,
          totalMRR: 0,
          mrrAtRisk: 0,
          orgs: [],
        };
      }

      // Fetch org details
      const { data: organizations } = await supabase
        .from('organizations')
        .select('id, name, billing_email, subscription_status, stripe_customer_id')
        .in('id', enabledOrgIds);

      const orgMap = new Map(
        (organizations || []).map((o: any) => [o.id, o])
      );

      // Fetch all location entitlements for enabled orgs
      const { data: entitlements } = await supabase
        .from('backroom_location_entitlements')
        .select('*')
        .in('organization_id', enabledOrgIds);

      // Group entitlements by org
      const entByOrg = new Map<string, any[]>();
      (entitlements || []).forEach((e: any) => {
        const list = entByOrg.get(e.organization_id) || [];
        list.push(e);
        entByOrg.set(e.organization_id, list);
      });

      let totalActiveSubscriptions = 0;
      let totalTrialOrgs = 0;
      let totalPastDueOrgs = 0;
      let totalMRR = 0;
      let mrrAtRisk = 0;

      const orgs: BackroomBillingOrg[] = enabledOrgIds.map((oid: string) => {
        const org = orgMap.get(oid);
        const ents = entByOrg.get(oid) || [];

        const activeCount = ents.filter((e: any) => e.status === 'active').length;
        const trialCount = ents.filter((e: any) => e.status === 'trial').length;
        const cancelledCount = ents.filter((e: any) => e.status === 'cancelled').length;
        const suspendedCount = ents.filter((e: any) => e.status === 'suspended').length;

        const trialEnds = ents
          .filter((e: any) => e.status === 'trial' && e.trial_end_date)
          .map((e: any) => e.trial_end_date)
          .sort();

        const planTiers = [...new Set(ents.filter((e: any) => e.status === 'active' || e.status === 'trial').map((e: any) => e.plan_tier))];
        const totalScales = ents.filter((e: any) => e.status === 'active' || e.status === 'trial').reduce((s: number, e: any) => s + (e.scale_count || 0), 0);

        // Estimate MRR per active location
        let orgMRR = 0;
        ents.filter((e: any) => e.status === 'active').forEach((e: any) => {
          orgMRR += PLAN_PRICES[e.plan_tier] || PLAN_PRICES.starter;
        });

        const subStatus = org?.subscription_status || null;
        if (activeCount > 0) totalActiveSubscriptions++;
        if (trialCount > 0 && activeCount === 0) totalTrialOrgs++;
        if (subStatus === 'past_due') {
          totalPastDueOrgs++;
          mrrAtRisk += orgMRR;
        }
        totalMRR += orgMRR;

        return {
          orgId: oid,
          orgName: org?.name || 'Unknown',
          billingEmail: org?.billing_email || null,
          subscriptionStatus: subStatus,
          stripeCustomerId: org?.stripe_customer_id || null,
          locationCount: ents.length,
          activeLocationCount: activeCount,
          trialLocationCount: trialCount,
          cancelledLocationCount: cancelledCount,
          suspendedLocationCount: suspendedCount,
          earliestTrialEnd: trialEnds[0] || null,
          planTiers,
          totalScales,
          estimatedMRR: orgMRR,
        };
      });

      return {
        totalActiveSubscriptions,
        totalTrialOrgs,
        totalPastDueOrgs,
        totalMRR,
        mrrAtRisk,
        orgs,
      };
    },
    staleTime: 60_000,
  });
}
