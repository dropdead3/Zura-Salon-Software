import { useQuery } from '@tanstack/react-query';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { format, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import {
  fetchRevenue,
  fetchAvgTicket,
  fetchRetailRevenue,
  fetchNoShowRate,
  fetchRebookRate,
  fetchNewClientPct,
} from '@/lib/goal-metric-fetchers';

export interface GoalMetricResult {
  currentValue: number | null;
  projectedValue: number | null;
  isLoading: boolean;
}

/**
 * Returns the live current value and projected end-of-period value
 * for a given metric_key + goal_period.
 */
export function useGoalCurrentValue(
  metricKey: string,
  goalPeriod: string = 'monthly',
  locationId?: string | null,
): GoalMetricResult {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const now = new Date();
  const periodStart = startOfMonth(now);
  const periodEnd = endOfMonth(now);
  const dateFrom = format(periodStart, 'yyyy-MM-dd');
  const dateTo = format(now, 'yyyy-MM-dd');
  const daysTotal = differenceInDays(periodEnd, periodStart) + 1;
  const daysElapsed = Math.max(differenceInDays(now, periodStart) + 1, 1);

  const { data, isLoading } = useQuery({
    queryKey: ['goal-metric', metricKey, goalPeriod, orgId, locationId, dateFrom],
    queryFn: async (): Promise<number | null> => {
      switch (metricKey) {
        case 'monthly_revenue':
          return fetchRevenue(dateFrom, dateTo, locationId);

        case 'avg_ticket': {
          const result = await fetchAvgTicket(dateFrom, dateTo, locationId);
          return result.avg;
        }

        case 'retail_revenue':
          return fetchRetailRevenue(dateFrom, dateTo, locationId);

        case 'noshow_rate': {
          const result = await fetchNoShowRate(dateFrom, dateTo, locationId);
          return result.rate;
        }

        case 'rebook_rate': {
          const result = await fetchRebookRate(dateFrom, dateTo, locationId);
          return result.rate;
        }

        case 'new_client_pct': {
          const result = await fetchNewClientPct(dateFrom, dateTo, locationId);
          return result.rate;
        }

        // Metrics that need more complex data pipelines — return null gracefully
        case 'labor_cost_pct':
        case 'net_margin':
        case 'product_cost_pct':
        case 'client_retention':
        case 'utilization_rate':
        case 'staff_goal_participation':
        case 'revenue_per_stylist':
          return null;

        default:
          return null;
      }
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const currentValue = data ?? null;
  let projectedValue: number | null = null;

  if (currentValue !== null && daysElapsed > 0) {
    // Only project cumulative metrics, not ratios
    const cumulativeMetrics = ['monthly_revenue', 'retail_revenue'];
    if (cumulativeMetrics.includes(metricKey)) {
      const dailyRate = currentValue / daysElapsed;
      projectedValue = dailyRate * daysTotal;
    }
  }

  return { currentValue, projectedValue, isLoading };
}
