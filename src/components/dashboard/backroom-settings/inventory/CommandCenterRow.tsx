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
      <span className="text-[10px] text-muted-foreground/60 font-sans">{label}</span>
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
          className="text-sm tabular-nums cursor-pointer border-b border-dashed border-muted-foreground/20 hover:border-primary/60 transition-colors text-muted-foreground"
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

  useEffect(() => {
    if (editingQty && qtyInputRef.current) {
      qtyInputRef.current.focus();
      qtyInputRef.current.select();
    }
  }, [editingQty]);

  return (
    <>
      <TableRow
        className={cn(
          'group/row transition-colors relative',
          row.severity === 'critical' && 'bg-destructive/[0.04] hover:bg-destructive/[0.07]',
          row.severity === 'low' && 'bg-warning/[0.03] hover:bg-warning/[0.06]',
          row.severity === 'healthy' && 'hover:bg-muted/40',
        )}
      >
        {/* Severity color bar */}
        <TableCell className="w-10 relative">
          {row.severity !== 'healthy' && (
            <span className={cn('absolute left-0 top-1 bottom-1 w-[3px] rounded-full', severityCfg.barColor)} />
          )}
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(row.id)}
          />
        </TableCell>

        {/* Product */}
        <TableCell className="pl-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <div className="min-w-0">
              <span className={tokens.body.emphasis}>{stripSizeSuffix(row.name)}</span>
              {row.sku && <span className="text-muted-foreground text-xs ml-2">{row.sku}</span>}
              {row.container_size && (
                <span className="text-muted-foreground/50 text-[10px] ml-1.5">{row.container_size}</span>
              )}
              {intelligence && intelligence.dailyUsage > 0 && intelligence.daysRemaining !== Infinity && (
                <div className="mt-0.5">
                  <span className={cn(
                    'text-[10px]',
                    intelligence.daysRemaining < 7
                      ? 'text-destructive/60'
                      : intelligence.daysRemaining < 14
                        ? 'text-warning/60'
                        : 'text-muted-foreground/50',
                  )}>
                    ~{intelligence.daysRemaining}d remaining
                  </span>
                </div>
              )}
            </div>
          </div>
        </TableCell>

        {/* Stock */}
        <TableCell className="text-right tabular-nums">
          <div className="flex flex-col items-end">
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
            {intelligence && intelligence.dailyUsage > 0 && (
              <span className="text-[10px] text-muted-foreground/40 tabular-nums">{intelligence.dailyUsage}/day</span>
            )}
          </div>
        </TableCell>

        {/* Suggested Order — PRIMARY DECISION SIGNAL */}
        <TableCell className="text-right tabular-nums">
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
                    className="w-14 h-7 px-1.5 text-right text-sm tabular-nums rounded border border-primary/40 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                ) : (
                  <span
                    className={cn(
                      'text-lg tabular-nums cursor-pointer transition-colors',
                      isOverridden
                        ? 'text-primary border-b border-dashed border-primary/40'
                        : 'text-foreground font-medium border-b border-dashed border-transparent hover:border-muted-foreground/30',
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
                {/* Auto / Edited indicator */}
                {isOverridden ? (
                  <button
                    className="text-[9px] text-primary/70 hover:text-primary bg-primary/5 px-1.5 py-0.5 rounded-full transition-colors flex items-center gap-0.5"
                    onClick={() => onQtyOverride?.(row.id, null)}
                    title="Reset to auto-calculated quantity"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Edited
                  </button>
                ) : needsReorder ? (
                  <span className="text-[9px] text-muted-foreground/50">Auto</span>
                ) : null}
              </div>
              {/* Effective stock context */}
              {row.open_po_qty > 0 && (
                <span className="text-primary/60 text-[10px]" title={`${row.quantity_on_hand} on hand + ${row.open_po_qty} on order = ${effectiveStock} effective`}>
                  {row.open_po_qty} on order
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground/30">—</span>
          )}
        </TableCell>

        {/* Status — Dual-Layer: State + Severity */}
        <TableCell>
          <div className="flex flex-col leading-tight">
            <span className={cn(
              'text-xs font-sans',
              row.stock_state === 'out_of_stock' ? 'text-destructive' : 'text-foreground',
            )}>
              {row.stock_state === 'out_of_stock' ? 'Out of Stock' : 'In Stock'}
            </span>
            <span className={cn('text-[10px] font-sans', SEVERITY_CONFIG[row.severity].labelColor)}>
              {SEVERITY_CONFIG[row.severity].label}
            </span>
          </div>
        </TableCell>

        {/* Supplier */}
        <TableCell className="hidden lg:table-cell">
          {row.supplier_name ? (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Truck className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[120px]">{row.supplier_name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground/30 text-sm">—</span>
          )}
        </TableCell>

        {/* Cost */}
        <TableCell className="text-right hidden sm:table-cell text-muted-foreground tabular-nums">
          {row.cost_price != null
            ? formatCurrency(row.cost_price)
            : row.cost_per_gram != null
              ? `${formatCurrency(row.cost_per_gram)}/g`
              : '—'}
        </TableCell>

        {/* Actions — Primary: Add to PO */}
        <TableCell className="w-24">
          <div className="flex items-center gap-0.5 justify-end">
            {(needsReorder || isOverridden) && (
              addedToPo ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs font-sans text-success hover:text-success hover:bg-success/10 gap-1"
                  onClick={() => onToggleAddToPo?.(row.id)}
                  title="Remove from PO"
                >
                  <Check className="w-3.5 h-3.5" />
                  Added
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs font-sans text-primary hover:text-primary hover:bg-primary/10 gap-1"
                  onClick={() => onToggleAddToPo?.(row.id)}
                  title={`Add ${displayOrderQty} to PO`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add to PO
                </Button>
              )
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-foreground opacity-0 group-hover/row:opacity-100 transition-opacity"
              onClick={() => onAudit(row.id, row.name)}
              title="View audit trail"
            >
              <History className="w-3.5 h-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Expandable Detail Row */}
      {expanded && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell />
          <TableCell colSpan={7} className="py-3">
            <div className="flex flex-wrap items-start gap-6 pl-6">
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
              {row.container_size && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground/60 font-sans">Container</span>
                  <span className="text-sm text-muted-foreground">{row.container_size}</span>
                </div>
              )}
              {row.brand && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground/60 font-sans">Brand</span>
                  <span className="text-sm text-muted-foreground">{row.brand}</span>
                </div>
              )}
              {row.category && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground/60 font-sans">Category</span>
                  <span className="text-sm text-muted-foreground">{formatCategoryLabel(row.category)}</span>
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground/60 font-sans">PO History</span>
                {poHistory && poHistory.some(v => v > 0) ? (
                  <TrendSparkline data={poHistory} variant="muted" width={80} height={24} />
                ) : (
                  <span className="text-muted-foreground/40 text-xs">—</span>
                )}
              </div>
              {intelligence && intelligence.dailyUsage > 0 && (
                <>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground/60 font-sans">Avg Daily Usage</span>
                    <span className="text-sm text-muted-foreground tabular-nums">{intelligence.dailyUsage}/day</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground/60 font-sans">Days Remaining</span>
                    <span className={cn(
                      'text-sm tabular-nums',
                      intelligence.daysRemaining === Infinity
                        ? 'text-muted-foreground/40'
                        : intelligence.daysRemaining < 7
                          ? 'text-destructive'
                          : intelligence.daysRemaining < 14
                            ? 'text-warning'
                            : 'text-muted-foreground',
                    )}>
                      {intelligence.daysRemaining === Infinity ? '—' : `~${intelligence.daysRemaining}d`}
                    </span>
                  </div>
                </>
              )}
              {row.open_po_qty > 0 && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground/60 font-sans">Pending Orders</span>
                  <span className="text-sm text-primary">{row.open_po_qty} units</span>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
