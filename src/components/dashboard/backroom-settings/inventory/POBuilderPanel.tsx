/**
 * POBuilderPanel — Right-side slide panel for building Purchase Orders.
 * Groups staged items by supplier, shows editable quantities, cost per item, totals.
 * States: Draft → Submitted.
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Truck, Minus, Plus, Send, FileText, Trash2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { type BackroomInventoryRow } from '@/hooks/backroom/useBackroomInventoryTable';
import { stripSizeSuffix } from './CommandCenterRow';

interface POBuilderPanelProps {
  open: boolean;
  onClose: () => void;
  items: BackroomInventoryRow[];
  qtyOverrides: Map<string, number>;
  onQtyOverride: (productId: string, qty: number | null) => void;
  onRemoveItem: (productId: string) => void;
  onClearAll: () => void;
  onSubmitPO: (supplierGroup: SupplierPOGroup) => void;
  formatCurrency: (n: number) => string;
}

export interface SupplierPOGroup {
  supplier: string;
  items: BackroomInventoryRow[];
  totalCost: number;
}

export function POBuilderPanel({
  open,
  onClose,
  items,
  qtyOverrides,
  onQtyOverride,
  onRemoveItem,
  onClearAll,
  onSubmitPO,
  formatCurrency,
}: POBuilderPanelProps) {
  // Group items by supplier
  const supplierGroups = useMemo((): SupplierPOGroup[] => {
    const map = new Map<string, BackroomInventoryRow[]>();
    for (const item of items) {
      const supplier = item.supplier_name || 'Unassigned';
      const arr = map.get(supplier) ?? [];
      arr.push(item);
      map.set(supplier, arr);
    }
    return Array.from(map.entries())
      .sort((a, b) => {
        if (a[0] === 'Unassigned') return 1;
        if (b[0] === 'Unassigned') return -1;
        return a[0].localeCompare(b[0]);
      })
      .map(([supplier, groupItems]) => ({
        supplier,
        items: groupItems,
        totalCost: groupItems.reduce((s, item) => {
          const qty = qtyOverrides.get(item.id) ?? item.recommended_order_qty;
          const cost = item.cost_price ?? item.cost_per_gram ?? 0;
          return s + qty * cost;
        }, 0),
      }));
  }, [items, qtyOverrides]);

  const grandTotal = supplierGroups.reduce((s, g) => s + g.totalCost, 0);

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-[400px] max-w-[90vw] bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right fade-in duration-200 ease-out">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className={cn(tokens.label.tiny, 'text-foreground')}>PO Builder</span>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            ({items.length} {items.length === 1 ? 'item' : 'items'})
          </span>
        </div>
        <div className="flex items-center gap-1">
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs font-sans text-muted-foreground hover:text-destructive"
              onClick={onClearAll}
            >
              Clear All
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className={cn(tokens.empty.container, 'flex-1')}>
          <FileText className={tokens.empty.icon} />
          <h3 className={tokens.empty.heading}>No items staged</h3>
          <p className={tokens.empty.description}>
            Use "Add to PO" on inventory rows or "Auto Build PO" to populate.
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {supplierGroups.map((group) => (
              <SupplierPOCard
                key={group.supplier}
                group={group}
                qtyOverrides={qtyOverrides}
                onQtyOverride={onQtyOverride}
                onRemoveItem={onRemoveItem}
                onSubmitPO={onSubmitPO}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Footer */}
      {items.length > 0 && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-sans">Grand Total</span>
            <span className="text-sm font-medium tabular-nums">{formatCurrency(grandTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
            <span>{supplierGroups.length} {supplierGroups.length === 1 ? 'supplier' : 'suppliers'}</span>
            <span>{items.length} line items</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Supplier PO Card ──────────────────────────────

function SupplierPOCard({
  group,
  qtyOverrides,
  onQtyOverride,
  onRemoveItem,
  onSubmitPO,
  formatCurrency,
}: {
  group: SupplierPOGroup;
  qtyOverrides: Map<string, number>;
  onQtyOverride: (productId: string, qty: number | null) => void;
  onRemoveItem: (productId: string) => void;
  onSubmitPO: (group: SupplierPOGroup) => void;
  formatCurrency: (n: number) => string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const isUnassigned = group.supplier === 'Unassigned';

  return (
    <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
      {/* Supplier header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        }
        <Truck className={cn('w-3.5 h-3.5', isUnassigned ? 'text-muted-foreground/40' : 'text-primary')} />
        <span className={cn('text-xs font-sans', isUnassigned ? 'text-muted-foreground/60' : 'text-foreground')}>
          {group.supplier}
        </span>
        <span className="text-[10px] text-muted-foreground">({group.items.length})</span>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {formatCurrency(group.totalCost)}
        </span>
      </div>

      {/* Line items */}
      {!collapsed && (
        <div className="border-t border-border/50">
          {group.items.map((item) => {
            const qty = qtyOverrides.get(item.id) ?? item.recommended_order_qty;
            const unitCost = item.cost_price ?? item.cost_per_gram ?? 0;
            const lineTotal = qty * unitCost;

            return (
              <div
                key={item.id}
                className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 last:border-b-0 group/line hover:bg-muted/30 transition-colors"
              >
                {/* Product name */}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-sans text-foreground truncate block">
                    {stripSizeSuffix(item.name)}
                  </span>
                  {unitCost > 0 && (
                    <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                      {formatCurrency(unitCost)} each
                    </span>
                  )}
                </div>

                {/* Qty stepper */}
                <div className="flex items-center gap-0.5">
                  <button
                    className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    onClick={() => {
                      const newQty = Math.max(1, qty - 1);
                      onQtyOverride(item.id, newQty === item.recommended_order_qty ? null : newQty);
                    }}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v > 0) {
                        onQtyOverride(item.id, v === item.recommended_order_qty ? null : v);
                      }
                    }}
                    className="w-10 h-6 text-center text-xs tabular-nums rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  <button
                    className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    onClick={() => {
                      const newQty = qty + 1;
                      onQtyOverride(item.id, newQty === item.recommended_order_qty ? null : newQty);
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Line total */}
                <span className="text-xs tabular-nums text-muted-foreground w-16 text-right">
                  {lineTotal > 0 ? formatCurrency(lineTotal) : '—'}
                </span>

                {/* Remove */}
                <button
                  className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground/40 hover:text-destructive opacity-0 group-hover/line:opacity-100 transition-opacity"
                  onClick={() => onRemoveItem(item.id)}
                  title="Remove from PO"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* Submit button per supplier */}
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/50 font-sans">
              {group.items.length} {group.items.length === 1 ? 'item' : 'items'} · {formatCurrency(group.totalCost)}
            </span>
            <Button
              size="sm"
              className="h-7 px-3 text-xs font-sans gap-1"
              onClick={() => onSubmitPO(group)}
              disabled={isUnassigned}
              title={isUnassigned ? 'Assign a supplier before submitting' : `Create draft PO for ${group.supplier}`}
            >
              <Send className="w-3 h-3" />
              Create Draft PO
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
