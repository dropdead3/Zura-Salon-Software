import { useMemo } from 'react';
import { useSalesByStylist } from '@/hooks/useSalesData';
import { useResolveCommission } from '@/hooks/useResolveCommission';

export interface StaffCompEntry {
  userId: string;
  name: string;
  serviceRevenue: number;
  productRevenue: number;
  totalRevenue: number;
  serviceCommission: number;
  retailCommission: number;
  totalCommission: number;
  laborCostPercent: number;
  commissionSource: string;
}

export function useStaffCompensationRatio(dateFrom?: string, dateTo?: string, locationId?: string) {
  const { data: salesData, isLoading: salesLoading } = useSalesByStylist(dateFrom, dateTo, locationId);
  const { resolveCommission, isLoading: commLoading } = useResolveCommission();

  const entries: StaffCompEntry[] = useMemo(() => {
    if (!salesData || commLoading) return [];
    return salesData
      .filter((s: any) => s.totalRevenue > 0)
      .map((s: any) => {
        const resolved = resolveCommission(s.user_id, s.serviceRevenue, s.productRevenue);
        const laborCostPercent = s.totalRevenue > 0 ? (resolved.totalCommission / s.totalRevenue) * 100 : 0;
        return {
          userId: s.user_id,
          name: s.name,
          serviceRevenue: s.serviceRevenue,
          productRevenue: s.productRevenue,
          totalRevenue: s.totalRevenue,
          serviceCommission: resolved.serviceCommission,
          retailCommission: resolved.retailCommission,
          totalCommission: resolved.totalCommission,
          laborCostPercent,
          commissionSource: resolved.sourceName,
        };
      })
      .sort((a: StaffCompEntry, b: StaffCompEntry) => b.totalRevenue - a.totalRevenue);
  }, [salesData, commLoading, resolveCommission]);

  const totals = useMemo(() => {
    const totalRevenue = entries.reduce((s, e) => s + e.totalRevenue, 0);
    const totalCommission = entries.reduce((s, e) => s + e.totalCommission, 0);
    return { totalRevenue, totalCommission, avgLaborPercent: totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0 };
  }, [entries]);

  return { entries, totals, isLoading: salesLoading || commLoading };
}
