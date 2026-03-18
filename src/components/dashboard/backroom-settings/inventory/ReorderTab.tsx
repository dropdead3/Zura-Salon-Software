/**
 * ReorderTab — Smart reorder queue grouped by supplier.
 * Supports multi-line PO creation per supplier and email PO actions.
 */

import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Zap, AlertTriangle, Clock, ShoppingCart, RefreshCcw, Truck, Send, UserPlus } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useBackroomInventoryTable, STOCK_STATUS_CONFIG, type BackroomInventoryRow } from '@/hooks/backroom/useBackroomInventoryTable';
import { useReplenishmentRecommendations, useGenerateReplenishment } from '@/hooks/inventory/useReplenishment';
import { useCreateMultiLinePO } from '@/hooks/inventory/usePurchaseOrderLines';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { forecastStockout } from '@/lib/stockoutForecast';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReorderTabProps {
  locationId?: string;
}

interface SupplierGroup {
  supplierName: string;
  supplierEmail: string | null;
  products: BackroomInventoryRow[];
  totalEstCost: number;
}

export function ReorderTab({ locationId }: ReorderTabProps) {
  const { data: inventory = [], isLoading: invLoading } = useBackroomInventoryTable({ locationId });
  const { data: recommendations = [], isLoading: recLoading } = useReplenishmentRecommendations('pending');
  const generateRecs = useGenerateReplenishment();
  const createMultiLinePO = useCreateMultiLinePO();
  const { formatCurrency } = useFormatCurrency();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingEmail, setSendingEmail] = useState(false);
  // Editable order quantity overrides (product id -> qty)
  const [qtyOverrides, setQtyOverrides] = useState<Record<string, number>>({});

  const getOrderQty = useCallback((row: BackroomInventoryRow) => {
    return qtyOverrides[row.id] ?? row.order_qty;
  }, [qtyOverrides]);

  const setOrderQty = useCallback((id: string, qty: number) => {
    setQtyOverrides(prev => ({ ...prev, [id]: Math.max(0, qty) }));
  }, []);

  // Products that need reordering
  const reorderQueue = useMemo(() => {
    return inventory
      .filter(r => r.status === 'urgent_reorder' || r.status === 'out_of_stock' || r.status === 'replenish')
      .sort((a, b) => {
        const urgencyOrder = { out_of_stock: 0, urgent_reorder: 1, replenish: 2 };
        return (urgencyOrder[a.status as keyof typeof urgencyOrder] ?? 3) - (urgencyOrder[b.status as keyof typeof urgencyOrder] ?? 3);
      });
  }, [inventory]);

  // Group by supplier
  const supplierGroups = useMemo((): SupplierGroup[] => {
    const map = new Map<string, SupplierGroup>();
    for (const row of reorderQueue) {
      const key = row.supplier_name || '__unassigned__';
      const group = map.get(key) || {
        supplierName: row.supplier_name || 'Unassigned',
        supplierEmail: row.supplier_email,
        products: [],
        totalEstCost: 0,
      };
      group.products.push(row);
      group.totalEstCost += getOrderQty(row) * (row.cost_price ?? row.cost_per_gram ?? 0);
      map.set(key, group);
    }
    // Sort: unassigned last
    return Array.from(map.values()).sort((a, b) => {
      if (a.supplierName === 'Unassigned') return 1;
      if (b.supplierName === 'Unassigned') return -1;
      return a.supplierName.localeCompare(b.supplierName);
    });
  }, [reorderQueue, getOrderQty]);

  const isLoading = invLoading || recLoading;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSupplierGroup = (products: BackroomInventoryRow[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const allSelected = products.every(p => next.has(p.id));
      if (allSelected) {
        products.forEach(p => next.delete(p.id));
      } else {
        products.forEach(p => next.add(p.id));
      }
      return next;
    });
  };

  const handleCreatePOForSupplier = (group: SupplierGroup) => {
    if (!orgId) return;
    createMultiLinePO.mutate({
      organization_id: orgId,
      supplier_name: group.supplierName === 'Unassigned' ? undefined : group.supplierName,
      supplier_email: group.supplierEmail ?? undefined,
      lines: group.products.map(p => ({
        product_id: p.id,
        quantity_ordered: getOrderQty(p),
        unit_cost: p.cost_price ?? p.cost_per_gram ?? undefined,
      })),
    });
  };

  const handleCreateAllPOs = () => {
    if (!orgId) return;
    const assignedGroups = supplierGroups.filter(g => g.supplierName !== 'Unassigned');
    for (const group of assignedGroups) {
      const groupProducts = group.products.filter(p => selectedIds.has(p.id));
      if (groupProducts.length === 0) continue;
      createMultiLinePO.mutate({
        organization_id: orgId,
        supplier_name: group.supplierName,
        supplier_email: group.supplierEmail ?? undefined,
        lines: groupProducts.map(p => ({
          product_id: p.id,
          quantity_ordered: getOrderQty(p),
          unit_cost: p.cost_price ?? p.cost_per_gram ?? undefined,
        })),
      });
    }
    setSelectedIds(new Set());
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className={tokens.loading.spinner} /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className={tokens.body.emphasis}>{reorderQueue.length} product{reorderQueue.length !== 1 ? 's' : ''} need reordering</p>
          <p className={tokens.body.muted}>Grouped by supplier for streamlined PO creation.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateRecs.mutate(undefined)}
            disabled={generateRecs.isPending}
            className={tokens.button.cardAction}
          >
            {generateRecs.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Generate Suggestions
          </Button>
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              onClick={handleCreateAllPOs}
              disabled={createMultiLinePO.isPending}
              className={tokens.button.cardAction}
            >
              <ShoppingCart className="w-4 h-4" />
              Create POs ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <CardTitle className={tokens.card.title}>AI Recommendations</CardTitle>
            </div>
            <CardDescription>{recommendations.length} pending recommendation{recommendations.length !== 1 ? 's' : ''}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Supplier-grouped reorder queue */}
      {reorderQueue.length === 0 ? (
        <div className={tokens.empty.container}>
          <RefreshCcw className={tokens.empty.icon} />
          <h3 className={tokens.empty.heading}>All stocked up</h3>
          <p className={tokens.empty.description}>No products currently need reordering.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {supplierGroups.map((group) => (
            <Card key={group.supplierName}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    <CardTitle className={tokens.card.title}>{group.supplierName}</CardTitle>
                    {group.supplierEmail && (
                      <span className="text-muted-foreground text-xs">{group.supplierEmail}</span>
                    )}
                    <Badge variant="outline" className="text-[10px] ml-1">{group.products.length} item{group.products.length !== 1 ? 's' : ''}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Est: {formatCurrency(group.totalEstCost)}</span>
                    {group.supplierName !== 'Unassigned' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreatePOForSupplier(group)}
                        disabled={createMultiLinePO.isPending}
                        className={tokens.button.cardAction}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Create PO
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 pl-4">
                        <Checkbox
                          checked={group.products.every(p => selectedIds.has(p.id))}
                          onCheckedChange={() => toggleSupplierGroup(group.products)}
                        />
                      </TableHead>
                      <TableHead className={tokens.table.columnHeader}>Product</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Stock</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden sm:table-cell')}>Reorder Pt</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden sm:table-cell')}>Par Level</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Order Qty</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'hidden lg:table-cell')}>Forecast</TableHead>
                      <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                      <TableHead className={cn(tokens.table.columnHeader, 'text-right hidden md:table-cell')}>Est. Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.products.map((row) => (
                      <ReorderRow
                        key={row.id}
                        row={row}
                        selected={selectedIds.has(row.id)}
                        onToggle={() => toggleSelect(row.id)}
                        formatCurrency={formatCurrency}
                        orderQty={getOrderQty(row)}
                        onOrderQtyChange={(qty) => setOrderQty(row.id, qty)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ReorderRow({ row, selected, onToggle, formatCurrency, orderQty, onOrderQtyChange }: {
  row: BackroomInventoryRow;
  selected: boolean;
  onToggle: () => void;
  formatCurrency: (n: number) => string;
  orderQty: number;
  onOrderQtyChange: (qty: number) => void;
}) {
  const statusCfg = STOCK_STATUS_CONFIG[row.status];
  const forecast = forecastStockout(row.quantity_on_hand, 0.5);
  const estCost = orderQty * (row.cost_price ?? row.cost_per_gram ?? 0);

  return (
    <TableRow className={cn(selected && 'bg-primary/5')}>
      <TableCell className="pl-4">
        <Checkbox checked={selected} onCheckedChange={onToggle} />
      </TableCell>
      <TableCell>
        <div>
          <span className={tokens.body.emphasis}>{row.name}</span>
          {row.brand && <span className="text-muted-foreground text-xs block">{row.brand}</span>}
        </div>
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums">{row.quantity_on_hand}</TableCell>
      <TableCell className="text-right hidden sm:table-cell text-muted-foreground tabular-nums">{row.reorder_level ?? '—'}</TableCell>
      <TableCell className="text-right hidden sm:table-cell text-muted-foreground tabular-nums">{row.par_level ?? '—'}</TableCell>
      <TableCell className="text-right font-medium tabular-nums text-warning">{row.order_qty || '—'}</TableCell>
      <TableCell className="hidden lg:table-cell">
        {forecast.daysUntilStockout === 0 ? (
          <span className="text-destructive text-xs font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Now
          </span>
        ) : forecast.daysUntilStockout === Infinity ? (
          <span className="text-muted-foreground text-xs">—</span>
        ) : (
          <span className={cn('text-xs font-medium flex items-center gap-1', forecast.urgency === 'critical' ? 'text-destructive' : forecast.urgency === 'warning' ? 'text-warning' : 'text-muted-foreground')}>
            <Clock className="w-3 h-3" /> {forecast.daysUntilStockout}d
          </span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn('text-[10px] font-medium border', statusCfg.className)}>
          {statusCfg.label}
        </Badge>
      </TableCell>
      <TableCell className="text-right hidden md:table-cell text-muted-foreground tabular-nums">
        {estCost > 0 ? formatCurrency(estCost) : '—'}
      </TableCell>
    </TableRow>
  );
}
