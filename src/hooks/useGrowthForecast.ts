import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useState } from 'react';

export type Scenario = 'conservative' | 'baseline' | 'optimistic';
export type ForecastGranularity = 'quarterly' | 'monthly';
export type ForecastHorizon = 3 | 6 | 12;

// ── Quarterly types (existing) ─────────────────────────────────────

export interface GrowthDataPoint {
  period: string;
  revenue: number;
  serviceRevenue: number;
  productRevenue: number;
  confidenceLower?: number;
  confidenceUpper?: number;
  type: 'actual' | 'projected';
}

export interface AccuracyDataPoint {
  period: string;
  projected: number;
  actual: number;
  accuracy: number;
}

export interface AccuracyData {
  history: AccuracyDataPoint[];
  average: number | null;
}

export interface GrowthSummary {
  momentum: 'accelerating' | 'steady' | 'decelerating';
  lastQoQGrowth: number | null;
  yoyGrowth: number | null;
  seasonalIndices: Record<number, number>;
  trendR2: number;
  dataPoints: number;
  quartersAvailable: number;
  nextQuarterBaseline: number;
  nextQuarterLabel: string;
}

export interface GrowthForecastData {
  actuals: GrowthDataPoint[];
  scenarios: Record<Scenario, GrowthDataPoint[]>;
  insights: string[];
  accuracy: AccuracyData;
  summary: GrowthSummary;
}

// ── Monthly types (new) ────────────────────────────────────────────

export interface MonthlyDataPoint {
  period: string;       // "Jan 2025"
  month: string;        // "2025-01"
  revenue: number;
  appointments: number;
  confidenceLower?: number;
  confidenceUpper?: number;
  appointmentsLower?: number;
  appointmentsUpper?: number;
  type: 'actual' | 'projected';
}

export interface MonthlyForecastSummary {
  momentum: 'accelerating' | 'steady' | 'decelerating';
  lastMoMGrowth: number | null;
  yoyGrowth: number | null;
  revenueSeasonalIndices: Record<number, number>;
  appointmentSeasonalIndices: Record<number, number>;
  revenueTrendR2: number;
  appointmentTrendR2: number;
  dataPoints: number;
  monthsAvailable: number;
  projectedRevenue3m: number;
  projectedRevenue6m: number;
  projectedRevenue12m: number;
  projectedAppointments3m: number;
  projectedAppointments6m: number;
  projectedAppointments12m: number;
}

export interface MonthlyForecastData {
  granularity: 'monthly';
  monthlyActuals: MonthlyDataPoint[];
  monthlyScenarios: Record<Scenario, MonthlyDataPoint[]>;
  insights: string[];
  summary: MonthlyForecastSummary;
}

// ── Quarterly hook (existing, unchanged) ───────────────────────────

export function useGrowthForecast(locationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const [scenario, setScenario] = useState<Scenario>('baseline');

  const query = useQuery<GrowthForecastData>({
    queryKey: ['growth-forecast', effectiveOrganization?.id, locationId],
    queryFn: async () => {
      if (!effectiveOrganization?.id) throw new Error('No organization');

      const { data, error } = await supabase.functions.invoke('growth-forecasting', {
        body: {
          organizationId: effectiveOrganization.id,
          locationId: locationId && locationId !== 'all' ? locationId : undefined,
        },
      });

      if (error) throw error;
      return data as GrowthForecastData;
    },
    enabled: !!effectiveOrganization?.id,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 24 * 60 * 60 * 1000,
  });

  return {
    ...query,
    scenario,
    setScenario,
  };
}

// ── Monthly forecast hook (new) ────────────────────────────────────

export function useMonthlyForecast(
  locationId?: string,
  horizonMonths: ForecastHorizon = 12
) {
  const { effectiveOrganization } = useOrganizationContext();
  const [scenario, setScenario] = useState<Scenario>('baseline');

  const query = useQuery<MonthlyForecastData>({
    queryKey: ['monthly-forecast', effectiveOrganization?.id, locationId, horizonMonths],
    queryFn: async () => {
      if (!effectiveOrganization?.id) throw new Error('No organization');

      const { data, error } = await supabase.functions.invoke('growth-forecasting', {
        body: {
          organizationId: effectiveOrganization.id,
          locationId: locationId && locationId !== 'all' ? locationId : undefined,
          granularity: 'monthly',
          horizonMonths,
        },
      });

      if (error) throw error;
      return data as MonthlyForecastData;
    },
    enabled: !!effectiveOrganization?.id,
    staleTime: 4 * 60 * 60 * 1000, // 4 hours
    gcTime: 4 * 60 * 60 * 1000,
  });

  return {
    ...query,
    scenario,
    setScenario,
  };
}
