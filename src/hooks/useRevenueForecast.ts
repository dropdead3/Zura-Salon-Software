import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface DailyForecast {
  date: string;
  predictedRevenue: number;
  predictedServices: number;
  predictedProducts: number;
  confidence: 'high' | 'medium' | 'low';
  factors: string[];
}

export interface ForecastSummary {
  totalPredicted: number;
  avgDaily: number;
  trend: 'up' | 'down' | 'stable';
  peakDay?: string;
  keyInsight: string;
}

export interface RevenueForecastResponse {
  success: boolean;
  forecasts: DailyForecast[];
  summary: ForecastSummary;
  historicalDataPoints: number;
  gapAdjustmentFactor?: number;
  realizationRate?: number;
  realizationDataPoints?: number;
}

interface UseForecastParams {
  forecastDays?: number;
  locationId?: string;
  forecastType?: 'daily' | 'weekly' | 'monthly';
}

export function useRevenueForecast({
  forecastDays = 7,
  locationId,
  forecastType = 'daily',
}: UseForecastParams = {}) {
  const { effectiveOrganization } = useOrganizationContext();

  return useQuery({
    queryKey: ['revenue-forecast', effectiveOrganization?.id, forecastDays, locationId, forecastType],
    queryFn: async (): Promise<RevenueForecastResponse> => {
      if (!effectiveOrganization?.id) {
        throw new Error('No organization context');
      }

      const { data, error } = await supabase.functions.invoke('revenue-forecasting', {
        body: {
          organizationId: effectiveOrganization.id,
          locationId,
          forecastDays,
          forecastType,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to get forecast');

      return data;
    },
    enabled: !!effectiveOrganization?.id,
    staleTime: 30 * 60 * 1000, // 30 minutes - forecasts don't change often
    refetchOnWindowFocus: false,
  });
}

export function useForecastAccuracy(days = 30) {
  const { effectiveOrganization } = useOrganizationContext();

  return useQuery({
    queryKey: ['forecast-accuracy', effectiveOrganization?.id, days],
    queryFn: async () => {
      if (!effectiveOrganization?.id) return { accuracy: 0, comparisons: [] };

      // Get past forecasts with actual values filled in
      const { data, error } = await supabase
        .from('revenue_forecasts')
        .select('forecast_date, predicted_revenue, actual_revenue, accuracy_score')
        .eq('organization_id', effectiveOrganization.id)
        .not('actual_revenue', 'is', null)
        .order('forecast_date', { ascending: false })
        .limit(days);

      if (error) throw error;

      const comparisons = (data || []).map(f => ({
        date: f.forecast_date,
        predicted: f.predicted_revenue,
        actual: f.actual_revenue,
        accuracy: f.accuracy_score,
      }));

      const avgAccuracy = comparisons.length > 0
        ? comparisons.reduce((sum, c) => sum + (c.accuracy || 0), 0) / comparisons.length
        : 0;

      return {
        accuracy: Math.round(avgAccuracy),
        comparisons,
      };
    },
    enabled: !!effectiveOrganization?.id,
  });
}
