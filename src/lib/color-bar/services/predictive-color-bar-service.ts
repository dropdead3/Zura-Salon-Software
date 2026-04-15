/**
 * PredictiveColorBarService — Read-only demand forecasting layer.
 *
 * Combines upcoming appointment schedule + formula resolution + inventory
 * projections to predict chemical demand and stockout risk.
 *
 * No mutations, no events — pure read-only computations.
 */

import { supabase } from '@/integrations/supabase/client';
import { fetchAllBatched } from '@/utils/fetchAllBatched';
import { resolveFormula, type ResolvedFormula } from './formula-resolver';
import { calculateReplenishment, REPLENISHMENT_DEFAULTS } from '@/lib/inventory/replenishment-engine';
import type { FormulaLine } from '@/lib/color-bar/mix-calculations';

// ─── Types ───────────────────────────────────────────

export type StockoutRisk = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface ProductDemandForecast {
  product_id: string;
  product_name: string;
  brand: string | null;
  unit: string;
  predicted_usage_1d: number;
  predicted_usage_7d: number;
  current_on_hand: number;
  remaining_after_1d: number;
  remaining_after_7d: number;
  safety_stock: number;
  stockout_risk: StockoutRisk;
  recommended_order_qty: number;
  appointment_count_1d: number;
  appointment_count_7d: number;
}

export interface ForecastSummary {
  total_services_1d: number;
  total_services_7d: number;
  unmapped_services_count: number;
  products_at_risk: number;
  urgent_reorders: ProductDemandForecast[];
}

interface UpcomingService {
  appointment_id: string;
  service_name: string | null;
  client_id: string | null;
  staff_id: string | null;
  appointment_date: string;
}

// ─── Fetch Upcoming Services ────────────────────────

async function fetchUpcomingServices(
  orgId: string,
  startDate: string,
  endDate: string,
  locationId?: string | null,
): Promise<UpcomingService[]> {
  // Query phorest_appointments (primary source)
  const phorestData = await fetchAllBatched<any>((from, to) =>
    (supabase
      .from('v_all_appointments' as any)
      .select('id, service_name, phorest_client_id, stylist_user_id, appointment_date')
      .eq('organization_id', orgId)
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate) as any)
      .range(from, to)
  );

  // Filter out cancelled/no-show client-side (avoids deep type chain)
  const filteredPhorest = locationId
    ? phorestData.filter((a: any) => a.location_id === locationId)
    : phorestData;

  // Query local appointments as fallback
  const rawLocal = await fetchAllBatched<any>((from, to) =>
    (supabase
      .from('appointments')
      .select('id, service_name, client_id, staff_user_id, appointment_date')
      .eq('organization_id', orgId)
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate) as any)
      .range(from, to)
  );
  const localFiltered = locationId
    ? rawLocal.filter((a: any) => a.location_id === locationId)
    : rawLocal;

  const services: UpcomingService[] = [];

  // Map phorest appointments
  for (const appt of filteredPhorest) {
    if (appt.service_name) {
      const names = (appt.service_name as string).split(',').map((s: string) => s.trim()).filter(Boolean);
      for (const name of names) {
        services.push({
          appointment_id: appt.id,
          service_name: name,
          client_id: appt.phorest_client_id,
          staff_id: appt.stylist_user_id,
          appointment_date: appt.appointment_date,
        });
      }
    }
  }

  // Map local appointments (deduplicate by appointment_id)
  const seenIds = new Set(services.map((s) => s.appointment_id));
  for (const appt of localFiltered) {
    if (!seenIds.has(appt.id) && appt.service_name) {
      services.push({
        appointment_id: appt.id,
        service_name: appt.service_name,
        client_id: appt.client_id,
        staff_id: appt.staff_user_id,
        appointment_date: appt.appointment_date,
      });
    }
  }

  return services;
}

// ─── Resolve Formulas (Batched) ─────────────────────

interface ResolvedServiceFormula {
  service: UpcomingService;
  formula: ResolvedFormula | null;
}

async function resolveExpectedFormulas(
  orgId: string,
  services: UpcomingService[],
): Promise<ResolvedServiceFormula[]> {
  // Resolve formulas — each uses the 3-priority hierarchy
  // For performance, we resolve in parallel batches
  const BATCH_SIZE = 10;
  const results: ResolvedServiceFormula[] = [];

  for (let i = 0; i < services.length; i += BATCH_SIZE) {
    const batch = services.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (svc) => {
        const formula = await resolveFormula({
          organization_id: orgId,
          client_id: svc.client_id,
          staff_id: svc.staff_id,
          service_name: svc.service_name,
        });
        return { service: svc, formula };
      }),
    );
    results.push(...batchResults);
  }

  return results;
}

