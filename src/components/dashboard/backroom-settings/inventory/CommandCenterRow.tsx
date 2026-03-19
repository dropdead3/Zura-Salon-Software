/**
 * CommandCenterRow — Single inventory row for the Smart Inventory Command Center.
 * Shows: Checkbox, Product, Stock, Suggested Order, Status, Supplier, Cost, Actions.
 * Expandable detail row reveals Reorder Pt, Par Level, Container, PO History.
 */

import { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronRight, History, ShoppingCart, Truck, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { STOCK_STATUS_CONFIG, type BackroomInventoryRow } from '@/hooks/backroom/useBackroomInventoryTable';
import { TrendSparkline } from '@/components/dashboard/TrendSparkline';

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
          'w-16 h-7 px-1.5 text-right text-sm tabular-nums rounded border border-primary/40 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40',
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        'cursor-pointer border-b border-dashed border-muted-foreground/30 hover:border-primary/60 transition-colors tabular-nums',
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
          className="w-16 h-6 px-1.5 text-right text-xs tabular-nums rounded border border-primary/40 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
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
  onQuickReorder: (row: BackroomInventoryRow) => void;
  poHistory?: number[];
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
}: CommandCenterRowProps) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STOCK_STATUS_CONFIG[row.status];
  const needsReorder = row.recommended_order_qty > 0;

  return (
    <>
      <TableRow
        className={cn(
          'group/row transition-colors',
          needsReorder && 'bg-warning/[0.03] hover:bg-warning/[0.06]',
        )}
      >
        {/* Checkbox */}
        <TableCell className="w-10">
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
            </div>
          </div>
        </TableCell>

        {/* Stock */}
        <TableCell className="text-right tabular-nums">
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
        </TableCell>

        {/* Suggested Order — PRIMARY */}
        <TableCell className="text-right tabular-nums">
          {needsReorder ? (
            <div className="flex flex-col items-end">
              <span className="text-foreground font-medium text-base">{row.recommended_order_qty}</span>
              {row.open_po_qty > 0 && (
                <span className="text-primary/60 text-[10px]" title={`${row.open_po_qty} on open POs`}>
                  {row.open_po_qty} on order
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground/30">—</span>
          )}
        </TableCell>

        {/* Status */}
        <TableCell>
          <Badge variant="outline" className={cn('text-[10px] font-medium border', statusCfg.className)}>
            {statusCfg.label}
          </Badge>
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

        {/* Actions */}
        <TableCell className="w-20">
          <div className="flex items-center gap-0.5 justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => onAudit(row.id, row.name)}
              title="View audit trail"
            >
              <History className="w-3.5 h-3.5" />
            </Button>
            {needsReorder && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-warning hover:text-warning hover:bg-warning/10"
                onClick={() => onQuickReorder(row)}
                title={`Quick reorder ${row.recommended_order_qty} units`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
              </Button>
            )}
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
