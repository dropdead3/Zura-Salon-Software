import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { getServiceCategory } from '@/utils/serviceCategorization';

const HIGH_TICKET_CATEGORIES = ['Blonding', 'Extensions'] as const;

export interface EntryServiceBreakdown {
  category: string;
  count: number;
  percentage: number;
  convertedCount: number;
  conversionRate: number;
}

export interface NewClientConversionData {
  totalNewClients: number;
  totalConverted: number;
  overallConversionRate: number;
  avgDaysToConvert: number | null;
  entryServices: EntryServiceBreakdown[];
}

/**
 * Fetches all phorest_appointments, groups by client, determines first-visit category
 * and whether they later booked a high-ticket service.
 * Uses earliest appointment as "new client" entry (fallback when is_new_client flag is unpopulated).
 */
export function useNewClientConversion(
  dateFrom?: string,
  dateTo?: string,
  locationId?: string
) {
  const query = useQuery({
    queryKey: ['new-client-conversion', dateFrom, dateTo, locationId],
    queryFn: async () => {
      const allData: any[] = [];
      const PAGE_SIZE = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        let q = supabase
          .from('v_all_appointments' as any)
          .select('phorest_client_id, appointment_date, service_name, status')
          .not('phorest_client_id', 'is', null)
          .not('status', 'in', '("cancelled","no_show")')
          .order('appointment_date', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);

        if (locationId) q = q.eq('location_id', locationId);

        const { data, error } = await q;
        if (error) throw error;
        allData.push(...(data || []));
        hasMore = (data?.length || 0) === PAGE_SIZE;
        offset += PAGE_SIZE;
      }

      return allData;
    },
    staleTime: 5 * 60 * 1000,
  });

  const result = useMemo<NewClientConversionData | null>(() => {
    if (!query.data) return null;

    // Group by client
    const clientMap = new Map<string, { date: string; category: string }[]>();
    for (const row of query.data) {
      const clientId = row.phorest_client_id as string;
      if (!clientMap.has(clientId)) clientMap.set(clientId, []);
      clientMap.get(clientId)!.push({
        date: row.appointment_date as string,
        category: getServiceCategory(row.service_name),
      });
    }

    // Filter to clients whose first visit is within the date range (if provided)
    const entryCounts = new Map<string, { total: number; converted: number; daysSum: number }>();
    let totalNew = 0;
    let totalConverted = 0;
    let totalDaysSum = 0;
    let convertedWithDays = 0;

    for (const [, visits] of clientMap) {
      // visits already sorted by date from query
      const firstVisit = visits[0];

      // Apply date filter to first visit only
      if (dateFrom && firstVisit.date < dateFrom) continue;
      if (dateTo && firstVisit.date > dateTo) continue;

      totalNew++;
      const entryCategory = firstVisit.category;

      if (!entryCounts.has(entryCategory)) {
        entryCounts.set(entryCategory, { total: 0, converted: 0, daysSum: 0 });
      }
      const entry = entryCounts.get(entryCategory)!;
      entry.total++;

      // Check for high-ticket conversion in subsequent visits
      const highTicketVisit = visits.find(
        (v, i) => i > 0 && HIGH_TICKET_CATEGORIES.includes(v.category as any)
      );

      if (highTicketVisit) {
        totalConverted++;
        entry.converted++;
        const days = Math.round(
          (new Date(highTicketVisit.date).getTime() - new Date(firstVisit.date).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        totalDaysSum += days;
        entry.daysSum += days;
        convertedWithDays++;
      }
    }

    // Build entry services breakdown sorted by count desc
    const entryServices: EntryServiceBreakdown[] = Array.from(entryCounts.entries())
      .map(([category, { total, converted }]) => ({
        category,
        count: total,
        percentage: totalNew > 0 ? Math.round((total / totalNew) * 100) : 0,
        convertedCount: converted,
        conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalNewClients: totalNew,
      totalConverted,
      overallConversionRate: totalNew > 0 ? Math.round((totalConverted / totalNew) * 100) : 0,
      avgDaysToConvert: convertedWithDays > 0 ? Math.round(totalDaysSum / convertedWithDays) : null,
      entryServices,
    };
  }, [query.data, dateFrom, dateTo]);

  return {
    data: result,
    isLoading: query.isLoading,
  };
}
