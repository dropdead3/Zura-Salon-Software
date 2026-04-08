import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

export interface CorrelationPair {
  metricA: string;
  metricB: string;
  coefficient: number;
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  direction: 'positive' | 'negative';
  dataPoints: number;
}

export interface CorrelationData {
  pairs: CorrelationPair[];
  matrix: Record<string, Record<string, number>>;
  scatterData: {
    metricA: string;
    metricB: string;
    points: { x: number; y: number; date: string }[];
  }[];
}

const CORRELATION_METRICS = [
  { key: 'total_revenue', label: 'Total Revenue' },
  { key: 'service_revenue', label: 'Service Revenue' },
  { key: 'product_revenue', label: 'Product Revenue' },
  { key: 'total_transactions', label: 'Transactions' },
];

export function useCorrelationAnalysis(locationId?: string, days = 90) {
  return useQuery({
    queryKey: ['correlation-analysis', locationId, days],
    queryFn: async (): Promise<CorrelationData> => {
      const endDate = new Date();
      const startDate = subDays(endDate, days);

      // Fetch from live POS transaction items with pagination
      const allItems: any[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        let q: any = supabase
          .from('phorest_transaction_items')
          .select('transaction_date, total_amount, tax_amount, item_type, location_id, phorest_client_id')
          .gte('transaction_date', format(startDate, 'yyyy-MM-dd'))
          .lte('transaction_date', format(endDate, 'yyyy-MM-dd'));
        if (locationId) q = q.eq('location_id', locationId);
        const { data, error } = await q.range(from, from + pageSize - 1);
        if (error) throw error;
        allItems.push(...(data || []));
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }

      // Aggregate to daily totals for correlation
      const dailyMap: Record<string, { total_revenue: number; service_revenue: number; product_revenue: number; total_transactions: number; clients: Set<string> }> = {};
      for (const item of allItems) {
        const date = (item.transaction_date || '').slice(0, 10);
        if (!dailyMap[date]) {
          dailyMap[date] = { total_revenue: 0, service_revenue: 0, product_revenue: 0, total_transactions: 0, clients: new Set() };
        }
        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        dailyMap[date].total_revenue += amount;
        if (item.item_type === 'service') dailyMap[date].service_revenue += amount;
        else dailyMap[date].product_revenue += amount;
        dailyMap[date].total_transactions += 1;
        if (item.phorest_client_id) dailyMap[date].clients.add(item.phorest_client_id);
      }

      const dailyData = Object.entries(dailyMap).map(([date, d]) => ({
        date,
        total_revenue: d.total_revenue,
        service_revenue: d.service_revenue,
        product_revenue: d.product_revenue,
        total_transactions: d.total_transactions,
      })).sort((a, b) => a.date.localeCompare(b.date));

      // Calculate correlations between all pairs
      const pairs: CorrelationPair[] = [];
      const matrix: Record<string, Record<string, number>> = {};
      const scatterData: CorrelationData['scatterData'] = [];

      for (let i = 0; i < CORRELATION_METRICS.length; i++) {
        const metricA = CORRELATION_METRICS[i].key;
        matrix[metricA] = {};

        for (let j = 0; j < CORRELATION_METRICS.length; j++) {
          const metricB = CORRELATION_METRICS[j].key;

          if (i === j) {
            matrix[metricA][metricB] = 1;
            continue;
          }

          const valuesA = dailyData.map(d => d[metricA as keyof typeof d] as number);
          const valuesB = dailyData.map(d => d[metricB as keyof typeof d] as number);

          const coefficient = calculatePearsonCorrelation(valuesA, valuesB);
          matrix[metricA][metricB] = coefficient;

          // Only add unique pairs (avoid duplicates)
          if (i < j) {
            const strength = getCorrelationStrength(coefficient);
            pairs.push({
              metricA,
              metricB,
              coefficient,
              strength,
              direction: coefficient >= 0 ? 'positive' : 'negative',
              dataPoints: dailyData.length,
            });

            // Create scatter data for this pair
            scatterData.push({
              metricA,
              metricB,
              points: dailyData.map(d => ({
                x: d[metricA as keyof typeof d] as number,
                y: d[metricB as keyof typeof d] as number,
                date: d.date,
              })),
            });
          }
        }
      }

      // Sort by absolute correlation strength
      pairs.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));

      return { pairs, matrix, scatterData };
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0 || n !== y.length) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}

function getCorrelationStrength(coefficient: number): 'strong' | 'moderate' | 'weak' | 'none' {
  const abs = Math.abs(coefficient);
  if (abs >= 0.7) return 'strong';
  if (abs >= 0.4) return 'moderate';
  if (abs >= 0.2) return 'weak';
  return 'none';
}

export function getCorrelationColor(coefficient: number): string {
  const abs = Math.abs(coefficient);
  if (coefficient >= 0) {
    if (abs >= 0.7) return 'bg-green-500';
    if (abs >= 0.4) return 'bg-green-400';
    if (abs >= 0.2) return 'bg-green-300';
    return 'bg-gray-200';
  } else {
    if (abs >= 0.7) return 'bg-red-500';
    if (abs >= 0.4) return 'bg-red-400';
    if (abs >= 0.2) return 'bg-red-300';
    return 'bg-gray-200';
  }
}

export function getCorrelationLabel(pair: CorrelationPair): string {
  const metricLabels: Record<string, string> = {
    total_revenue: 'Total Revenue',
    service_revenue: 'Service Revenue',
    product_revenue: 'Product Revenue',
    total_transactions: 'Transactions',
  };

  const aLabel = metricLabels[pair.metricA] || pair.metricA;
  const bLabel = metricLabels[pair.metricB] || pair.metricB;
  
  return `${aLabel} vs ${bLabel}`;
}
