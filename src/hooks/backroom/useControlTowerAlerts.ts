/**
 * useControlTowerAlerts — Composes existing projection hooks into
 * a unified, priority-sorted alert stream for the Control Tower.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useHighRiskInventory } from '@/hooks/inventory/useInventoryRiskProjection';
import { useBackroomExceptions } from '@/hooks/backroom/useBackroomExceptions';
import { useStaffBackroomPerformance } from '@/hooks/backroom/useStaffBackroomPerformance';
import { useStockoutAlerts, useForecastSummary } from '@/hooks/backroom/usePredictiveBackroom';
import { useAppointmentProfitSummary } from '@/hooks/backroom/useAppointmentProfit';
import {
  buildControlTowerAlerts,
  summarizePriorities,
  capAlerts,
  type ControlTowerAlert,
  type PrioritySummary,
  type AlertCategory,
  type DraftPOAlert,
} from '@/lib/backroom/control-tower-engine';

export interface ControlTowerResult {
  alerts: ControlTowerAlert[];
  overflow: number;
  summary: PrioritySummary;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Returns the 30-day period start/end for staff performance queries.
 */
function getLast30Days(): { periodStart: string; periodEnd: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    periodStart: start.toISOString().substring(0, 10),
    periodEnd: end.toISOString().substring(0, 10),
  };
}

function useDraftPOs(locationId?: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['draft-pos-for-tower', orgId, locationId],
    queryFn: async (): Promise<DraftPOAlert[]> => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, po_number, product_id, supplier_name, quantity, created_at, notes')
        .eq('organization_id', orgId!)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !data) return [];

      // Fetch product names
      const productIds = (data as any[]).map((d) => d.product_id).filter(Boolean);
      const { data: products } = await supabase
        .from('products' as any)
        .select('id, name')
        .in('id', productIds);

      const productMap = new Map((products as any[] ?? []).map((p: any) => [p.id, p.name]));

      return (data as any[]).map((po) => ({
        id: po.id,
        po_number: po.po_number ?? '',
        product_name: productMap.get(po.product_id) ?? 'Unknown',
        supplier_name: po.supplier_name ?? '',
        quantity: po.quantity ?? 0,
        created_at: po.created_at,
        notes: po.notes,
      }));
    },
    enabled: !!orgId,
    staleTime: 2 * 60_000,
  });
}

export function useControlTowerAlerts(
  locationId?: string | null,
  categoryFilter?: AlertCategory | null
): ControlTowerResult {
  const { periodStart, periodEnd } = getLast30Days();

  const inventoryQ = useHighRiskInventory(locationId);
  const exceptionsQ = useBackroomExceptions({
    status: 'open',
    locationId: locationId ?? undefined,
  });
  const staffQ = useStaffBackroomPerformance(periodStart, periodEnd, locationId ?? undefined);
  const stockoutQ = useStockoutAlerts(locationId);
  const profitQ = useAppointmentProfitSummary(periodStart, periodEnd, locationId ?? undefined);
  const draftPOsQ = useDraftPOs(locationId);

  const isLoading =
    inventoryQ.isLoading ||
    exceptionsQ.isLoading ||
    staffQ.isLoading ||
    stockoutQ.isLoading;

  const isError =
    inventoryQ.isError &&
    exceptionsQ.isError &&
    staffQ.isError &&
    stockoutQ.isError;

  const result = useMemo(() => {
    const allAlerts = buildControlTowerAlerts({
      inventoryRisk: inventoryQ.data ?? [],
      exceptions: exceptionsQ.data ?? [],
      marginOutliers: profitQ.data?.outliers ?? [],
      staffPerformance: staffQ.data ?? [],
      forecastSummary: null,
      stockoutAlerts: stockoutQ.data ?? [],
      draftPOs: draftPOsQ.data ?? [],
    });

    const filtered = categoryFilter
      ? allAlerts.filter((a) => a.category === categoryFilter)
      : allAlerts;

    const { visible, overflow } = capAlerts(filtered);
    const summary = summarizePriorities(allAlerts);

    return { alerts: visible, overflow, summary };
  }, [
    inventoryQ.data,
    exceptionsQ.data,
    profitQ.data,
    staffQ.data,
    stockoutQ.data,
    draftPOsQ.data,
    categoryFilter,
  ]);

  return {
    ...result,
    isLoading,
    isError,
  };
}
