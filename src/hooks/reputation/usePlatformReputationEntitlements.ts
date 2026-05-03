/**
 * usePlatformReputationEntitlements — Cross-org entitlement view for the
 * Platform Reputation console. Joins `organizations` with the latest
 * `reputation_subscriptions` row + the org's `reputation_enabled` flag.
 *
 * Read-only. Writes flow through `useReputationOrgToggle`.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReputationEntitlementRow {
  organization_id: string;
  organization_name: string;
  reputation_enabled: boolean;
  subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled' | null;
  grant_source: string | null;
  grace_until: string | null;
  current_period_end: string | null;
  retention_coupon_applied_at: string | null;
}

export function usePlatformReputationEntitlements() {
  return useQuery({
    queryKey: ['platform-reputation-entitlements'],
    queryFn: async (): Promise<ReputationEntitlementRow[]> => {
      const [{ data: orgs, error: orgErr }, { data: subs }, { data: flags }] =
        await Promise.all([
          supabase.from('organizations').select('id, name').order('name'),
          supabase
            .from('reputation_subscriptions')
            .select('organization_id, status, grant_source, grace_until, current_period_end, retention_coupon_applied_at'),
          supabase
            .from('organization_feature_flags')
            .select('organization_id, is_enabled')
            .eq('flag_key', 'reputation_enabled'),
        ]);
      if (orgErr) throw orgErr;

      const subMap = new Map((subs ?? []).map((s: any) => [s.organization_id, s]));
      const flagMap = new Map(
        (flags ?? []).map((f: any) => [f.organization_id, f.is_enabled as boolean]),
      );

      return (orgs ?? []).map((o: any) => {
        const sub = subMap.get(o.id);
        return {
          organization_id: o.id,
          organization_name: o.name,
          reputation_enabled: flagMap.get(o.id) ?? false,
          subscription_status: (sub?.status as any) ?? null,
          grant_source: sub?.grant_source ?? null,
          grace_until: sub?.grace_until ?? null,
          current_period_end: sub?.current_period_end ?? null,
          retention_coupon_applied_at: sub?.retention_coupon_applied_at ?? null,
        };
      });
    },
    staleTime: 30_000,
  });
}

export interface ReputationCohortCounts {
  trialing: number;
  active: number;
  past_due: number;
  canceled: number;
  enabled: number;
  total: number;
  retention_coupons_used: number;
}

export function usePlatformReputationCohorts() {
  return useQuery({
    queryKey: ['platform-reputation-cohorts'],
    queryFn: async (): Promise<ReputationCohortCounts> => {
      const [{ data: subs }, { data: flags }, { data: orgs }] = await Promise.all([
        supabase
          .from('reputation_subscriptions')
          .select('status, retention_coupon_applied_at'),
        supabase
          .from('organization_feature_flags')
          .select('is_enabled')
          .eq('flag_key', 'reputation_enabled')
          .eq('is_enabled', true),
        supabase.from('organizations').select('id'),
      ]);
      const counts: ReputationCohortCounts = {
        trialing: 0, active: 0, past_due: 0, canceled: 0,
        enabled: flags?.length ?? 0,
        total: orgs?.length ?? 0,
        retention_coupons_used: 0,
      };
      for (const s of subs ?? []) {
        const status = (s as any).status as keyof ReputationCohortCounts;
        if (status in counts && status !== 'enabled' && status !== 'total' && status !== 'retention_coupons_used') {
          (counts[status] as number) += 1;
        }
        if ((s as any).retention_coupon_applied_at) counts.retention_coupons_used += 1;
      }
      return counts;
    },
    staleTime: 30_000,
  });
}

export interface ReputationAdminActionRow {
  id: string;
  actor_user_id: string | null;
  target_organization_id: string | null;
  action_type: string;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function usePlatformReputationAdminActions(limit = 50) {
  return useQuery({
    queryKey: ['platform-reputation-admin-actions', limit],
    queryFn: async (): Promise<ReputationAdminActionRow[]> => {
      const { data, error } = await supabase
        .from('reputation_admin_actions' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as unknown as ReputationAdminActionRow[]) ?? [];
    },
    staleTime: 30_000,
  });
}
