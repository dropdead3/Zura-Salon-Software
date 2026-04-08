import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllBatched } from '@/utils/fetchAllBatched';
import { useLocations } from '@/hooks/useLocations';
import { useMemo } from 'react';

export interface LocationBenchmarkEntry {
  locationId: string;
  locationName: string;
  totalRevenue: number;
  appointmentCount: number;
  avgTicket: number;
  uniqueClients: number;
  noShowCount: number;
  noShowPercent: number;
  rebookingCount: number;
  rebookingPercent: number;
}

export function useLocationBenchmark(dateFrom: string, dateTo: string) {
  const { data: locations } = useLocations();

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['location-benchmark', dateFrom, dateTo],
    queryFn: async () => {
      const appointments = await fetchAllBatched<{
        location_id: string | null;
        total_price: number | null;
        tip_amount: number | null;
        status: string | null;
        phorest_client_id: string | null;
        appointment_date: string;
      }>((from, to) =>
        supabase
          .from('v_all_appointments')
          .select('location_id, total_price, tip_amount, status, phorest_client_id, appointment_date')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .not('location_id', 'is', null)
          .range(from, to)
      );
      return appointments;
    },
    enabled: !!dateFrom && !!dateTo,
  });

  const entries: LocationBenchmarkEntry[] = useMemo(() => {
    if (!rawData || !locations) return [];
    const locMap = new Map(locations.map(l => [l.id, l.name]));

    const byLoc: Record<string, {
      total: number; count: number; noShow: number; allCount: number;
      clients: Set<string>; rebooked: Set<string>;
    }> = {};

    rawData.forEach(apt => {
      const lid = apt.location_id!;
      if (!byLoc[lid]) byLoc[lid] = { total: 0, count: 0, noShow: 0, allCount: 0, clients: new Set(), rebooked: new Set() };
      const b = byLoc[lid];
      b.allCount++;

      if (apt.status === 'no_show') { b.noShow++; return; }
      if (apt.status === 'cancelled') return;

      const rev = (Number(apt.total_price) || 0) - (Number(apt.tip_amount) || 0);
      b.total += rev;
      b.count++;
      if (apt.phorest_client_id) b.clients.add(apt.phorest_client_id);
    });

    return Object.entries(byLoc)
      .map(([lid, b]) => ({
        locationId: lid,
        locationName: locMap.get(lid) || 'Unknown',
        totalRevenue: b.total,
        appointmentCount: b.count,
        avgTicket: b.count > 0 ? b.total / b.count : 0,
        uniqueClients: b.clients.size,
        noShowCount: b.noShow,
        noShowPercent: b.allCount > 0 ? (b.noShow / b.allCount) * 100 : 0,
        rebookingCount: 0,
        rebookingPercent: 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [rawData, locations]);

  return { entries, isLoading };
}
