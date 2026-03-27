/**
 * DemandForecastTable — Sortable table of predicted product demand.
 */

import { useState } from 'react';
import { Package, ArrowUpDown } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDemandForecast } from '@/hooks/backroom/usePredictiveBackroom';
import type { ProductDemandForecast, StockoutRisk } from '@/lib/backroom/services/predictive-backroom-service';

const RISK_BADGE: Record<StockoutRisk, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  high: { label: 'High', className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  medium: { label: 'Medium', className: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30' },
  low: { label: 'Low', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  none: { label: 'None', className: 'bg-muted text-muted-foreground border-border' },
};

type SortField = 'product_name' | 'predicted_usage_7d' | 'remaining_after_7d' | 'stockout_risk';

interface DemandForecastTableProps {
  locationId?: string | null;
}

export function DemandForecastTable({ locationId }: DemandForecastTableProps) {
  const { data: forecasts, isLoading } = useDemandForecast(locationId);
  const [sortField, setSortField] = useState<SortField>('stockout_risk');
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const riskOrder: Record<StockoutRisk, number> = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };

  const sorted = [...(forecasts ?? [])].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'product_name':
        cmp = a.product_name.localeCompare(b.product_name);
        break;
      case 'predicted_usage_7d':
        cmp = a.predicted_usage_7d - b.predicted_usage_7d;
        break;
      case 'remaining_after_7d':
        cmp = a.remaining_after_7d - b.remaining_after_7d;
        break;
      case 'stockout_risk':
        cmp = riskOrder[a.stockout_risk] - riskOrder[b.stockout_risk];
        break;
    }
    return sortAsc ? cmp : -cmp;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Demand Forecast</CardTitle>
              <CardDescription>Loading predictions…</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className={tokens.loading.skeleton} />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!sorted.length) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Demand Forecast</CardTitle>
              <CardDescription>Predicted chemical demand for upcoming appointments</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={tokens.empty.container}>
            <Package className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No demand predicted</h3>
            <p className={tokens.empty.description}>
              No upcoming appointments with mapped formulas found
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 hover:bg-transparent"
      onClick={() => toggleSort(field)}
    >
      <span className={tokens.table.columnHeader}>{children}</span>
      <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
    </Button>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Demand Forecast</CardTitle>
              <CardDescription>Predicted chemical demand for the next 7 days</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="font-sans">
            {sorted.length} products
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortButton field="product_name">Product</SortButton></TableHead>
              <TableHead className={tokens.table.columnHeader}>Usage (1d)</TableHead>
              <TableHead><SortButton field="predicted_usage_7d">Usage (7d)</SortButton></TableHead>
              <TableHead className={tokens.table.columnHeader}>On Hand</TableHead>
              <TableHead><SortButton field="remaining_after_7d">Remaining</SortButton></TableHead>
              <TableHead><SortButton field="stockout_risk">Risk</SortButton></TableHead>
              <TableHead className={tokens.table.columnHeader}>Reorder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((forecast) => (
              <ForecastRow key={forecast.product_id} forecast={forecast} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ForecastRow({ forecast }: { forecast: ProductDemandForecast }) {
  const riskBadge = RISK_BADGE[forecast.stockout_risk];

  return (
    <TableRow>
      <TableCell>
        <div>
          <span className={tokens.body.emphasis}>{forecast.product_name}</span>
          {forecast.brand && (
            <span className={cn(tokens.body.muted, 'ml-1')}>({forecast.brand})</span>
          )}
        </div>
      </TableCell>
      <TableCell className={tokens.body.default}>
        {forecast.predicted_usage_1d} {forecast.unit}
      </TableCell>
      <TableCell className={tokens.body.default}>
        {forecast.predicted_usage_7d} {forecast.unit}
      </TableCell>
      <TableCell className={tokens.body.default}>
        {forecast.current_on_hand} {forecast.unit}
      </TableCell>
      <TableCell>
        <span
          className={cn(
            tokens.body.default,
            forecast.remaining_after_7d <= 0 && 'text-destructive',
            forecast.remaining_after_7d > 0 && forecast.remaining_after_7d < forecast.safety_stock && 'text-orange-600 dark:text-orange-400',
          )}
        >
          {forecast.remaining_after_7d} {forecast.unit}
        </span>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn('font-sans text-xs', riskBadge.className)}>
          {riskBadge.label}
        </Badge>
      </TableCell>
      <TableCell className={tokens.body.default}>
        {forecast.recommended_order_qty > 0
          ? `${forecast.recommended_order_qty} ${forecast.unit}`
          : '—'}
      </TableCell>
    </TableRow>
  );
}
