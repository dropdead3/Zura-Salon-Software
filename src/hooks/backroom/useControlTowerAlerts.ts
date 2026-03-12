/**
 * useControlTowerAlerts — Composes existing projection hooks into
 * a unified, priority-sorted alert stream for the Control Tower.
 */

import { useMemo } from 'react';
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
    categoryFilter,
  ]);

  return {
    ...result,
    isLoading,
    isError,
  };
}
