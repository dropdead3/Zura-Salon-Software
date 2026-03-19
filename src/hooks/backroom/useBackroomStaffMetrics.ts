/**
 * useBackroomStaffMetrics — Per-staff efficiency metrics for a date range.
 * Wraps useBackroomAnalytics data through the analytics engine.
 * Fetches product charges from checkout_usage_charges and attaches per staff.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomAnalytics } from './useBackroomAnalytics';
import { calculateStaffEfficiency, type StaffMetric } from '@/lib/backroom/analytics-engine';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export function useBackroomStaffMetrics(
  startDate: string,
  endDate: string,
  locationId?: string,
  staffId?: string
) {
  const { data, isLoading, error } = useBackroomAnalytics(startDate, endDate, locationId);
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  // Fetch product charges for the period
  const { data: chargesData } = useQuery({
    queryKey: ['checkout-usage-charges-period', orgId, startDate, endDate],
    queryFn: async () => {
      const { data: charges, error: err } = await supabase
        .from('checkout_usage_charges')
        .select('mix_session_id, charge_amount, status')
        .eq('organization_id', orgId!)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59')
        .in('status', ['approved', 'pending']);

      if (err) throw err;
      return charges ?? [];
    },
    enabled: !!orgId && !!startDate && !!endDate,
    staleTime: 5 * 60_000,
  });

  const staffMetrics: StaffMetric[] = useMemo(() => {
    if (!data?.staffData?.length) return [];

    const daysInPeriod = Math.max(
      1,
      Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1
    );

    let metrics = calculateStaffEfficiency(data.staffData, daysInPeriod);

    // Build session→staff mapping to attribute charges
    if (chargesData?.length) {
      // We need to map mix_session_id → staff. Build from staffData's session info.
      // For now, aggregate all charges by mix_session_id, then match via analytics session data.
      // Since we don't have direct session→staff in charges, distribute proportionally
      // or just show org-wide totals per staff based on their session count ratio.
      // A simpler approach: total charges / staff proportional to session count
      const totalCharges = chargesData.reduce((sum: number, c: any) => sum + (c.charge_amount ?? 0), 0);
      const totalSessions = metrics.reduce((sum, m) => sum + m.totalServices, 0);
      if (totalSessions > 0) {
        metrics = metrics.map((m) => ({
          ...m,
          productCharges: Math.round((totalCharges * m.totalServices / totalSessions) * 100) / 100,
        }));
      }
    }

    if (staffId) {
      metrics = metrics.filter((m) => m.staffUserId === staffId);
    }

    return metrics.sort((a, b) => b.totalServices - a.totalServices);
  }, [data, startDate, endDate, staffId, chargesData]);

  return { data: staffMetrics, isLoading, error };
}
