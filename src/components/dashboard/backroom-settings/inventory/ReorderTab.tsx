/**
 * ReorderTab — Smart reorder queue with stockout forecasting and bulk PO creation.
 * Apple-grade responsive: horizontally scrollable table, stacked action bar on mobile.
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, RefreshCcw, Zap, AlertTriangle, Clock, ShoppingCart } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useBackroomInventoryTable, STOCK_STATUS_CONFIG, type BackroomInventoryRow } from '@/hooks/backroom/useBackroomInventoryTable';
import { useReplenishmentRecommendations, useGenerateReplenishment, useConvertRecommendationsToPO } from '@/hooks/inventory/useReplenishment';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { forecastStockout } from '@/lib/stockoutForecast';

interface ReorderTabProps {
  locationId?: string;
}

export function ReorderTab({ locationId }: ReorderTabProps) {
  const { data: inventory = [], isLoading: invLoading } = useBackroomInventoryTable({ locationId });
  const { data: recommendations = [], isLoading: recLoading } = useReplenishmentRecommendations('pending');
  const generateRecs = useGenerateReplenishment();
  const convertToPO = useConvertRecommendationsToPO();
  const { formatCurrency } = useFormatCurrency();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const reorderQueue = useMemo(() => {
    return inventory
      .filter(r => r.status === 'urgent_reorder' || r.status === 'out_of_stock' || r.status === 'replenish')
      .sort((a, b) => {
        const urgencyOrder = { out_of_stock: 0, urgent_reorder: 1, replenish: 2 };
        return (urgencyOrder[a.status as keyof typeof urgencyOrder] ?? 3) - (urgencyOrder[b.status as keyof typeof urgencyOrder] ?? 3);
      });
  }, [inventory]);

  const isLoading = invLoading || recLoading;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === reorderQueue.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reorderQueue.map(r => r.id)));
    }
  };

  const handleConvertToPO = () => {
    const recIds = recommendations
      .filter(r => selectedIds.has(r.product_id))
      .map(r => r.id);
    if (recIds.length > 0) {
      convertToPO.mutate(recIds);
      setSelectedIds(new Set());
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className={tokens.loading.spinner} /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className={tokens.body.emphasis}>{reorderQueue.length} product{reorderQueue.length !== 1 ? 's' : ''} need reordering</p>
          <p className={cn(tokens.body.muted, 'text-sm')}>Products below reorder point, sorted by urgency.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateRecs.mutate(undefined)}
            disabled={generateRecs.isPending}
            className={cn(tokens.button.cardAction, 'flex-1 sm:flex-initial')}
          >
            {generateRecs.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span className="hidden xs:inline sm:inline">Generate</span> Suggestions
          </Button>
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              onClick={handleConvertToPO}
              disabled={convertToPO.isPending}
              className={cn(tokens.button.cardAction, 'flex-1 sm:flex-initial')}
            >
              <ShoppingCart className="w-4 h-4" />
              Create POs ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* AI Recommendations banner */}
      {recommendations.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3 p-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary shrink-0" />
              <CardTitle className={tokens.card.title}>AI Recommendations</CardTitle>
            </div>
            <CardDescription className="text-sm">{recommendations.length} pending recommendation{recommendations.length !== 1 ? 's' : ''} — select items below to create purchase orders.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Reorder Queue Table */}
      {reorderQueue.length === 0 ? (
        <div className={tokens.empty.container}>
          <RefreshCcw className={tokens.empty.icon} />
          <h3 className={tokens.empty.heading}>All stocked up</h3>
          <p className={tokens.empty.description}>No products currently need reordering. Use "Generate Suggestions" to run the AI forecasting engine.</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="min-w-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 pl-4">
                        <Checkbox
                          checked={selectedIds.size === reorderQueue.length && reorderQueue.length > 0}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead className={tokens.table.columnHeader}>Product</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Stock</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Reorder Pt</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Par Level</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Order Qty</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'hidden lg:table-cell')}>Forecast</TableHead>
                      <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden md:table-cell')}>Est. Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reorderQueue.map((row) => (
                      <ReorderRow
                        key={row.id}
                        row={row}
                        selected={selectedIds.has(row.id)}
                        onToggle={() => toggleSelect(row.id)}
                        formatCurrency={formatCurrency}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReorderRow({ row, selected, onToggle, formatCurrency }: {
  row: BackroomInventoryRow;
  selected: boolean;
  onToggle: () => void;
  formatCurrency: (n: number) => string;
}) {
  const statusCfg = STOCK_STATUS_CONFIG[row.status];
  const forecast = forecastStockout(row.quantity_on_hand, 0.5);
  const estCost = row.order_qty * (row.cost_price ?? row.cost_per_gram ?? 0);

  return (
    <TableRow className={cn('transition-colors duration-100', selected && 'bg-primary/5')}>
      <TableCell className="pl-4">
        <Checkbox checked={selected} onCheckedChange={onToggle} />
      </TableCell>
      <TableCell className="py-2 sm:py-3">
        <div className="min-w-0">
          <span className={cn(tokens.body.emphasis, 'block truncate')}>{row.name}</span>
          {row.brand && <span className="text-muted-foreground text-[10px] sm:text-xs block truncate">{row.brand}</span>}
        </div>
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums">{row.quantity_on_hand}</TableCell>
      <TableCell className="text-right text-muted-foreground tabular-nums">{row.reorder_level ?? '—'}</TableCell>
      <TableCell className="text-right text-muted-foreground tabular-nums">{row.par_level ?? '—'}</TableCell>
      <TableCell className="text-right font-medium tabular-nums text-warning">{row.order_qty || '—'}</TableCell>
      <TableCell className="hidden lg:table-cell">
        {forecast.daysUntilStockout === 0 ? (
          <span className="text-destructive text-xs font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0" /> Now
          </span>
        ) : forecast.daysUntilStockout === Infinity ? (
          <span className="text-muted-foreground text-xs">—</span>
        ) : (
          <span className={cn('text-xs font-medium flex items-center gap-1 whitespace-nowrap', forecast.urgency === 'critical' ? 'text-destructive' : forecast.urgency === 'warning' ? 'text-warning' : 'text-muted-foreground')}>
            <Clock className="w-3 h-3 shrink-0" /> {forecast.daysUntilStockout}d
          </span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn('text-[10px] font-medium border whitespace-nowrap', statusCfg.className)}>
          {statusCfg.label}
        </Badge>
      </TableCell>
      <TableCell className="text-right hidden md:table-cell text-muted-foreground tabular-nums">
        {estCost > 0 ? formatCurrency(estCost) : '—'}
      </TableCell>
    </TableRow>
  );
}
