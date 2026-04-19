import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Wave 15a: Catalog-level booking volume fetch.
 *
 * Returns the trailing 30-day completed-appointment count per service for the
 * given organization. Powers the volume column + sparkline on the Service
 * Catalog rows so owners can see at a glance which services are pulling
 * weight and which are zombies (zero bookings in window).
 *
 * Sparkline buckets: 6 weekly bins covering the last ~30d window so the line
 * has enough resolution to show trend without overwhelming the row.
 */
export interface ServiceVolumeEntry {
  count30d: number;
  buckets: number[]; // length 6, oldest → newest weekly counts
}

export function useServiceBookingVolumes(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ['service-booking-volumes', organizationId],
    queryFn: async (): Promise<Record<string, ServiceVolumeEntry>> => {
      if (!organizationId) return {};
      const since = new Date();
      since.setDate(since.getDate() - 42); // 6 weeks for sparkline trend
      const sinceStr = since.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('appointments')
        .select('service_id, appointment_date')
        .eq('organization_id', organizationId)
        .gte('appointment_date', sinceStr)
        .in('status', ['completed', 'checked_out', 'finished']);
      if (error) throw error;

      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result: Record<string, ServiceVolumeEntry> = {};
      for (const row of data ?? []) {
        const sid = (row as { service_id: string | null }).service_id;
        const dateStr = (row as { appointment_date: string | null }).appointment_date;
        if (!sid || !dateStr) continue;
        if (!result[sid]) result[sid] = { count30d: 0, buckets: [0, 0, 0, 0, 0, 0] };
        const apptDate = new Date(dateStr);
        const daysAgo = Math.floor((now.getTime() - apptDate.getTime()) / (1000 * 60 * 60 * 24));
        // Bucket index: 0 = oldest (35-42d ago), 5 = newest (0-7d ago)
        const bucketIdx = Math.min(5, Math.max(0, 5 - Math.floor(daysAgo / 7)));
        result[sid].buckets[bucketIdx] += 1;
        if (apptDate >= thirtyDaysAgo) result[sid].count30d += 1;
      }
      return result;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}
