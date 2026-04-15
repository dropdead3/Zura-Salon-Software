import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface TicketBucket {
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface TicketDistributionData {
  buckets: TicketBucket[];
  median: number;
  average: number;
  aboveAvgPct: number;
  belowAvgPct: number;
  sweetSpotLabel: string;
}

const BUCKET_RANGES = [
  { label: '$0–50', min: 0, max: 50 },
  { label: '$50–100', min: 50, max: 100 },
  { label: '$100–150', min: 100, max: 150 },
  { label: '$150–200', min: 150, max: 200 },
  { label: '$200+', min: 200, max: Infinity },
];

export function useTicketDistribution(dateFrom?: string, dateTo?: string, locationId?: string) {
  return useQuery({
    queryKey: ['ticket-distribution', dateFrom, dateTo, locationId],
    queryFn: async () => {
      const data = await fetchAllBatched<any>((from, to) => {
        let q = supabase
          .from('v_all_sales_transactions' as any)
          .select('total_amount, phorest_transaction_id')
          .not('total_amount', 'is', null)
          .range(from, to);
        if (dateFrom) q = q.gte('transaction_date', dateFrom);
        if (dateTo) q = q.lte('transaction_date', dateTo);
        if (locationId && locationId !== 'all') q = q.eq('location_id', locationId);
        return q;
      });

      const amounts = data
        .map(r => Number(r.total_amount) || 0)
        .filter(a => a > 0)
        .sort((a, b) => a - b);

      if (amounts.length === 0) {
        return {
          buckets: BUCKET_RANGES.map(b => ({ ...b, count: 0 })),
          median: 0,
          average: 0,
          aboveAvgPct: 0,
          belowAvgPct: 0,
          sweetSpotLabel: '',
        } as TicketDistributionData;
      }

      const sum = amounts.reduce((s, v) => s + v, 0);
      const average = sum / amounts.length;
      const mid = Math.floor(amounts.length / 2);
      const median = amounts.length % 2 === 0
        ? (amounts[mid - 1] + amounts[mid]) / 2
        : amounts[mid];

      const aboveCount = amounts.filter(a => a >= average).length;
      const belowCount = amounts.length - aboveCount;

      const buckets: TicketBucket[] = BUCKET_RANGES.map(b => ({ ...b, count: 0 }));
      amounts.forEach(a => {
        const bucket = buckets.find(b => a >= b.min && a < b.max);
        if (bucket) bucket.count++;
      });

      const sweetSpot = buckets.reduce((best, b) => b.count > best.count ? b : best, buckets[0]);

      return {
        buckets,
        median,
        average,
        aboveAvgPct: Math.round((aboveCount / amounts.length) * 100),
        belowAvgPct: Math.round((belowCount / amounts.length) * 100),
        sweetSpotLabel: sweetSpot.label,
      } as TicketDistributionData;
    },
    enabled: !!dateFrom && !!dateTo,
  });
}
