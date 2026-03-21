import { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, TableProperties } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { Loader2 } from 'lucide-react';
import type { ComparisonResult } from '@/hooks/useComparisonData';

interface ComparisonBreakdownTableProps {
  data: ComparisonResult | undefined;
  isLoading: boolean;
  periodALabel?: string;
  periodBLabel?: string;
}

export function ComparisonBreakdownTable({ 
  data, 
  isLoading,
  periodALabel = 'Period A',
  periodBLabel = 'Period B',
}: ComparisonBreakdownTableProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const { formatNumber } = useFormatNumber();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="h-[200px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const rows = [
    {
      metric: 'Total Revenue',
      periodA: data.periodA.totalRevenue,
      periodB: data.periodB.totalRevenue,
      change: data.changes.totalRevenue,
      format: (v: number) => formatCurrencyWhole(v),
    },
    {
      metric: 'Service Revenue',
      periodA: data.periodA.serviceRevenue,
      periodB: data.periodB.serviceRevenue,
      change: data.changes.serviceRevenue,
      format: (v: number) => formatCurrencyWhole(v),
    },
    {
      metric: 'Product Revenue',
      periodA: data.periodA.productRevenue,
      periodB: data.periodB.productRevenue,
      change: data.changes.productRevenue,
      format: (v: number) => formatCurrencyWhole(v),
    },
    {
      metric: 'Transactions',
      periodA: data.periodA.totalTransactions,
      periodB: data.periodB.totalTransactions,
      change: data.changes.totalTransactions,
      format: (v: number) => formatNumber(v),
    },
    {
      metric: 'Avg Ticket',
      periodA: data.periodA.averageTicket,
      periodB: data.periodB.averageTicket,
      change: data.changes.averageTicket,
      format: (v: number) => formatCurrencyWhole(Math.round(v)),
    },
  ];

  // Find best and worst performing rows
  const maxChange = Math.max(...rows.map(r => r.change));
  const minChange = Math.min(...rows.map(r => r.change));
  const maxAbsChange = Math.max(...rows.map(r => Math.abs(r.change)));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
            <TableProperties className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="font-display text-base tracking-wide">DETAILED BREAKDOWN</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead className="text-right">{periodALabel}</TableHead>
              <TableHead className="text-right">{periodBLabel}</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="w-[140px]">Delta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isPositive = row.change > 0;
              const isNeutral = Math.abs(row.change) < 0.1;
              const isBest = row.change === maxChange && maxChange > 0;
              const isWorst = row.change === minChange && minChange < 0;
              const barWidth = maxAbsChange > 0 ? Math.min((Math.abs(row.change) / maxAbsChange) * 100, 100) : 0;

              return (
                <TableRow
                  key={row.metric}
                  className={cn(
                    isBest && 'bg-chart-2/[0.03]',
                    isWorst && 'bg-destructive/[0.03]'
                  )}
                >
                  <TableCell className="font-medium">
                    {row.metric}
                    {isBest && <span className="ml-1.5 text-[9px] text-chart-2 font-medium uppercase tracking-wider">Best</span>}
                    {isWorst && <span className="ml-1.5 text-[9px] text-destructive font-medium uppercase tracking-wider">Worst</span>}
                  </TableCell>
                  <TableCell className="text-right font-display">{row.format(row.periodA)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{row.format(row.periodB)}</TableCell>
                  <TableCell className={cn(
                    'text-right font-medium tabular-nums',
                    isNeutral ? 'text-muted-foreground' : isPositive ? 'text-chart-2' : 'text-destructive'
                  )}>
                    {isPositive ? '+' : ''}{row.change.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            isNeutral ? 'bg-muted-foreground/30' : isPositive ? 'bg-chart-2' : 'bg-destructive'
                          )}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      {isNeutral ? (
                        <Minus className="w-3 h-3 text-muted-foreground shrink-0" />
                      ) : isPositive ? (
                        <ArrowUpRight className="w-3 h-3 text-chart-2 shrink-0" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 text-destructive shrink-0" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
