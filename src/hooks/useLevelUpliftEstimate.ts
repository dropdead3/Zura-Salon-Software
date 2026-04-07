import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { subDays, format } from 'date-fns';

export interface LevelUpliftEstimate {
  /** Extra commission from service price increases alone */
  priceUplift: number;
  /** Extra commission from commission rate increase alone */
  commissionUplift: number;
  /** Combined monthly uplift (price + commission effects) */
  totalMonthlyUplift: number;
  /** Whether data is still loading */
  isLoading: boolean;
}

interface UseLevelUpliftParams {
  userId: string | undefined;
  currentLevelId: string | undefined;
  nextLevelId: string | undefined;
  currentCommRate: number; // decimal 0-1
  nextCommRate: number; // decimal 0-1
  evaluationWindowDays: number;
}

/**
 * Computes the estimated monthly income uplift from levelling up,
 * accounting for both service price increases and commission rate changes.
 *
 * Uses the stylist's actual service mix from recent appointments,
 * cross-referenced with service_level_prices for current vs next level.
 */
export function useLevelUpliftEstimate({
  userId,
  currentLevelId,
  nextLevelId,
  currentCommRate,
  nextCommRate,
  evaluationWindowDays,
}: UseLevelUpliftParams): LevelUpliftEstimate {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const enabled = !!userId && !!currentLevelId && !!nextLevelId && !!orgId;

  const windowEnd = format(new Date(), 'yyyy-MM-dd');
  const windowStart = format(subDays(new Date(), evaluationWindowDays), 'yyyy-MM-dd');

  // 1. Fetch stylist's completed appointments grouped by service_name with volume + avg price
  const { data: serviceMix, isLoading: mixLoading } = useQuery({
    queryKey: ['uplift-service-mix', userId, windowStart, windowEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('service_id, service_name, total_price')
        .eq('staff_user_id', userId!)
        .gte('appointment_date', windowStart)
        .lte('appointment_date', windowEnd)
        .neq('status', 'cancelled')
        .not('service_id', 'is', null);
      if (error) throw error;

      // Group by service_id
      const map = new Map<string, { serviceId: string; serviceName: string; count: number; totalRevenue: number }>();
      for (const row of data || []) {
        if (!row.service_id) continue;
        const existing = map.get(row.service_id);
        const price = Number(row.total_price) || 0;
        if (existing) {
          existing.count++;
          existing.totalRevenue += price;
        } else {
          map.set(row.service_id, {
            serviceId: row.service_id,
            serviceName: row.service_name || 'Unknown',
            count: 1,
            totalRevenue: price,
          });
        }
      }
      return Array.from(map.values());
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch service_level_prices for both current and next level
  const { data: levelPrices, isLoading: pricesLoading } = useQuery({
    queryKey: ['uplift-level-prices', orgId, currentLevelId, nextLevelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_level_prices')
        .select('service_id, stylist_level_id, price')
        .eq('organization_id', orgId!)
        .in('stylist_level_id', [currentLevelId!, nextLevelId!]);
      if (error) throw error;
      return data || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 3. Fetch base service prices as fallback
  const serviceIds = useMemo(() => (serviceMix || []).map(s => s.serviceId), [serviceMix]);
  const { data: basePrices, isLoading: basePricesLoading } = useQuery({
    queryKey: ['uplift-base-prices', serviceIds],
    queryFn: async () => {
      if (serviceIds.length === 0) return [];
      const { data, error } = await supabase
        .from('services')
        .select('id, price')
        .in('id', serviceIds);
      if (error) throw error;
      return data || [];
    },
    enabled: enabled && serviceIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const result = useMemo<LevelUpliftEstimate>(() => {
    const isLoading = mixLoading || pricesLoading || basePricesLoading;
    const empty: LevelUpliftEstimate = { priceUplift: 0, commissionUplift: 0, totalMonthlyUplift: 0, isLoading };

    if (!serviceMix || serviceMix.length === 0 || !levelPrices || !currentLevelId || !nextLevelId) {
      return empty;
    }

    // Build lookup: serviceId → { currentLevelPrice, nextLevelPrice }
    const currentPriceMap = new Map<string, number>();
    const nextPriceMap = new Map<string, number>();
    for (const lp of levelPrices) {
      if (lp.stylist_level_id === currentLevelId) {
        currentPriceMap.set(lp.service_id, Number(lp.price));
      } else if (lp.stylist_level_id === nextLevelId) {
        nextPriceMap.set(lp.service_id, Number(lp.price));
      }
    }

    // Base price fallback
    const basePriceMap = new Map<string, number>();
    for (const bp of basePrices || []) {
      basePriceMap.set(bp.id, Number(bp.price) || 0);
    }

    let revenueAtCurrentPrices = 0;
    let revenueAtNextPrices = 0;

    for (const svc of serviceMix) {
      const avgActualPrice = svc.totalRevenue / svc.count;
      const fallbackPrice = basePriceMap.get(svc.serviceId) ?? avgActualPrice;

      const currentPrice = currentPriceMap.get(svc.serviceId) ?? fallbackPrice;
      const nextPrice = nextPriceMap.get(svc.serviceId) ?? currentPrice;

      revenueAtCurrentPrices += currentPrice * svc.count;
      revenueAtNextPrices += nextPrice * svc.count;
    }

    // Normalize to 30 days
    const scaleFactor = evaluationWindowDays > 0 ? 30 / evaluationWindowDays : 1;

    const monthlyRevenueCurrent = revenueAtCurrentPrices * scaleFactor;
    const monthlyRevenueNext = revenueAtNextPrices * scaleFactor;

    // Commission at next level on next-level revenue vs commission at current level on current revenue
    const commissionAtCurrent = monthlyRevenueCurrent * currentCommRate;
    const commissionAtNext = monthlyRevenueNext * nextCommRate;

    const totalMonthlyUplift = commissionAtNext - commissionAtCurrent;

    // Break down: price uplift = extra revenue from prices × nextCommRate
    const priceUplift = (monthlyRevenueNext - monthlyRevenueCurrent) * nextCommRate;
    // Commission uplift = current revenue × rate delta
    const commissionUplift = monthlyRevenueCurrent * (nextCommRate - currentCommRate);

    return {
      priceUplift: Math.round(priceUplift),
      commissionUplift: Math.round(commissionUplift),
      totalMonthlyUplift: Math.round(totalMonthlyUplift),
      isLoading,
    };
  }, [serviceMix, levelPrices, basePrices, currentLevelId, nextLevelId, currentCommRate, nextCommRate, evaluationWindowDays, mixLoading, pricesLoading, basePricesLoading]);

  return result;
}
