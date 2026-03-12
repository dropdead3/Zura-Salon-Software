/**
 * ProfitByServiceTable — Sortable table of service types ranked by margin.
 */

import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { getMarginHealth } from '@/lib/backroom/appointment-profit-engine';
import type { ServiceMarginRanking } from '@/lib/backroom/appointment-profit-engine';

type SortKey = 'serviceName' | 'appointmentCount' | 'avgRevenue' | 'avgChemicalCost' | 'avgLaborCost' | 'avgMargin' | 'avgMarginPct';

interface ProfitByServiceTableProps {
  data: ServiceMarginRanking[];
  className?: string;
}

export function ProfitByServiceTable({ data, className }: ProfitByServiceTableProps) {
  const { formatCurrency } = useFormatCurrency();
  const [sortKey, setSortKey] = useState<SortKey>('avgMarginPct');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey] as number;
    const bv = b[sortKey] as number;
    if (typeof av === 'string') return sortAsc ? (av as string).localeCompare(bv as string) : (bv as string).localeCompare(av as string);
    return sortAsc ? av - bv : bv - av;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const healthColor = (pct: number) => {
    const h = getMarginHealth(pct);
    if (h === 'healthy') return 'text-green-600';
    if (h === 'moderate') return 'text-amber-600';
    if (h === 'low') return 'text-orange-600';
    return 'text-destructive';
  };

  return (
    <Card className={cn(tokens.card.wrapper, className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <TrendingUp className={tokens.card.icon} />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Profit by Service</CardTitle>
              <CardDescription>Average profitability per service type</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!data.length ? (
          <div className={tokens.empty.container}>
            <TrendingUp className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No service data</h3>
            <p className={tokens.empty.description}>Complete appointments to see profitability</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {([
                  ['serviceName', 'Service'],
                  ['appointmentCount', 'Appts'],
                  ['avgRevenue', 'Avg Revenue'],
                  ['avgChemicalCost', 'Avg Chemical'],
                  ['avgLaborCost', 'Avg Labor'],
                  ['avgMargin', 'Avg Margin'],
                  ['avgMarginPct', 'Margin %'],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <TableHead key={key} className={tokens.table.columnHeader}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-sans text-sm font-medium hover:bg-transparent"
                      onClick={() => toggleSort(key)}
                    >
                      {label}
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row, i) => {
                const isTop = i === 0 && sorted.length > 1;
                const isBottom = i === sorted.length - 1 && sorted.length > 1;
                return (
                  <TableRow
                    key={row.serviceName}
                    className={cn(
                      isTop && 'bg-green-500/5',
                      isBottom && 'bg-destructive/5',
                    )}
                  >
                    <TableCell className={tokens.body.emphasis}>{row.serviceName}</TableCell>
                    <TableCell>{row.appointmentCount}</TableCell>
                    <TableCell>{formatCurrency(row.avgRevenue)}</TableCell>
                    <TableCell>{formatCurrency(row.avgChemicalCost)}</TableCell>
                    <TableCell>{formatCurrency(row.avgLaborCost)}</TableCell>
                    <TableCell>{formatCurrency(row.avgMargin)}</TableCell>
                    <TableCell className={cn('font-medium', healthColor(row.avgMarginPct))}>
                      {row.avgMarginPct}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
