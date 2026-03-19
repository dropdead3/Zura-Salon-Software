/**
 * useBackroomDashboard — Composition hook aggregating existing backroom hooks
 * into a single shaped result for the overview command center.
 */

import { useMemo, useState, useEffect, useRef } from 'react';
import { useBackroomAnalytics } from './useBackroomAnalytics';
import { useControlTowerAlerts } from './useControlTowerAlerts';
import { useStockoutAlerts } from './usePredictiveBackroom';
import { useBackroomStaffMetrics } from './useBackroomStaffMetrics';
import { useReorderAnalytics, useProcurementBudget } from './useReorderAnalytics';
import { useBackroomSetupHealth } from './useBackroomSetupHealth';
import { useHighRiskInventory } from '@/hooks/inventory/useInventoryRiskProjection';

function getLast30Days() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().substring(0, 10),
    endDate: end.toISOString().substring(0, 10),
  };
}

export function useBackroomDashboard(locationId?: string, startDateOverride?: string, endDateOverride?: string) {
  const { startDate: defaultStart, endDate: defaultEnd } = getLast30Days();
  const startDate = startDateOverride || defaultStart;
  const endDate = endDateOverride || defaultEnd;

  const analyticsQ = useBackroomAnalytics(startDate, endDate, locationId);
  const controlTowerQ = useControlTowerAlerts(locationId);
  const stockoutQ = useStockoutAlerts(locationId);
  const staffQ = useBackroomStaffMetrics(startDate, endDate, locationId);
  const reorderQ = useReorderAnalytics();
  const budgetQ = useProcurementBudget();
  const setupQ = useBackroomSetupHealth();
  const inventoryRiskQ = useHighRiskInventory(locationId);

  const isLoading =
    analyticsQ.isLoading || controlTowerQ.isLoading || staffQ.isLoading || reorderQ.isLoading || setupQ.isLoading;

  // Track last-updated timestamp
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const wasLoading = useRef(false);
  useEffect(() => {
    if (wasLoading.current && !isLoading) {
      setLastUpdatedAt(new Date());
    }
    wasLoading.current = isLoading;
  }, [isLoading]);

  const kpis = useMemo(() => {
    const a = analyticsQ.data;
    const budget = budgetQ.budget;
    const reorder = reorderQ.data;

    const budgetPct =
      budget && budget.monthly_budget > 0 && reorder
        ? Math.round((reorder.currentMonthSpend / budget.monthly_budget) * 100)
        : null;

    return {
      chemicalCostPerService: a?.avgChemicalCostPerService ?? 0,
      wasteRate: a?.wastePct ?? 0,
      reweighCompliance: a?.reweighCompliancePct ?? 0,
      stockoutAlertCount: stockoutQ.data?.length ?? 0,
      budgetPct,
      monthlyBudget: budget?.monthly_budget ?? 0,
      currentMonthSpend: reorder?.currentMonthSpend ?? 0,
      alertThreshold: budget?.alert_threshold_pct ?? 80,
    };
  }, [analyticsQ.data, stockoutQ.data, budgetQ.budget, reorderQ.data]);

  const staffSummary = useMemo(() => {
    const metrics = staffQ.data ?? [];
    if (!metrics.length) return { top: [], bottom: [] };
    const sorted = [...metrics].sort((a, b) => a.wastePct - b.wastePct);
    return {
      top: sorted.slice(0, 3),
      bottom: sorted.length > 3 ? sorted.slice(-3).reverse() : [],
    };
  }, [staffQ.data]);

  const inventoryHealth = useMemo(() => {
    const items = inventoryRiskQ.data ?? [];
    return {
      critical: items.filter((i) => i.stockout_risk_level === 'critical').length,
      high: items.filter((i) => i.stockout_risk_level === 'high').length,
      medium: items.filter((i) => i.stockout_risk_level === 'medium').length,
      total: items.length,
    };
  }, [inventoryRiskQ.data]);

  const setupHealth = useMemo(() => {
    if (!setupQ.data) return null;
    const h = setupQ.data;
    const steps = [
      { label: 'Products', done: h.trackedProducts > 0 },
      { label: 'Services', done: h.trackedServices > 0 },
      { label: 'Formulas', done: h.recipesConfigured > 0 },
      { label: 'Allowances', done: h.allowancePolicies > 0 },
      { label: 'Stations', done: h.stationsConfigured > 0 },
      { label: 'Alerts', done: h.alertRulesConfigured > 0 },
    ];
    return {
      steps,
      completed: steps.filter(s => s.done).length,
      total: steps.length,
      isComplete: steps.every(s => s.done),
      warnings: h.warnings,
    };
  }, [setupQ.data]);

  return {
    isLoading,
    lastUpdatedAt,
    kpis,
    alerts: controlTowerQ.alerts,
    alertSummary: controlTowerQ.summary,
    staffSummary,
    inventoryHealth,
    setupHealth,
    reorderData: reorderQ.data,
    budgetData: budgetQ.budget,
  };
}
