import { useQuery } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export interface StylistAddonPerformance {
  staffUserId: string;
  displayName: string;
  totalAddons: number;
  totalDismissed: number;
  attachmentRate: number; // accepted / (accepted + dismissed) * 100
  avgMarginPct: number;
  highMarginCount: number; // margin >= 50%
  lowMarginCount: number;  // margin < 30%
}

export function useStylistAddonAttachment(organizationId?: string, days = 30) {
  return useQuery({
    queryKey: ['stylist-addon-attachment', organizationId, days],
    queryFn: async (): Promise<StylistAddonPerformance[]> => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data: events, error } = await supabase
        .from('booking_addon_events' as any)
        .select('staff_user_id, addon_price, addon_cost, status')
        .eq('organization_id', organizationId!)
        .gte('created_at', since);

      if (error) throw error;
      if (!events || events.length === 0) return [];

      // Group by stylist
      const byStaff = new Map<string, { prices: number[]; costs: (number | null)[]; dismissed: number }>();
      for (const e of events as any[]) {
        const entry = byStaff.get(e.staff_user_id) || { prices: [], costs: [], dismissed: 0 };
        if (e.status === 'dismissed') {
          entry.dismissed++;
        } else if (e.status === 'accepted' || !e.status) {
          entry.prices.push(Number(e.addon_price));
          entry.costs.push(e.addon_cost != null ? Number(e.addon_cost) : null);
        }
        byStaff.set(e.staff_user_id, entry);
      }

      // Fetch display names
      const staffIds = [...byStaff.keys()];
      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name')
        .in('user_id', staffIds);

      const nameMap = new Map<string, string>();
      for (const p of profiles || []) {
        nameMap.set(p.user_id, formatDisplayName(p.full_name || '', p.display_name));
      }

      // Calculate per-stylist metrics
      const results: StylistAddonPerformance[] = [];
      for (const [staffId, data] of byStaff) {
        let marginSum = 0;
        let marginCount = 0;
        let highMargin = 0;
        let lowMargin = 0;

        for (let i = 0; i < data.prices.length; i++) {
          const price = data.prices[i];
          const cost = data.costs[i];
          if (cost != null && price > 0) {
            const margin = ((price - cost) / price) * 100;
            marginSum += margin;
            marginCount++;
            if (margin >= 50) highMargin++;
            if (margin < 30) lowMargin++;
          }
        }

        const accepted = data.prices.length;
        const totalOpportunities = accepted + data.dismissed;
        results.push({
          staffUserId: staffId,
          displayName: nameMap.get(staffId) || 'Unknown',
          totalAddons: accepted,
          totalDismissed: data.dismissed,
          attachmentRate: totalOpportunities > 0 ? (accepted / totalOpportunities) * 100 : 0,
          avgMarginPct: marginCount > 0 ? marginSum / marginCount : 0,
          highMarginCount: highMargin,
          lowMarginCount: lowMargin,
        });
      }

      // Sort by total add-ons descending
      results.sort((a, b) => b.totalAddons - a.totalAddons);
      return results;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}
