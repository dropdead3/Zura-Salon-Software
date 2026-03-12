import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { ArrowRight, Shuffle, Loader2 } from 'lucide-react';
import { useRebalancingSuggestions, type RebalancingSuggestion } from '@/hooks/useRebalancingSuggestions';
import { useCreateStockTransfer } from '@/hooks/useStockTransfers';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { type FilterContext } from '@/components/dashboard/AnalyticsFilterBadge';

interface RebalancingCardProps {
  filterContext?: FilterContext;
}

const PRIORITY_STYLE: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export function RebalancingCard({ filterContext }: RebalancingCardProps) {
  const result = useRebalancingSuggestions();
  const { effectiveOrganization } = useOrganizationContext();
  const createTransfer = useCreateStockTransfer();
  const { formatCurrencyWhole } = useFormatCurrency();
  const [createdIds, setCreatedIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (!result || result.suggestions.length === 0) return null;

  const handleCreateTransfer = (s: RebalancingSuggestion) => {
    if (!effectiveOrganization?.id) return;
    const key = `${s.productId}-${s.fromLocationId}-${s.toLocationId}`;
    setPendingId(key);
    createTransfer.mutate({
      organization_id: effectiveOrganization.id,
      product_id: s.productId,
      from_location_id: s.fromLocationId,
      to_location_id: s.toLocationId,
      quantity: s.suggestedQty,
      notes: `Auto-suggested rebalancing: ${s.fromLocationName} → ${s.toLocationName}`,
    }, {
      onSuccess: () => {
        setCreatedIds(prev => new Set(prev).add(key));
        setPendingId(null);
      },
      onError: () => setPendingId(null),
    });
  };

  const highCount = result.suggestions.filter(s => s.priority === 'high').length;

  return (
    <PinnableCard elementKey="retail_rebalancing" elementName="Cross-Location Rebalancing" category="Analytics Hub - Retail">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <Shuffle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className={tokens.card.title}>CROSS-LOCATION REBALANCING</CardTitle>
                  <MetricInfoTooltip description="Suggests stock transfers when one location has surplus (>1.5× par) and another is below reorder level. Creates pending transfers for manager approval." />
                </div>
                <CardDescription className="text-xs">
                  {result.totalOpportunities} opportunity{result.totalOpportunities !== 1 ? 'ies' : 'y'} · <BlurredAmount>{formatCurrencyWhole(result.totalStuckCapital)}</BlurredAmount> rebalanceable value
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {highCount > 0 && (
                <Badge variant="destructive" className="text-xs">{highCount} urgent</Badge>
              )}
              
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tokens.table.columnHeader}>Product</TableHead>
                  <TableHead className={tokens.table.columnHeader}>From</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'hidden sm:table-cell')} />
                  <TableHead className={tokens.table.columnHeader}>To</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Qty</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden sm:table-cell')}>Value</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Priority</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.suggestions.slice(0, 15).map((s) => {
                  const key = `${s.productId}-${s.fromLocationId}-${s.toLocationId}`;
                  const created = createdIds.has(key);
                  const isPending = pendingId === key;
                  return (
                    <TableRow key={key}>
                      <TableCell className="text-sm">
                        <div>{s.productName}</div>
                        {s.sku && <div className="text-xs text-muted-foreground">{s.sku}</div>}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{s.fromLocationName}</div>
                        <div className="text-xs text-muted-foreground">{s.fromQty} on hand (par {s.fromParLevel})</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center">
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground mx-auto" />
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{s.toLocationName}</div>
                        <div className="text-xs text-muted-foreground">{s.toQty} on hand (reorder {s.toReorderLevel})</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{s.suggestedQty}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm hidden sm:table-cell">
                        <BlurredAmount>{formatCurrencyWhole(s.estimatedValue)}</BlurredAmount>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn('text-xs capitalize', PRIORITY_STYLE[s.priority])}>
                          {s.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {created ? (
                          <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400">Created</Badge>
                        ) : (
                          <Button
                            size={tokens.button.inline}
                            variant="outline"
                            onClick={() => handleCreateTransfer(s)}
                            disabled={isPending}
                            className="text-xs"
                          >
                            {isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                            Transfer
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PinnableCard>
  );
}
