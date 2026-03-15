import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BackroomPlatformMetrics {
  totalEnabledOrgs: number;
  totalTrialOrgs: number;
  estimatedMRR: number;
  avgWasteReduction: number | null;
  orgUsageStats: OrgUsageStat[];
  adoptionTimeline: { month: string; count: number }[];
  coachingSignals: CoachingSignal[];
  coachingEmailsSent: number;
}

export interface CoachingSignal {
  orgId: string;
  orgName: string;
  healthScore: 'green' | 'amber' | 'red';
  avgReweighPct: number | null;
  avgWastePct: number | null;
  sessionCount: number;
  lastActiveDate: string | null;
  daysSinceActive: number | null;
  reason: string;
}

export interface OrgUsageStat {
  orgId: string;
  orgName: string;
  snapshotCount: number;
  avgWastePct: number | null;
  lastSnapshotDate: string | null;
  totalSessions: number;
}

const PLAN_PRICES: Record<string, number> = {
  starter: 49,
  professional: 129,
  unlimited: 299,
};

export function useBackroomPlatformAnalytics() {
  return useQuery({
    queryKey: ['backroom-platform-analytics'],
    queryFn: async (): Promise<BackroomPlatformMetrics> => {
      // Fetch enabled orgs
      const { data: flags, error: fErr } = await supabase
        .from('organization_feature_flags')
        .select('organization_id, is_enabled, override_reason, created_at')
        .eq('flag_key', 'backroom_enabled')
        .eq('is_enabled', true);
      if (fErr) throw fErr;

      const enabledOrgIds = (flags || []).map((f: any) => f.organization_id);
      const totalEnabledOrgs = enabledOrgIds.length;

      // Estimate MRR from override_reason (which contains plan tier)
      let estimatedMRR = 0;
      let totalTrialOrgs = 0;
      (flags || []).forEach((f: any) => {
        const reason = (f.override_reason || '').toLowerCase();
        if (reason.includes('trial')) {
          totalTrialOrgs++;
        }
        for (const [tier, price] of Object.entries(PLAN_PRICES)) {
          if (reason.includes(tier)) {
            estimatedMRR += price;
            break;
          }
        }
        // Default to starter if no tier found and not trial
        if (!Object.keys(PLAN_PRICES).some((t) => reason.includes(t)) && !reason.includes('trial')) {
          estimatedMRR += PLAN_PRICES.starter;
        }
      });

      // Fetch org names
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', enabledOrgIds.length > 0 ? enabledOrgIds : ['00000000-0000-0000-0000-000000000000']);

      const orgMap = new Map((orgs || []).map((o: any) => [o.id, o.name]));

      // Fetch analytics snapshots for usage stats
      const { data: snapshots } = await supabase
        .from('backroom_analytics_snapshots')
        .select('organization_id, snapshot_date, waste_pct, total_sessions')
        .order('snapshot_date', { ascending: false });

      // Aggregate per org
      const orgStats = new Map<string, { count: number; wasteSum: number; wasteCount: number; lastDate: string | null; sessions: number }>();
      (snapshots || []).forEach((s: any) => {
        const existing = orgStats.get(s.organization_id) || { count: 0, wasteSum: 0, wasteCount: 0, lastDate: null, sessions: 0 };
        existing.count++;
        if (s.waste_pct != null) {
          existing.wasteSum += Number(s.waste_pct);
          existing.wasteCount++;
        }
        existing.sessions += s.total_sessions || 0;
        if (!existing.lastDate || s.snapshot_date > existing.lastDate) existing.lastDate = s.snapshot_date;
        orgStats.set(s.organization_id, existing);
      });

      const orgUsageStats: OrgUsageStat[] = enabledOrgIds.map((oid: string) => {
        const stats = orgStats.get(oid);
        return {
          orgId: oid,
          orgName: orgMap.get(oid) || 'Unknown',
          snapshotCount: stats?.count || 0,
          avgWastePct: stats && stats.wasteCount > 0 ? stats.wasteSum / stats.wasteCount : null,
          lastSnapshotDate: stats?.lastDate || null,
          totalSessions: stats?.sessions || 0,
        };
      });

      // Avg waste reduction across all orgs with data
      const orgsWithWaste = orgUsageStats.filter((o) => o.avgWastePct != null);
      const avgWasteReduction = orgsWithWaste.length > 0
        ? orgsWithWaste.reduce((sum, o) => sum + (o.avgWastePct || 0), 0) / orgsWithWaste.length
        : null;

      // Adoption timeline — group enabled flags by month
      const monthMap = new Map<string, number>();
      (flags || []).forEach((f: any) => {
        const month = f.created_at?.substring(0, 7) || 'unknown';
        monthMap.set(month, (monthMap.get(month) || 0) + 1);
      });
      const adoptionTimeline = [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }));

      // Coaching signals — fetch staff performance for reweigh rates
      const { data: perfData } = await supabase
        .from('staff_backroom_performance')
        .select('organization_id, reweigh_compliance_rate, waste_rate, mix_session_count')
        .in('organization_id', enabledOrgIds.length > 0 ? enabledOrgIds : ['00000000-0000-0000-0000-000000000000']);

      // Aggregate reweigh compliance per org
      const perfByOrg = new Map<string, { reweighSum: number; reweighCount: number; wasteSum: number; wasteCount: number; sessions: number }>();
      (perfData || []).forEach((p: any) => {
        const existing = perfByOrg.get(p.organization_id) || { reweighSum: 0, reweighCount: 0, wasteSum: 0, wasteCount: 0, sessions: 0 };
        if (p.reweigh_compliance_rate != null) {
          existing.reweighSum += Number(p.reweigh_compliance_rate);
          existing.reweighCount++;
        }
        if (p.waste_rate != null) {
          existing.wasteSum += Number(p.waste_rate);
          existing.wasteCount++;
        }
        existing.sessions += p.mix_session_count || 0;
        perfByOrg.set(p.organization_id, existing);
      });

      const now = new Date();
      const coachingSignals: CoachingSignal[] = enabledOrgIds.map((oid: string) => {
        const stats = orgStats.get(oid);
        const perf = perfByOrg.get(oid);
        const lastDate = stats?.lastDate || null;
        const daysSinceActive = lastDate
          ? Math.floor((now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const avgReweighPct = perf && perf.reweighCount > 0
          ? perf.reweighSum / perf.reweighCount * 100
          : null;
        const avgWastePct2 = perf && perf.wasteCount > 0
          ? perf.wasteSum / perf.wasteCount * 100
          : null;

        let healthScore: 'green' | 'amber' | 'red' = 'green';
        let reason = 'Active and healthy';

        if (!stats || stats.count === 0) {
          healthScore = 'red';
          reason = 'No snapshots — setup may be incomplete';
        } else if (daysSinceActive != null && daysSinceActive > 30) {
          healthScore = 'red';
          reason = `Inactive for ${daysSinceActive} days`;
        } else if (avgReweighPct != null && avgReweighPct < 50) {
          healthScore = 'amber';
          reason = `Low reweigh compliance (${avgReweighPct.toFixed(0)}%)`;
        }

        return {
          orgId: oid,
          orgName: orgMap.get(oid) || 'Unknown',
          healthScore,
          avgReweighPct,
          avgWastePct: avgWastePct2,
          sessionCount: perf?.sessions || stats?.sessions || 0,
          lastActiveDate: lastDate,
          daysSinceActive,
          reason,
        };
      }).sort((a, b) => {
        const order = { red: 0, amber: 1, green: 2 };
        return order[a.healthScore] - order[b.healthScore];
      });

      // Fetch coaching email counter
      const { data: counterRow } = await supabase
        .from('platform_kpi_counters')
        .select('value')
        .eq('key', 'backroom_coaching_emails_sent')
        .maybeSingle();

      const coachingEmailsSent = counterRow?.value ? Number(counterRow.value) : 0;

      return {
        totalEnabledOrgs,
        totalTrialOrgs,
        estimatedMRR,
        avgWasteReduction,
        orgUsageStats,
        adoptionTimeline,
        coachingSignals,
        coachingEmailsSent,
      };
    },
    staleTime: 60_000,
  });
}
