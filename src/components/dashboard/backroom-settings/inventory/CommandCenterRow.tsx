/**
 * CommandCenterRow — Single inventory row for the Smart Inventory Command Center.
 * Shows: Checkbox, Product, Stock, Suggested Order (with manual override), Status, Supplier, Cost, Actions.
 * Expandable detail row reveals Reorder Pt, Par Level, Container, PO History.
 */

import { useState, useRef, useEffect } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight, History, ShoppingCart, Truck, RotateCcw, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { type BackroomInventoryRow, type StockSeverity } from '@/hooks/backroom/useBackroomInventoryTable';
import { TrendSparkline } from '@/components/dashboard/TrendSparkline';

// ─── Severity visual config ──────────────────────
const SEVERITY_CONFIG: Record<StockSeverity, { barColor: string; label: string; labelColor: string }> = {
  critical: { barColor: 'bg-destructive', label: 'Critical', labelColor: 'text-destructive' },
  low: { barColor: 'bg-warning', label: 'Low', labelColor: 'text-warning' },
  healthy: { barColor: 'bg-success', label: 'Healthy', labelColor: 'text-success/70' },
};

// ─── Helpers ──────────────────────────────────────

export function stripSizeSuffix(name: string): string {
  return name.replace(/\s*[—–-]\s*\d+(\.\d+)?\s*(g|oz|ml|L)\s*$/i, '').trim();
}

export function formatCategoryLabel(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Inline Edit Cell (minimal, for Stock column) ──

function InlineEditCell({
  value,
  placeholder = '—',
  onSave,
  className,
}: {
  value: number | null;
  placeholder?: string;
  onSave: (newValue: number | null) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === '') { onSave(null); return; }
    const parsed = parseFloat(trimmed);
    if (!isNaN(parsed) && parsed !== value) onSave(parsed);
  };

  if (editing) {
    return (
      <input
        type="number"
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className={cn(
          'w-16 h-7 px-1.5 text-right text-sm tabular-nums rounded border border-primary/40 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all duration-150',
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-block w-16 h-7 leading-7 text-right cursor-pointer border-b border-dashed border-muted-foreground/30 hover:border-primary/60 transition-colors duration-150 tabular-nums',
        className,
      )}
      onClick={() => { setDraft(value != null ? String(value) : ''); setEditing(true); }}
      title="Click to edit"
    >
      {value != null ? value : placeholder}
    </span>
  );
}

// ─── Detail Edit Cell (for expandable row) ──

function DetailEditCell({
  label,
  value,
  onSave,
}: {
  label: string;
  value: number | null;
  onSave: (v: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === '') { onSave(null); return; }
    const parsed = parseFloat(trimmed);
    if (!isNaN(parsed) && parsed !== value) onSave(parsed);
  };

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground/50 font-sans">{label}</span>
      {editing ? (
        <input
          type="number"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-16 h-6 px-1.5 text-right text-xs tabular-nums rounded border border-primary/40 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all duration-150"
        />
      ) : (
        <span
          className="text-sm tabular-nums cursor-pointer border-b border-dashed border-muted-foreground/20 hover:border-primary/60 transition-colors duration-150 text-muted-foreground"
          onClick={() => { setDraft(value != null ? String(value) : ''); setEditing(true); }}
          title="Click to edit"
        >
          {value != null ? value : '—'}
        </span>
      )}
    </div>
  );
}

// ─── Main Row ──────────────────────────────────

interface CommandCenterRowProps {
  row: BackroomInventoryRow;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  formatCurrency: (n: number) => string;
  orgId: string | undefined;
  locationId: string | undefined;
  adjustStock: any;
  updateMinMax: any;
  onAudit: (productId: string, productName: string) => void;
  onQuickReorder: (row: BackroomInventoryRow, overrideQty?: number) => void;
  poHistory?: number[];
  /** Manual quantity override map — managed by parent */
  qtyOverride?: number | null;
  onQtyOverride?: (productId: string, qty: number | null) => void;
  /** Whether this item has been added to the PO builder */
  addedToPo?: boolean;
  onToggleAddToPo?: (productId: string) => void;
  /** Smart intelligence data from usage velocity */
  intelligence?: { dailyUsage: number; daysRemaining: number };
}

