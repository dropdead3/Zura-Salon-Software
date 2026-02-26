import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { format, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

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

        case 'avg_ticket':
          return fetchAvgTicket(dateFrom, dateTo, locationId);

        case 'retail_revenue':
          return fetchRetailRevenue(dateFrom, dateTo, locationId);

        case 'noshow_rate':
          return fetchNoShowRate(dateFrom, dateTo, locationId);

        case 'rebook_rate':
          return fetchRebookRate(dateFrom, dateTo, locationId);

        case 'new_client_pct':
          return fetchNewClientPct(dateFrom, dateTo, locationId);

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

// ── Data fetchers ──

async function fetchRevenue(
  dateFrom: string,
  dateTo: string,
  locationId?: string | null,
): Promise<number> {
  let query = supabase
    .from('phorest_appointments')
    .select('total_price')
    .gte('appointment_date', dateFrom)
    .lte('appointment_date', dateTo)
    .not('status', 'in', '("cancelled","no_show")')
    .not('total_price', 'is', null);

  if (locationId && locationId !== 'all') {
    query = query.eq('location_id', locationId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data?.reduce((sum, r) => sum + (Number(r.total_price) || 0), 0) ?? 0;
}

async function fetchAvgTicket(
  dateFrom: string,
  dateTo: string,
  locationId?: string | null,
): Promise<number | null> {
  let query = supabase
    .from('phorest_appointments')
    .select('total_price')
    .gte('appointment_date', dateFrom)
    .lte('appointment_date', dateTo)
    .not('status', 'in', '("cancelled","no_show")')
    .not('total_price', 'is', null)
    .gt('total_price', 0);

  if (locationId && locationId !== 'all') {
    query = query.eq('location_id', locationId);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return null;
  const total = data.reduce((sum, r) => sum + (Number(r.total_price) || 0), 0);
  return total / data.length;
}

async function fetchRetailRevenue(
  dateFrom: string,
  dateTo: string,
  locationId?: string | null,
): Promise<number> {
  let query = supabase
    .from('phorest_transaction_items')
    .select('total_amount')
    .gte('transaction_date', dateFrom)
    .lte('transaction_date', dateTo)
    .eq('item_type', 'product')
    .not('total_amount', 'is', null);

  if (locationId && locationId !== 'all') {
    query = query.eq('location_id', locationId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data?.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0) ?? 0;
}

async function fetchNoShowRate(
  dateFrom: string,
  dateTo: string,
  locationId?: string | null,
): Promise<number | null> {
  let totalQ = supabase
    .from('phorest_appointments')
    .select('id', { count: 'exact', head: true })
    .gte('appointment_date', dateFrom)
    .lte('appointment_date', dateTo)
    .not('status', 'in', '("cancelled")');

  let noshowQ = supabase
    .from('phorest_appointments')
    .select('id', { count: 'exact', head: true })
    .gte('appointment_date', dateFrom)
    .lte('appointment_date', dateTo)
    .eq('status', 'no_show');

  if (locationId && locationId !== 'all') {
    totalQ = totalQ.eq('location_id', locationId);
    noshowQ = noshowQ.eq('location_id', locationId);
  }

  const [totalRes, noshowRes] = await Promise.all([totalQ, noshowQ]);
  if (totalRes.error) throw totalRes.error;
  if (noshowRes.error) throw noshowRes.error;
  const total = totalRes.count ?? 0;
  if (total === 0) return null;
  return ((noshowRes.count ?? 0) / total) * 100;
}

async function fetchRebookRate(
  dateFrom: string,
  dateTo: string,
  locationId?: string | null,
): Promise<number | null> {
  let query = supabase
    .from('phorest_appointments')
    .select('rebooked_at_checkout')
    .gte('appointment_date', dateFrom)
    .lte('appointment_date', dateTo)
    .not('status', 'in', '("cancelled","no_show")');

  if (locationId && locationId !== 'all') {
    query = query.eq('location_id', locationId);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return null;
  const rebooked = data.filter(r => r.rebooked_at_checkout === true).length;
  return (rebooked / data.length) * 100;
}

async function fetchNewClientPct(
  dateFrom: string,
  dateTo: string,
  locationId?: string | null,
): Promise<number | null> {
  let query = supabase
    .from('phorest_appointments')
    .select('is_new_client')
    .gte('appointment_date', dateFrom)
    .lte('appointment_date', dateTo)
    .not('status', 'in', '("cancelled","no_show")');

  if (locationId && locationId !== 'all') {
    query = query.eq('location_id', locationId);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return null;
  const newClients = data.filter(r => r.is_new_client === true).length;
  return (newClients / data.length) * 100;
}
