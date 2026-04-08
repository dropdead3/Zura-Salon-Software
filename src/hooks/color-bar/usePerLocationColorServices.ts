/**
 * usePerLocationColorServices — Returns average daily color/chemical
 * service counts grouped by location for the last 90 days.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useColorBarOrgId } from './useColorBarOrgId';
import { isColorOrChemicalService } from '@/utils/serviceCategorization';

import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface LocationColorMetrics {
  locationId: string;
  totalColorServices: number;
  avgDailyColorServices: number;
  recommendedScales: number;
}

export function usePerLocationColorServices() {
  const orgId = useColorBarOrgId();

  return useQuery<Map<string, LocationColorMetrics>>({
    queryKey: ['per-location-color-services', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('No org');

      const now = new Date();
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(now.getDate() - 90);
      const dateFrom = ninetyDaysAgo.toISOString().split('T')[0];
      const dateTo = now.toISOString().split('T')[0];

      const appointments = await fetchAllBatched<{
        id: string;
        service_name: string | null;
        service_category: string | null;
        appointment_date: string;
        location_id: string | null;
      }>((from, to) =>
        supabase
          .from('phorest_appointments')
          .select('id, service_name, service_category, appointment_date, location_id')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .in('status', ['completed', 'confirmed', 'checked_in', 'in_progress'])
          .range(from, to),
      );

      // Filter to color/chemical and group by location
      const byLocation = new Map<string, { dates: Set<string>; count: number }>();

      for (const a of appointments) {
        if (!a.location_id) continue;
        if (!isColorOrChemicalService(a.service_name, a.service_category)) continue;

        let entry = byLocation.get(a.location_id);
        if (!entry) {
          entry = { dates: new Set(), count: 0 };
          byLocation.set(a.location_id, entry);
        }
        entry.count++;
        entry.dates.add(a.appointment_date);
      }

      const result = new Map<string, LocationColorMetrics>();

      for (const [locationId, { dates, count }] of byLocation) {
        const windowDays = Math.max(1, dates.size);
        const avgDaily = Math.round((count / windowDays) * 10) / 10;
        result.set(locationId, {
          locationId,
          totalColorServices: count,
          avgDailyColorServices: avgDaily,
          recommendedScales: Math.max(1, Math.ceil(avgDaily / 10)),
        });
      }

      return result;
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 30,
  });
}