export function CommandCenterRow({
  row,
  isSelected,
  onToggleSelect,
  formatCurrency,
  orgId,
  locationId,
  adjustStock,
  updateMinMax,
  onAudit,
  onQuickReorder,
  poHistory,
  qtyOverride,
  onQtyOverride,
  addedToPo = false,
  onToggleAddToPo,
  intelligence,
}: CommandCenterRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingQty, setEditingQty] = useState(false);
  const [qtyDraft, setQtyDraft] = useState('');
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const needsReorder = row.recommended_order_qty > 0;
  const isOverridden = qtyOverride != null;
  const displayOrderQty = isOverridden ? qtyOverride : row.recommended_order_qty;
  const effectiveStock = row.effective_stock;
  const severityCfg = SEVERITY_CONFIG[row.severity];

  // Days remaining helper
  const daysRemaining = intelligence && intelligence.dailyUsage > 0 && intelligence.daysRemaining !== Infinity
    ? intelligence.daysRemaining
    : null;

  useEffect(() => {
    if (editingQty && qtyInputRef.current) {
      qtyInputRef.current.focus();
      qtyInputRef.current.select();
    }
  }, [editingQty]);

  // Usage activity label for expanded row
  const usageActivityLabel = intelligence
    ? intelligence.dailyUsage >= 1
      ? 'Active — used daily'
      : intelligence.dailyUsage > 0
        ? 'Slow mover — <1/day'
        : null
    : null;

  return (
    <>
      <TableRow
        className={cn(
          'group/row transition-colors duration-150 relative',
          // Point 3: Reduced row tinting — subtle wash only
          row.severity === 'critical' && 'bg-destructive/[0.015] hover:bg-destructive/[0.03]',
          row.severity === 'low' && 'bg-warning/[0.01] hover:bg-warning/[0.025]',
          row.severity === 'healthy' && 'hover:bg-muted/40',
        )}
      >
        {/* Severity color bar */}
        <TableCell className="w-10 relative">
          {row.severity !== 'healthy' && (
            <span className={cn('absolute left-0 top-1 bottom-1 w-[3px] rounded-full transition-opacity duration-150', severityCfg.barColor)} />
          )}
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(row.id)}
          />
        </TableCell>

        {/* Product — Clean: name + SKU + container only */}
        <TableCell className="pl-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground hover:text-foreground transition-colors duration-150 shrink-0"
            >
              <ChevronRight className={cn('w-3.5 h-3.5 transition-transform duration-150', expanded && 'rotate-90')} />
            </button>
            <div className="min-w-0">
              <span className={tokens.body.emphasis}>{stripSizeSuffix(row.name)}</span>
              {row.sku && <span className="text-muted-foreground/50 text-[11px] ml-2 tabular-nums">{row.sku}</span>}
              {row.container_size && (
                <span className="text-muted-foreground/40 text-[10px] ml-1.5">{row.container_size}</span>
              )}
            </div>
          </div>
        </TableCell>

        {/* Stock — Enhanced: on-hand + pending orders + days remaining */}
        <TableCell className="text-right tabular-nums w-20">
          <div className="flex flex-col items-end gap-0.5">
            <InlineEditCell
              value={row.quantity_on_hand}
              onSave={(newVal) => {
                if (!orgId || newVal == null) return;
                adjustStock.mutate({
                  orgId, productId: row.id, currentQty: row.quantity_on_hand, newQty: newVal, locationId,
                });
              }}
              className="font-medium"
            />
            {/* Point 5: Pending orders promoted */}
            {row.open_po_qty > 0 && (
              <span className="text-[10px] text-primary/60 tabular-nums" title={`${row.quantity_on_hand} on hand + ${row.open_po_qty} on order = ${effectiveStock} effective`}>
                ({row.open_po_qty} on order)
              </span>
            )}
            {/* Point 4: Days remaining promoted */}
            {daysRemaining !== null ? (
              <span className={cn(
                'text-[11px] tabular-nums',
                daysRemaining === 0
                  ? 'text-destructive'
                  : daysRemaining <= 3
                    ? 'text-destructive/70'
                    : daysRemaining <= 7
                      ? 'text-warning/70'
                      : 'text-muted-foreground/40',
              )}>
                {daysRemaining === 0 ? 'Out now' : `~${daysRemaining}d left`}
              </span>
            ) : row.stock_state === 'out_of_stock' ? (
              <span className="text-[11px] text-destructive tabular-nums">Out now</span>
            ) : null}
          </div>
        </TableCell>

        {/* Suggested Order — PRIMARY DECISION SIGNAL (Point 2: Visual dominance) */}
        <TableCell className="text-right tabular-nums w-28">
          {needsReorder || isOverridden ? (
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1.5 justify-end">
                {/* Editable quantity */}
                {editingQty ? (
                  <input
                    ref={qtyInputRef}
                    type="number"
                    min={0}
                    value={qtyDraft}
                    onChange={(e) => setQtyDraft(e.target.value)}
                    onBlur={() => {
                      setEditingQty(false);
                      const parsed = parseInt(qtyDraft, 10);
                      if (!isNaN(parsed) && parsed >= 0 && parsed !== row.recommended_order_qty) {
                        onQtyOverride?.(row.id, parsed === 0 ? null : parsed);
                      } else if (!isNaN(parsed) && parsed === row.recommended_order_qty) {
                        onQtyOverride?.(row.id, null); // Reset to auto
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') setEditingQty(false);
                    }}
                    className="w-14 h-7 px-1.5 text-right text-sm tabular-nums rounded border border-primary/40 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all duration-150"
                  />
                ) : (
                  <span
                    className={cn(
                      'tabular-nums cursor-pointer transition-colors duration-150',
                      // Point 2: Larger, more prominent
                      'text-xl font-medium tracking-tight',
                      displayOrderQty > 0 && 'bg-primary/[0.06] px-2 py-0.5 rounded-md',
                      isOverridden
                        ? 'text-primary border-b border-dashed border-primary/40'
                        : 'text-foreground border-b border-dashed border-transparent hover:border-muted-foreground/30',
                    )}
                    onClick={() => {
                      setQtyDraft(String(displayOrderQty));
                      setEditingQty(true);
                    }}
                    title="Click to override quantity"
                  >
                    {displayOrderQty}
                  </span>
                )}
                {/* Point 8: Auto / Manual confidence layer */}
                {isOverridden ? (
                  <button
                    className="text-[9px] text-accent-foreground bg-accent/10 px-1.5 py-0.5 rounded-full transition-colors duration-150 flex items-center gap-0.5 hover:bg-accent/20"
                    onClick={() => onQtyOverride?.(row.id, null)}
                    title="Reset to auto-calculated quantity"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Edited
                  </button>
                ) : needsReorder ? (
                  <span className="text-[9px] text-muted-foreground/30">Auto</span>
                ) : null}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground/25 tabular-nums">—</span>
          )}
        </TableCell>

        {/* Status — Ghost Badges: State + Severity */}
        <TableCell className="w-28">
          <div className="flex flex-col gap-1">
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 h-5 font-sans font-normal w-fit',
                row.stock_state === 'out_of_stock'
                  ? 'bg-destructive/10 text-destructive border-destructive/20'
                  : 'bg-success/10 text-success border-success/20',
              )}
            >
              {row.stock_state === 'out_of_stock' ? 'Out of Stock' : 'In Stock'}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 h-5 font-sans font-normal w-fit',
                row.severity === 'critical' && 'bg-destructive/10 text-destructive border-destructive/20',
                row.severity === 'low' && 'bg-warning/10 text-warning border-warning/20',
                row.severity === 'healthy' && 'bg-success/10 text-success/70 border-success/20',
              )}
            >
              {SEVERITY_CONFIG[row.severity].label}
            </Badge>
          </div>
        </TableCell>

        {/* Supplier */}
        <TableCell className="hidden lg:table-cell">
          {row.supplier_name ? (
            <span className="text-sm text-muted-foreground/70 flex items-center gap-1">
              <Truck className="w-3 h-3 shrink-0 text-muted-foreground/40" />
              <span className="truncate max-w-[120px]">{row.supplier_name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground/25 text-sm">—</span>
          )}
        </TableCell>

        {/* Cost */}
        <TableCell className="text-right hidden sm:table-cell text-muted-foreground/70 tabular-nums w-20">
          {row.cost_price != null
            ? formatCurrency(row.cost_price)
            : row.cost_per_gram != null
              ? `${formatCurrency(row.cost_per_gram)}/g`
              : <span className="text-muted-foreground/25">—</span>}
        </TableCell>

        {/* Actions — Point 6: Upgraded Add to PO */}
        <TableCell className="w-24">
          <div className="flex items-center gap-0.5 justify-end">
            {(needsReorder || isOverridden) && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 min-w-[96px] px-3 text-xs font-sans gap-1 transition-colors duration-150 active:scale-[0.98]',
                  addedToPo
                    ? 'text-success bg-success/10 hover:text-success hover:bg-success/15'
                    : 'text-primary bg-primary/10 hover:text-primary hover:bg-primary/15',
                )}
                onClick={() => onToggleAddToPo?.(row.id)}
                title={addedToPo ? 'Remove from PO' : `Add ${displayOrderQty} to PO`}
              >
                {addedToPo ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {addedToPo ? 'Added' : 'Add to PO'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-foreground opacity-0 group-hover/row:opacity-100 transition-opacity duration-150"
              onClick={() => onAudit(row.id, row.name)}
              title="View audit trail"
            >
              <History className="w-3.5 h-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Expandable Detail Row — Point 9: Decision-focused reorder */}
      {expanded && (
        <TableRow className="bg-muted/20 hover:bg-muted/20 animate-in fade-in duration-150">
          <TableCell />
          <TableCell colSpan={7} className="py-3">
            <div className="flex flex-wrap items-start gap-6 pl-6">
              {/* Action-relevant fields first */}
              <DetailEditCell
                label="Reorder Point"
                value={row.reorder_level}
                onSave={(v) => {
                  if (!orgId) return;
                  updateMinMax.mutate({ orgId, productId: row.id, field: 'reorder_level', value: v, oldValue: row.reorder_level, locationId });
                }}
              />
              <DetailEditCell
                label="Par Level"
                value={row.par_level}
                onSave={(v) => {
                  if (!orgId) return;
                  updateMinMax.mutate({ orgId, productId: row.id, field: 'par_level', value: v, oldValue: row.par_level, locationId });
                }}
              />

              {/* Intelligence fields */}
              {intelligence && intelligence.dailyUsage > 0 && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground/50 font-sans">Avg Daily Usage</span>
                  <span className="text-sm text-muted-foreground/70 tabular-nums">{intelligence.dailyUsage}/day</span>
                </div>
              )}
              {usageActivityLabel && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground/50 font-sans">Activity</span>
                  <span className="text-sm text-muted-foreground/70">{usageActivityLabel}</span>
                </div>
              )}

              {/* Reference fields */}
              {row.container_size && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground/50 font-sans">Container</span>
                  <span className="text-sm text-muted-foreground/70">{row.container_size}</span>
                </div>
              )}
              {row.brand && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground/50 font-sans">Brand</span>
                  <span className="text-sm text-muted-foreground/70">{row.brand}</span>
                </div>
              )}
              {row.category && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground/50 font-sans">Category</span>
                  <span className="text-sm text-muted-foreground/70">{formatCategoryLabel(row.category)}</span>
                </div>
              )}

              {/* PO History + Pending */}
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground/50 font-sans">PO History</span>
                {poHistory && poHistory.some(v => v > 0) ? (
                  <TrendSparkline data={poHistory} variant="muted" width={80} height={24} />
                ) : (
                  <span className="text-muted-foreground/25 text-xs">—</span>
                )}
              </div>
              {row.open_po_qty > 0 && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground/50 font-sans">Pending Orders</span>
                  <span className="text-sm text-primary/80 tabular-nums">{row.open_po_qty} units</span>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
