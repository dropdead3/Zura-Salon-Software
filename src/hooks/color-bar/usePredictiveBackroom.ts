/**
 * usePredictiveBackroom — Hooks for demand forecasting and stockout alerts.
 */

import { useQuery } from '@tanstack/react-query';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import {
  generateForecast,
  generateForecastSummary,
  type ProductDemandForecast,
  type ForecastSummary,
} from '@/lib/backroom/services/predictive-backroom-service';

const FORECAST_STALE_TIME = 5 * 60_000; // 5 minutes

export function useDemandForecast(locationId?: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['demand-forecast', orgId, locationId],
    queryFn: async (): Promise<ProductDemandForecast[]> => {
      return generateForecast(orgId!, locationId);
    },
    enabled: !!orgId,
    staleTime: FORECAST_STALE_TIME,
  });
}

export function useStockoutAlerts(locationId?: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['stockout-alerts', orgId, locationId],
    queryFn: async (): Promise<ProductDemandForecast[]> => {
      const forecasts = await generateForecast(orgId!, locationId);
      return forecasts.filter(
        (f) => f.stockout_risk === 'high' || f.stockout_risk === 'critical',
      );
    },
    enabled: !!orgId,
    staleTime: FORECAST_STALE_TIME,
  });
}

export function useForecastSummary(locationId?: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['forecast-summary', orgId, locationId],
    queryFn: async (): Promise<ForecastSummary> => {
      return generateForecastSummary(orgId!, locationId);
    },
    enabled: !!orgId,
    staleTime: FORECAST_STALE_TIME,
  });
}
