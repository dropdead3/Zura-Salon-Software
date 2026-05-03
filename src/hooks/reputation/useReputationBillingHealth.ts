/**
 * useReputationBillingHealth — Cross-org billing posture for the Reputation
 * platform console. Aggregates reputation_subscriptions × organizations into
 * MRR / past-due / at-risk metrics + a per-org table.
 *
 * Read-only. Mutations live in useReputationOrgToggle / Stripe billing portal.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { REPUTATION_PRICING_SHEET } from '@/config/reputationPricing';

export interface ReputationBillingOrgRow {
  organizationId: string;
  organizationName: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | null;
  grantSource: string | null;
  currentPeriodEnd: string | null;
  graceUntil: string | null;
  retentionCouponUsed: boolean;
  estimatedMRR: number; // USD
}

export interface ReputationBillingHealth {
  totalActive: number;
  totalTrialing: number;
  totalPastDue: number;
  totalCanceled: number;
  retentionCouponsUsed: number;
  monthlyRecurringRevenue: number; // active subs only
  mrrAtRisk: number; // past_due subs
  orgs: ReputationBillingOrgRow[];
}

export function useReputationBillingHealth() {
  return useQuery({
    queryKey: ['platform-reputation-billing-health'],
    staleTime: 30_000,
    queryFn: async (): Promise<ReputationBillingHealth> => {
      const [{ data: orgs, error: orgErr }, { data: subs }] = await Promise.all([
        supabase.from('organizations').select('id, name'),
        supabase
          .from('reputation_subscriptions')
          .select(
            'organization_id, status, grant_source, current_period_end, grace_until, retention_coupon_applied_at',
          ),
      ]);
      if (orgErr) throw orgErr;

      const orgMap = new Map((orgs ?? []).map((o: any) => [o.id, o.name as string]));
      const price = REPUTATION_PRICING_SHEET.baseSku.monthlyPrice;

      const rows: ReputationBillingOrgRow[] = (subs ?? [])
        .map((s: any) => {
          const status = (s.status as ReputationBillingOrgRow['status']) ?? null;
          const isRevenueGenerating = status === 'active' || status === 'trialing';
          return {
            organizationId: s.organization_id,
            organizationName: orgMap.get(s.organization_id) ?? '—',
            status,
            grantSource: s.grant_source ?? null,
            currentPeriodEnd: s.current_period_end ?? null,
            graceUntil: s.grace_until ?? null,
            retentionCouponUsed: !!s.retention_coupon_applied_at,
            estimatedMRR: isRevenueGenerating ? price : 0,
          };
        })
        .sort((a, b) => {
          // Risk first
          const order = { past_due: 0, trialing: 1, active: 2, canceled: 3 } as const;
          const ar = order[(a.status ?? 'canceled') as keyof typeof order] ?? 4;
          const br = order[(b.status ?? 'canceled') as keyof typeof order] ?? 4;
          if (ar !== br) return ar - br;
          return b.estimatedMRR - a.estimatedMRR;
        });

      const totals = rows.reduce(
        (acc, r) => {
          if (r.status === 'active') acc.totalActive += 1;
          if (r.status === 'trialing') acc.totalTrialing += 1;
          if (r.status === 'past_due') acc.totalPastDue += 1;
          if (r.status === 'canceled') acc.totalCanceled += 1;
          if (r.retentionCouponUsed) acc.retentionCouponsUsed += 1;
          if (r.status === 'active') acc.monthlyRecurringRevenue += r.estimatedMRR;
          if (r.status === 'past_due') acc.mrrAtRisk += price;
          return acc;
        },
        {
          totalActive: 0,
          totalTrialing: 0,
          totalPastDue: 0,
          totalCanceled: 0,
          retentionCouponsUsed: 0,
          monthlyRecurringRevenue: 0,
          mrrAtRisk: 0,
        },
      );

      return { ...totals, orgs: rows };
    },
  });
}