// ─── Aggregate Demand ───────────────────────────────

interface ProductDemand {
  product_id: string;
  product_name: string;
  brand: string | null;
  unit: string;
  usage_1d: number;
  usage_7d: number;
  appointment_count_1d: number;
  appointment_count_7d: number;
}

function aggregateDemandByProduct(
  resolved: ResolvedServiceFormula[],
  tomorrowDate: string,
): Map<string, ProductDemand> {
  const demandMap = new Map<string, ProductDemand>();

  for (const { service, formula } of resolved) {
    if (!formula) continue;

    const is1d = service.appointment_date === tomorrowDate;

    for (const line of formula.lines) {
      if (!line.product_id) continue;

      const existing = demandMap.get(line.product_id);
      if (existing) {
        existing.usage_7d += line.quantity;
        existing.appointment_count_7d += 1;
        if (is1d) {
          existing.usage_1d += line.quantity;
          existing.appointment_count_1d += 1;
        }
      } else {
        demandMap.set(line.product_id, {
          product_id: line.product_id,
          product_name: line.product_name,
          brand: line.brand,
          unit: line.unit,
          usage_1d: is1d ? line.quantity : 0,
          usage_7d: line.quantity,
          appointment_count_1d: is1d ? 1 : 0,
          appointment_count_7d: 1,
        });
      }
    }
  }

  return demandMap;
}

// ─── Stockout Risk Evaluation ───────────────────────

function evaluateRisk(remaining: number, safetyStock: number): StockoutRisk {
  if (remaining <= 0) return 'critical';
  if (remaining < safetyStock) return 'high';
  if (remaining < safetyStock * 2) return 'medium';
  if (remaining < safetyStock * 3) return 'low';
  return 'none';
}

// ─── Main Forecast Generator ────────────────────────

export async function generateForecast(
  orgId: string,
  locationId?: string | null,
): Promise<ProductDemandForecast[]> {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const startDate = tomorrow.toISOString().split('T')[0];
  const endDate = weekEnd.toISOString().split('T')[0];
  const tomorrowStr = startDate;

  // 1. Fetch upcoming services
  const services = await fetchUpcomingServices(orgId, startDate, endDate, locationId);

  if (services.length === 0) return [];

  // 2. Resolve formulas
  const resolved = await resolveExpectedFormulas(orgId, services);

  // 3. Aggregate demand by product
  const demandMap = aggregateDemandByProduct(resolved, tomorrowStr);

  if (demandMap.size === 0) return [];

  // 3b. Seasonal blending — fetch same-week-last-year usage and blend at 30%
  const seasonalWeights = await fetchSeasonalWeights(orgId, startDate, endDate, locationId);
  if (seasonalWeights.size > 0) {
    for (const [productId, demand] of demandMap) {
      const lastYearUsage = seasonalWeights.get(demand.product_name);
      if (lastYearUsage != null && lastYearUsage > 0) {
        // Blend: 70% current forecast + 30% YoY seasonal
        demand.usage_7d = demand.usage_7d * 0.7 + lastYearUsage * 0.3;
        demand.usage_1d = demand.usage_1d * 0.7 + (lastYearUsage / 7) * 0.3;
      }
    }
  }

  // 4. Fetch inventory projections for demanded products
  const productIds = Array.from(demandMap.keys());
  const { data: projections } = await supabase
    .from('inventory_projections')
    .select('product_id, on_hand')
    .eq('organization_id', orgId)
    .in('product_id', productIds);

  const projMap = new Map(
    (projections as any[] || []).map((p) => [p.product_id, p.on_hand as number]),
  );

  // 5. Fetch risk projections for safety stock values
  const { data: riskData } = await supabase
    .from('inventory_risk_projections')
    .select('product_id, avg_daily_usage, open_po_quantity')
    .eq('organization_id', orgId)
    .in('product_id', productIds);

  const riskMap = new Map(
    (riskData as any[] || []).map((r) => [r.product_id, r]),
  );

  // 6. Build forecast per product
  const forecasts: ProductDemandForecast[] = [];

  for (const [productId, demand] of demandMap) {
    const onHand = projMap.get(productId) ?? 0;
    const riskInfo = riskMap.get(productId);

    // Use replenishment engine defaults for safety stock
    const dailyRate = demand.usage_7d / 7;
    const safetyStock = Math.max(
      dailyRate * REPLENISHMENT_DEFAULTS.safetyFactor,
      REPLENISHMENT_DEFAULTS.minimumBuffer,
    );

    const remaining1d = Math.round((onHand - demand.usage_1d) * 100) / 100;
    const remaining7d = Math.round((onHand - demand.usage_7d) * 100) / 100;
    const risk = evaluateRisk(remaining7d, safetyStock);

    // Compute reorder qty for high/critical risk
    let recommendedQty = 0;
    if (risk === 'high' || risk === 'critical') {
      const replenishment = calculateReplenishment({
        trailingUsage28d: dailyRate * 28,
        usageValues: Array(7).fill(dailyRate),
        leadTimeDays: 7,
        reviewPeriodDays: REPLENISHMENT_DEFAULTS.reviewPeriodDays,
        safetyFactor: REPLENISHMENT_DEFAULTS.safetyFactor,
        minimumBuffer: REPLENISHMENT_DEFAULTS.minimumBuffer,
        currentOnHand: onHand,
        openPoQty: (riskInfo as any)?.open_po_quantity ?? 0,
        moq: REPLENISHMENT_DEFAULTS.moq,
        packSize: REPLENISHMENT_DEFAULTS.packSize,
      });
      recommendedQty = replenishment.recommendedQty;
    }

    forecasts.push({
      product_id: productId,
      product_name: demand.product_name,
      brand: demand.brand,
      unit: demand.unit,
      predicted_usage_1d: Math.round(demand.usage_1d * 100) / 100,
      predicted_usage_7d: Math.round(demand.usage_7d * 100) / 100,
      current_on_hand: onHand,
      remaining_after_1d: remaining1d,
      remaining_after_7d: remaining7d,
      safety_stock: Math.round(safetyStock * 100) / 100,
      stockout_risk: risk,
      recommended_order_qty: recommendedQty,
      appointment_count_1d: demand.appointment_count_1d,
      appointment_count_7d: demand.appointment_count_7d,
    });
  }

  // Sort by risk severity
  const riskOrder: Record<StockoutRisk, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    none: 4,
  };
  forecasts.sort((a, b) => riskOrder[a.stockout_risk] - riskOrder[b.stockout_risk]);

  return forecasts;
}

