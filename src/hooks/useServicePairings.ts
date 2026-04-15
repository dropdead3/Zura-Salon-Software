import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { getServiceCategory } from '@/utils/serviceCategorization';

export interface ServicePairing {
  serviceA: string;
  serviceB: string;
  count: number;
  pctOfVisits: number;
}

export interface StandaloneRate {
  category: string;
  totalBookings: number;
  standaloneCount: number;
  standaloneRate: number;
  groupedCount: number;
  groupedRate: number;
}

export interface RevenueLift {
  category: string;
  avgTicketSolo: number;
  avgTicketGrouped: number;
  liftDollars: number;
  liftPct: number;
}

export interface CategoryPairing {
  categoryA: string;
  categoryB: string;
  count: number;
  pctOfMultiVisits: number;
}

export function useServicePairings(
  dateFrom: string,
  dateTo: string,
  locationId?: string
) {
  const query = useQuery({
    queryKey: ['service-pairings', dateFrom, dateTo, locationId],
    queryFn: async () => {
      const allData: any[] = [];
      const PAGE_SIZE = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        let q = supabase
          .from('v_all_appointments' as any)
          .select('phorest_client_id, appointment_date, service_name, total_price, tip_amount')
          .neq('status', 'cancelled')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .eq('is_demo', false)
          .range(offset, offset + PAGE_SIZE - 1);

        if (locationId) {
          q = q.eq('location_id', locationId);
        }

        const { data, error } = await q;
        if (error) throw error;
        allData.push(...(data || []));
        hasMore = (data?.length || 0) === PAGE_SIZE;
        offset += PAGE_SIZE;
      }

      return allData;
    },
  });

  const result = useMemo(() => {
    if (!query.data) return {
      pairings: [] as ServicePairing[],
      standaloneRates: [] as StandaloneRate[],
      revenueLift: [] as RevenueLift[],
      categoryPairings: [] as CategoryPairing[],
    };

    // Group by client + date into visits
    const visits = new Map<string, { services: Set<string>; items: { service: string; price: number }[] }>();
    for (const a of query.data) {
      if (!a.phorest_client_id || !a.service_name) continue;
      const key = `${a.phorest_client_id}::${a.appointment_date}`;
      if (!visits.has(key)) visits.set(key, { services: new Set(), items: [] });
      const visit = visits.get(key)!;
      visit.services.add(a.service_name);
      visit.items.push({ service: a.service_name, price: (a.total_price || 0) - (a.tip_amount || 0) });
    }

    // === Pairings (existing logic) ===
    const pairCounts = new Map<string, number>();
    let multiServiceVisitCount = 0;

    for (const { services } of visits.values()) {
      if (services.size < 2) continue;
      multiServiceVisitCount++;
      const sorted = [...services].sort();
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const pairKey = `${sorted[i]}|||${sorted[j]}`;
          pairCounts.set(pairKey, (pairCounts.get(pairKey) || 0) + 1);
        }
      }
    }

    const pairings: ServicePairing[] = [...pairCounts.entries()]
      .map(([key, count]) => {
        const [serviceA, serviceB] = key.split('|||');
        return { serviceA, serviceB, count, pctOfVisits: multiServiceVisitCount > 0 ? (count / multiServiceVisitCount) * 100 : 0 };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // === Standalone vs Grouped Rates (by category) ===
    const catStats = new Map<string, { standalone: number; grouped: number }>();
    for (const { items, services } of visits.values()) {
      const isMulti = services.size > 1;
      const visitCategories = new Set<string>();
      for (const item of items) {
        const cat = getServiceCategory(item.service);
        visitCategories.add(cat);
      }
      for (const cat of visitCategories) {
        if (!catStats.has(cat)) catStats.set(cat, { standalone: 0, grouped: 0 });
        const s = catStats.get(cat)!;
        if (isMulti) s.grouped++; else s.standalone++;
      }
    }

    const standaloneRates: StandaloneRate[] = [...catStats.entries()]
      .map(([category, { standalone, grouped }]) => {
        const total = standalone + grouped;
        return {
          category,
          totalBookings: total,
          standaloneCount: standalone,
          standaloneRate: total > 0 ? (standalone / total) * 100 : 0,
          groupedCount: grouped,
          groupedRate: total > 0 ? (grouped / total) * 100 : 0,
        };
      })
      .filter(r => r.totalBookings >= 3)
      .sort((a, b) => b.standaloneRate - a.standaloneRate);

    // === Revenue Lift ===
    const catRevenue = new Map<string, { soloTickets: number[]; groupedTickets: number[] }>();
    for (const { items, services } of visits.values()) {
      const isMulti = services.size > 1;
      const visitTotal = items.reduce((s, i) => s + i.price, 0);
      const visitCategories = new Set<string>();
      for (const item of items) {
        visitCategories.add(getServiceCategory(item.service));
      }
      for (const cat of visitCategories) {
        if (!catRevenue.has(cat)) catRevenue.set(cat, { soloTickets: [], groupedTickets: [] });
        const r = catRevenue.get(cat)!;
        if (isMulti) r.groupedTickets.push(visitTotal);
        else r.soloTickets.push(visitTotal);
      }
    }

    const revenueLift: RevenueLift[] = [...catRevenue.entries()]
      .filter(([, v]) => v.soloTickets.length >= 2 && v.groupedTickets.length >= 2)
      .map(([category, { soloTickets, groupedTickets }]) => {
        const avgSolo = soloTickets.reduce((s, v) => s + v, 0) / soloTickets.length;
        const avgGrouped = groupedTickets.reduce((s, v) => s + v, 0) / groupedTickets.length;
        const liftDollars = avgGrouped - avgSolo;
        const liftPct = avgSolo > 0 ? (liftDollars / avgSolo) * 100 : 0;
        return { category, avgTicketSolo: avgSolo, avgTicketGrouped: avgGrouped, liftDollars, liftPct };
      })
      .sort((a, b) => b.liftDollars - a.liftDollars);

    // === Category Pairing Heatmap ===
    const catPairCounts = new Map<string, number>();
    for (const { services } of visits.values()) {
      if (services.size < 2) continue;
      const cats = new Set<string>();
      for (const svc of services) cats.add(getServiceCategory(svc));
      const sortedCats = [...cats].sort();
      for (let i = 0; i < sortedCats.length; i++) {
        for (let j = i + 1; j < sortedCats.length; j++) {
          const pk = `${sortedCats[i]}|||${sortedCats[j]}`;
          catPairCounts.set(pk, (catPairCounts.get(pk) || 0) + 1);
        }
      }
    }

    const categoryPairings: CategoryPairing[] = [...catPairCounts.entries()]
      .map(([key, count]) => {
        const [categoryA, categoryB] = key.split('|||');
        return { categoryA, categoryB, count, pctOfMultiVisits: multiServiceVisitCount > 0 ? (count / multiServiceVisitCount) * 100 : 0 };
      })
      .sort((a, b) => b.count - a.count);

    return { pairings, standaloneRates, revenueLift, categoryPairings };
  }, [query.data]);

  return { ...result, isLoading: query.isLoading };
}
