/**
 * CountEntryForm — Product-by-product count entry for an active count session.
 * Shows all tracked products with expected (on-hand) quantities, accepts actual counts,
 * calculates variance, and posts adjustments to the inventory ledger on completion.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Loader2, ArrowLeft, CheckCircle2, Search, AlertTriangle } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useBackroomInventoryTable, type BackroomInventoryRow } from '@/hooks/backroom/useBackroomInventoryTable';
import { useCompleteCountSession, type CountSession } from '@/hooks/inventory/useCountSessions';
import { postLedgerEntry } from '@/lib/backroom/services/inventory-ledger-service';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

interface CountEntryFormProps {
  session: CountSession;
  locationId?: string;
  onClose: () => void;
}

interface CountEntry {
  counted: number | null; // null = not yet counted
}

export function CountEntryForm({ session, locationId, onClose }: CountEntryFormProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id || '';
  const { formatCurrency } = useFormatCurrency();
  const { data: products = [], isLoading } = useBackroomInventoryTable({ locationId });
  const completeSession = useCompleteCountSession();
  const queryClient = useQueryClient();

  const [entries, setEntries] = useState<Record<string, CountEntry>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter products by search
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  // Group by brand
  const brandGroups = useMemo(() => {
    const groups = new Map<string, BackroomInventoryRow[]>();
    for (const p of filteredProducts) {
      const brand = p.brand || 'Other';
      const list = groups.get(brand) || [];
      list.push(p);
      groups.set(brand, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredProducts]);

  // Stats
  const countedCount = Object.values(entries).filter((e) => e.counted !== null).length;
  const totalProducts = products.length;
  const progressPct = totalProducts > 0 ? Math.round((countedCount / totalProducts) * 100) : 0;

  const varianceSummary = useMemo(() => {
    let totalVarianceUnits = 0;
    let totalVarianceCost = 0;
    let discrepancyCount = 0;

    for (const product of products) {
      const entry = entries[product.id];
      if (entry?.counted == null) continue;
      const variance = entry.counted - product.quantity_on_hand;
      totalVarianceUnits += variance;
      if (variance !== 0) {
        discrepancyCount++;
        totalVarianceCost += Math.abs(variance) * (product.cost_price || 0);
      }
    }

    return { totalVarianceUnits, totalVarianceCost, discrepancyCount };
  }, [entries, products]);

  const updateEntry = (productId: string, counted: number | null) => {
    setEntries((prev) => ({ ...prev, [productId]: { counted } }));
  };

  const handleSubmit = async () => {
    if (!orgId || countedCount === 0) return;
    setIsSubmitting(true);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const countRows: any[] = [];
      const adjustments: { productId: string; currentQty: number; newQty: number }[] = [];

      for (const product of products) {
        const entry = entries[product.id];
        if (entry?.counted == null) continue;

        const variance = entry.counted - product.quantity_on_hand;

        // Insert stock_count record
        countRows.push({
          organization_id: orgId,
          product_id: product.id,
          count_session_id: session.id,
          expected_quantity: product.quantity_on_hand,
          counted_quantity: entry.counted,
          variance,
          location_id: locationId || null,
          counted_by: userId,
          notes: null,
        });

        // If variance, we need a ledger adjustment
        if (variance !== 0) {
          adjustments.push({
            productId: product.id,
            currentQty: product.quantity_on_hand,
            newQty: entry.counted,
          });
        }
      }

      // Batch insert stock_counts
      if (countRows.length > 0) {
        const { error: countErr } = await supabase
          .from('stock_counts')
          .insert(countRows);
        if (countErr) throw countErr;
      }

      // Post ledger adjustments for variances
      for (const adj of adjustments) {
        await postLedgerEntry({
          organization_id: orgId,
          product_id: adj.productId,
          quantity_change: adj.newQty - adj.currentQty,
          quantity_after: adj.newQty,
          event_type: 'count' as any,
          reason: 'count_adjustment',
          reference_type: 'count_session',
          reference_id: session.id,
          location_id: locationId || null,
          notes: `Physical count adjustment: ${adj.currentQty} → ${adj.newQty}`,
          created_by: userId,
        });
      }

      // Complete the session
      completeSession.mutate({
        sessionId: session.id,
        totalCounted: countedCount,
        totalVarianceUnits: varianceSummary.totalVarianceUnits,
        totalVarianceCost: varianceSummary.totalVarianceCost,
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['stock-counts'] });
      queryClient.invalidateQueries({ queryKey: ['shrinkage-summary'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-inventory-table'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });

      toast.success(
        varianceSummary.discrepancyCount > 0
          ? `Count complete — ${varianceSummary.discrepancyCount} discrepanc${varianceSummary.discrepancyCount === 1 ? 'y' : 'ies'} adjusted`
          : 'Count complete — no discrepancies found'
      );
      onClose();
    } catch (error) {
      toast.error('Failed to save count: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <p className={tokens.body.emphasis}>Physical Count Entry</p>
            <p className={tokens.body.muted}>
              Enter actual quantities for each product. Variances will adjust stock automatically.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || countedCount === 0}
          className={tokens.button.cardAction}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Complete Count ({countedCount}/{totalProducts})
        </Button>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{countedCount} of {totalProducts} products counted</span>
          <span>{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      {/* Variance summary (live) */}
      {countedCount > 0 && (
        <div className="flex items-center gap-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-2.5 text-xs">
          <span>
            Variance:{' '}
            <span
              className={cn(
                'tabular-nums',
                varianceSummary.totalVarianceUnits < 0
                  ? 'text-destructive'
                  : varianceSummary.totalVarianceUnits > 0
                  ? 'text-success'
                  : 'text-muted-foreground'
              )}
            >
              {varianceSummary.totalVarianceUnits > 0 ? '+' : ''}
              {varianceSummary.totalVarianceUnits} units
            </span>
          </span>
          {varianceSummary.discrepancyCount > 0 && (
            <>
              <span className="text-muted-foreground">·</span>
              <span>
                {varianceSummary.discrepancyCount} discrepanc
                {varianceSummary.discrepancyCount === 1 ? 'y' : 'ies'}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-destructive">
                {formatCurrency(varianceSummary.totalVarianceCost)} impact
              </span>
            </>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by product, brand, or SKU..."
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Product list by brand */}
      <div className="space-y-4">
        {brandGroups.map(([brand, brandProducts]) => (
          <div key={brand}>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(tokens.label.default, 'text-xs')}>{brand}</span>
              <span className="text-xs text-muted-foreground">
                ({brandProducts.filter((p) => entries[p.id]?.counted != null).length}/
                {brandProducts.length})
              </span>
            </div>

            <div className="space-y-1.5">
              {brandProducts.map((product) => {
                const entry = entries[product.id];
                const isCounted = entry?.counted != null;
                const variance = isCounted ? entry.counted! - product.quantity_on_hand : null;
                const hasVariance = variance !== null && variance !== 0;

                return (
                  <div
                    key={product.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
                      isCounted
                        ? hasVariance
                          ? 'border-warning/30 bg-warning/5'
                          : 'border-success/30 bg-success/5'
                        : 'border-border/60 bg-card'
                    )}
                  >
                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-sans truncate">{product.name}</p>
                      {product.sku && (
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                      )}
                    </div>

                    {/* Expected qty */}
                    <div className="text-right shrink-0 w-16">
                      <p className="text-xs text-muted-foreground">Expected</p>
                      <p className="text-sm tabular-nums">{product.quantity_on_hand}</p>
                    </div>

                    {/* Count input */}
                    <div className="shrink-0 w-20">
                      <Input
                        type="number"
                        min={0}
                        placeholder="—"
                        value={entry?.counted ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateEntry(product.id, val === '' ? null : Number(val));
                        }}
                        className={cn(
                          'h-8 text-sm text-center tabular-nums',
                          hasVariance && 'border-warning/50'
                        )}
                      />
                    </div>

                    {/* Variance badge */}
                    <div className="w-16 text-right shrink-0">
                      {isCounted ? (
                        hasVariance ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px]',
                              variance! < 0
                                ? 'bg-destructive/10 text-destructive border-destructive/20'
                                : 'bg-success/10 text-success border-success/20'
                            )}
                          >
                            {variance! > 0 ? '+' : ''}
                            {variance}
                          </Badge>
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-success ml-auto" />
                        )
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className={tokens.empty.container}>
          <Search className={tokens.empty.icon} />
          <h3 className={tokens.empty.heading}>No matching products</h3>
          <p className={tokens.empty.description}>Try adjusting your search.</p>
        </div>
      )}
    </div>
  );
}
