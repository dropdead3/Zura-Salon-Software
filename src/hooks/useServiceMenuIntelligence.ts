import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subWeeks, format } from 'date-fns';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface DecliningService {
  serviceName: string;
  recentCount: number;
  priorCount: number;
  changePct: number;
  revenueImpact: number;
}

export interface HighMarginUnderbooked {
  serviceName: string;
  marginPct: number;
  bookings: number;
  medianBookings: number;
  price: number;
}

export interface BundleSuggestion {
  serviceA: string;
  serviceB: string;
  coOccurrences: number;
  estimatedLift: number;
}

export interface ServiceMenuIntelligenceData {
  decliningServices: DecliningService[];
  highMarginUnderbooked: HighMarginUnderbooked[];
  suggestedBundles: BundleSuggestion[];
}

export function useServiceMenuIntelligence(organizationId?: string, locationId?: string) {
  const now = new Date();
  const recentStart = format(subWeeks(now, 4), 'yyyy-MM-dd');
  const priorStart = format(subWeeks(now, 8), 'yyyy-MM-dd');
  const recentEnd = format(now, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['service-menu-intelligence', organizationId, locationId],
    queryFn: async (): Promise<ServiceMenuIntelligenceData> => {
      // Fetch transaction items for last 8 weeks
      const txItems = await fetchAllBatched<{
        item_name: string | null;
        item_type: string | null;
        total_amount: number | null;
        transaction_date: string | null;
        transaction_id: string | null;
      }>((from, to) => {
        let q = supabase
          .from('phorest_transaction_items')
          .select('item_name, item_type, total_amount, transaction_date, transaction_id')
          .eq('item_type', 'service')
          .gte('transaction_date', priorStart)
          .lte('transaction_date', recentEnd)
          .range(from, to);
        if (locationId) q = q.eq('location_id', locationId);
        return q;
      });

      // Fetch services with price data (phorest_services has no cost column, use service_addons pattern)
      const { data: services, error: svcErr } = await supabase
        .from('phorest_services')
        .select('name, price');
      if (svcErr) throw svcErr;

      // Also fetch addon margin data for cost info
      const { data: addons, error: addonErr } = await supabase
        .from('service_addons')
        .select('name, price, cost')
        .eq('organization_id', organizationId!)
        .eq('is_active', true);
      if (addonErr) throw addonErr;

      const items = txItems || [];
      const svcList = services || [];
      const addonList = addons || [];

      // Group by service and period
      const recentMap = new Map<string, { count: number; revenue: number }>();
      const priorMap = new Map<string, { count: number; revenue: number }>();

      for (const item of items) {
        const name = item.item_name || 'Unknown';
        const date = item.transaction_date;
        const isRecent = date >= recentStart;
        const map = isRecent ? recentMap : priorMap;
        const existing = map.get(name) || { count: 0, revenue: 0 };
        existing.count++;
        existing.revenue += item.total_amount || 0;
        map.set(name, existing);
      }

      // Declining services (>25% drop)
      const decliningServices: DecliningService[] = [];
      const allServiceNames = new Set([...recentMap.keys(), ...priorMap.keys()]);
      for (const name of allServiceNames) {
        const recent = recentMap.get(name) || { count: 0, revenue: 0 };
        const prior = priorMap.get(name) || { count: 0, revenue: 0 };
        if (prior.count >= 3) {
          const changePct = ((recent.count - prior.count) / prior.count) * 100;
          if (changePct <= -25) {
            decliningServices.push({
              serviceName: name,
              recentCount: recent.count,
              priorCount: prior.count,
              changePct,
              revenueImpact: prior.revenue - recent.revenue,
            });
          }
        }
      }
      decliningServices.sort((a, b) => a.changePct - b.changePct);

      // Build cost map from addons (since phorest_services lacks cost)
      const addonCostMap = new Map(
        addonList
          .filter(a => a.cost != null && a.price > 0)
          .map(a => [a.name, { price: a.price, cost: a.cost!, marginPct: ((a.price - a.cost!) / a.price) * 100 }])
      );

      // Also build price map from phorest_services
      const svcPriceMap = new Map(svcList.filter(s => s.price && s.price > 0).map(s => [s.name, s.price!]));

      const bookingCounts = [...recentMap.entries()].map(([, { count }]) => count);
      const medianBookings = bookingCounts.length > 0
        ? bookingCounts.sort((a, b) => a - b)[Math.floor(bookingCounts.length / 2)]
        : 0;

      // High-margin underbooked (using addon cost data where available)
      const highMarginUnderbooked: HighMarginUnderbooked[] = [];
      for (const [name, data] of addonCostMap) {
        const recent = recentMap.get(name);
        const bookings = recent?.count || 0;
        if (data.marginPct > 60 && bookings < medianBookings && bookings > 0) {
          highMarginUnderbooked.push({
            serviceName: name,
            marginPct: data.marginPct,
            bookings,
            medianBookings,
            price: data.price,
          });
        }
      }
      highMarginUnderbooked.sort((a, b) => b.marginPct - a.marginPct);

      // Bundle suggestions from co-booking patterns
      const txServiceMap = new Map<string, Set<string>>();
      for (const item of items) {
        if (!item.transaction_id || !item.item_name) continue;
        const set = txServiceMap.get(item.transaction_id) || new Set();
        set.add(item.item_name);
        txServiceMap.set(item.transaction_id, set);
      }

      const pairCounts = new Map<string, number>();
      for (const [, serviceSet] of txServiceMap) {
        if (serviceSet.size < 2) continue;
        const arr = [...serviceSet].sort();
        for (let i = 0; i < arr.length; i++) {
          for (let j = i + 1; j < arr.length; j++) {
            const key = `${arr[i]}|||${arr[j]}`;
            pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
          }
        }
      }

      const suggestedBundles: BundleSuggestion[] = [...pairCounts.entries()]
        .filter(([, count]) => count >= 3)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([key, count]) => {
          const [a, b] = key.split('|||');
          const priceA = svcPriceMap.get(a) || 0;
          const priceB = svcPriceMap.get(b) || 0;
          return {
            serviceA: a,
            serviceB: b,
            coOccurrences: count,
            estimatedLift: (priceA + priceB) * 0.1 * count,
          };
        });

      return { decliningServices: decliningServices.slice(0, 8), highMarginUnderbooked: highMarginUnderbooked.slice(0, 8), suggestedBundles };
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}