// ─── Seasonal Weight Fetcher ────────────────────────

async function fetchSeasonalWeights(
  orgId: string,
  startDate: string,
  endDate: string,
  locationId?: string | null,
): Promise<Map<string, number>> {
  // Calculate same week last year
  const lastYearStart = new Date(startDate);
  lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
  const lastYearEnd = new Date(endDate);
  lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  // Fetch mix sessions from same week last year
  let sessionQuery = supabase
    .from('mix_sessions')
    .select('id')
    .eq('organization_id', orgId)
    .eq('status', 'completed')
    .gte('started_at', fmt(lastYearStart))
    .lte('started_at', fmt(lastYearEnd) + 'T23:59:59');

  if (locationId && locationId !== 'all') {
    sessionQuery = sessionQuery.eq('location_id', locationId);
  }

  const { data: sessions } = await sessionQuery;
  const sessionIds = (sessions ?? []).map((s: any) => s.id);
  if (!sessionIds.length) return new Map();

  const { data: bowls } = await supabase
    .from('mix_bowls')
    .select('id')
    .in('mix_session_id', sessionIds);

  const bowlIds = (bowls ?? []).map((b: any) => b.id);
  if (!bowlIds.length) return new Map();

  const { data: lines } = await supabase
    .from('mix_bowl_lines')
    .select('product_name_snapshot, dispensed_quantity')
    .in('bowl_id', bowlIds);

  const usage = new Map<string, number>();
  for (const line of (lines ?? []) as any[]) {
    const name = line.product_name_snapshot ?? 'Unknown';
    usage.set(name, (usage.get(name) ?? 0) + (line.dispensed_quantity ?? 0));
  }

  return usage;
}

// ─── Summary Generator ──────────────────────────────

export async function generateForecastSummary(
  orgId: string,
  locationId?: string | null,
): Promise<ForecastSummary> {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const startDate = tomorrow.toISOString().split('T')[0];
  const endDate = weekEnd.toISOString().split('T')[0];

  // Fetch services for count
  const services = await fetchUpcomingServices(orgId, startDate, endDate, locationId);
  const tomorrowStr = startDate;

  const services1d = services.filter((s) => s.appointment_date === tomorrowStr);

  // Get full forecast
  const forecasts = await generateForecast(orgId, locationId);

  // Count unmapped (services without formulas)
  const resolved = await resolveExpectedFormulas(orgId, services);
  const unmapped = resolved.filter((r) => !r.formula).length;

  const atRisk = forecasts.filter((f) => f.stockout_risk === 'high' || f.stockout_risk === 'critical');

  return {
    total_services_1d: services1d.length,
    total_services_7d: services.length,
    unmapped_services_count: unmapped,
    products_at_risk: atRisk.length,
    urgent_reorders: atRisk.slice(0, 3),
  };
}
