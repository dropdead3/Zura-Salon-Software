/**
 * SeasonalDemandOverlay — Compares current week product usage vs same week last year.
 * Gracefully hidden if < 12 months of data.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { reportVisibilitySuppression } from '@/lib/dev/visibility-contract-bus';

interface SeasonalDataPoint {
  productName: string;
  thisWeek: number;
  lastYear: number;
}

export function SeasonalDemandOverlay({ locationId }: { locationId?: string }) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['seasonal-demand-overlay', orgId, locationId],
    queryFn: async (): Promise<SeasonalDataPoint[] | null> => {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const lastYearStart = new Date(weekStart);
      lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
      const lastYearEnd = new Date(weekEnd);
      lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

      const fmt = (d: Date) => d.toISOString().split('T')[0];

      // Check if we have data from last year
      const { count } = await supabase
        .from('mix_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId!)
        .gte('started_at', fmt(lastYearStart))
        .lte('started_at', fmt(lastYearEnd) + 'T23:59:59');

      if ((count ?? 0) === 0) return null;

      // Fetch this week's usage
      const thisWeekUsage = await fetchWeekUsage(orgId!, fmt(weekStart), fmt(weekEnd), locationId);
      const lastYearUsage = await fetchWeekUsage(orgId!, fmt(lastYearStart), fmt(lastYearEnd), locationId);

      // Merge top 10 products
      const allProducts = new Set([...Object.keys(thisWeekUsage), ...Object.keys(lastYearUsage)]);
      const merged: SeasonalDataPoint[] = [];

      for (const name of allProducts) {
        merged.push({
          productName: name.length > 20 ? name.substring(0, 18) + '…' : name,
          thisWeek: Math.round((thisWeekUsage[name] ?? 0) * 10) / 10,
          lastYear: Math.round((lastYearUsage[name] ?? 0) * 10) / 10,
        });
      }

      return merged
        .sort((a, b) => (b.thisWeek + b.lastYear) - (a.thisWeek + a.lastYear))
        .slice(0, 10);
    },
    enabled: !!orgId,
    staleTime: 10 * 60_000,
  });

  // Visibility Contract: needs prior-year data to make a YoY comparison meaningful.
  if (isLoading || !data?.length) {
    const reason = isLoading ? 'loading' : !data ? 'no-prior-year-data' : 'no-overlap';
    reportVisibilitySuppression('seasonal-demand-overlay', reason, {
      pointCount: data?.length ?? 0,
      requiresPriorYearData: true,
    });
    return null;
  }

  return (
    <Card className={cn(tokens.card.wrapper)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className={tokens.card.title}>Seasonal Comparison</CardTitle>
              <MetricInfoTooltip description="This week's product usage compared to the same week last year. Helps identify seasonal demand patterns." />
            </div>
            <CardDescription className="text-xs">Top 10 products · this week vs same week last year</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="productName" type="category" width={100} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [`${value}g`, name === 'thisWeek' ? 'This Week' : 'Last Year']}
              />
              <Legend
                formatter={(value) => (value === 'thisWeek' ? 'This Week' : 'Last Year')}
                wrapperStyle={{ fontSize: '10px' }}
              />
              <Bar dataKey="lastYear" fill="hsl(var(--muted-foreground) / 0.3)" radius={[0, 2, 2, 0]} />
              <Bar dataKey="thisWeek" fill="hsl(var(--primary))" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

async function fetchWeekUsage(
  orgId: string,
  startDate: string,
  endDate: string,
  locationId?: string,
): Promise<Record<string, number>> {
  let sessionQuery = supabase
    .from('mix_sessions')
    .select('id')
    .eq('organization_id', orgId)
    .eq('status', 'completed')
    .gte('started_at', startDate)
    .lte('started_at', endDate + 'T23:59:59');

  if (locationId && locationId !== 'all') {
    sessionQuery = sessionQuery.eq('location_id', locationId);
  }

  const { data: sessions } = await sessionQuery;
  const sessionIds = (sessions ?? []).map((s: any) => s.id);
  if (!sessionIds.length) return {};

  const { data: bowls } = await supabase
    .from('mix_bowls')
    .select('id')
    .in('mix_session_id', sessionIds);

  const bowlIds = (bowls ?? []).map((b: any) => b.id);
  if (!bowlIds.length) return {};

  const { data: lines } = await supabase
    .from('mix_bowl_lines')
    .select('product_name_snapshot, dispensed_quantity')
    .in('bowl_id', bowlIds);

  const usage: Record<string, number> = {};
  for (const line of (lines ?? []) as any[]) {
    const name = line.product_name_snapshot ?? 'Unknown';
    usage[name] = (usage[name] ?? 0) + (line.dispensed_quantity ?? 0);
  }

  return usage;
}
