/**
 * usePredictiveColorBar — Hooks for demand forecasting and stockout alerts.
 */

import { useQuery } from '@tanstack/react-query';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useReconciliationFlaggedLocations } from './useReconciliationFlaggedLocations';
import {
  generateForecast,
  generateForecastSummary,
  type ProductDemandForecast,
  type ForecastSummary,
} from '@/lib/color-bar/services/predictive-color-bar-service';

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
  const { isFlagged, flaggedLocationIds } = useReconciliationFlaggedLocations();

  return useQuery({
    queryKey: ['stockout-alerts', orgId, locationId, Array.from(flaggedLocationIds).sort().join(',')],
    queryFn: async (): Promise<ProductDemandForecast[]> => {
      // Doctrine: data integrity gate. If this location is flagged for
      // reconciliation, suppress stockout alerts entirely — quantities
      // can't be trusted until inventory is verified.
      if (locationId && isFlagged(locationId)) return [];

      const forecasts = await generateForecast(orgId!, locationId);
      const filtered = forecasts.filter(
        (f) => f.stockout_risk === 'high' || f.stockout_risk === 'critical',
      );

      // When viewing org-wide (no locationId), drop alerts for any
      // location currently flagged for reconciliation.
      if (!locationId && flaggedLocationIds.size > 0) {
        return filtered.filter((f: any) => !f.location_id || !flaggedLocationIds.has(f.location_id));
      }
      return filtered;
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
