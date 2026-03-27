/**
 * AuditEntryDetailPanel — Drill-down panel showing full context for an audit entry.
 * Used from both InventoryAuditDialog (per-product) and AuditLogTab (bulk).
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowUp, ArrowDown, Settings, User, Clock, Package, Hash, FileText, ArrowRight } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { DRILLDOWN_DIALOG_CONTENT_CLASS, DRILLDOWN_OVERLAY_CLASS } from '@/components/dashboard/drilldownDialogStyles';
import { format } from 'date-fns';

export interface AuditDetailEntry {
  id: string;
  type: 'stock' | 'setting';
  created_at: string;
  changed_by: string | null;
  changed_by_name: string | null;
  quantity_change: number | null;
  quantity_after: number | null;
  field: string;
  old_value: number | null;
  notes: string | null;
  product_name?: string;
  product_id?: string;
}

interface AuditEntryDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: AuditDetailEntry | null;
}

const FIELD_LABELS: Record<string, string> = {
  count_adjustment: 'Stock Adjustment',
  receiving: 'Receiving',
  po_received: 'PO Received',
  usage: 'Usage',
  sale: 'Sale',
  waste_adjustment: 'Waste',
  expiration_discard: 'Expiration',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
  manual_adjustment: 'Manual Adjustment',
  reorder_level: 'Min Level',
  par_level: 'Max Level',
};

function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function DetailRow({ icon: Icon, label, value, className }: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <div className={cn('text-sm mt-0.5', className)}>{value}</div>
      </div>
    </div>
  );
}

export function AuditEntryDetailPanel({ open, onOpenChange, entry }: AuditEntryDetailPanelProps) {
  if (!entry) return null;

  const isStock = entry.type === 'stock';
  const isPositive = isStock && (entry.quantity_change ?? 0) > 0;
  const isNegative = isStock && (entry.quantity_change ?? 0) < 0;

  const typeColor = isStock
    ? isPositive
      ? 'bg-success/10 text-success'
      : isNegative
        ? 'bg-destructive/10 text-destructive'
        : 'bg-muted text-muted-foreground'
    : 'bg-primary/10 text-primary';

  const TypeIcon = isStock
    ? (isPositive ? ArrowUp : ArrowDown)
    : Settings;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(DRILLDOWN_DIALOG_CONTENT_CLASS, 'max-w-md')}
        overlayClassName={DRILLDOWN_OVERLAY_CLASS}
      >
        {/* Hero header */}
        <div className="px-5 pt-5 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', typeColor)}>
              <TypeIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogHeader className="p-0 space-y-0">
                <DialogTitle className={cn(tokens.card.title, 'text-sm')}>
                  {getFieldLabel(entry.field)}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {isStock ? 'Stock Change' : 'Setting Change'}
                </DialogDescription>
              </DialogHeader>
            </div>
            <Badge variant="outline" className={cn(
              'text-[10px] shrink-0',
              isStock ? 'bg-muted/50 text-foreground/70' : 'bg-primary/5 text-primary border-primary/20'
            )}>
              {isStock ? 'Stock' : 'Setting'}
            </Badge>
          </div>

          {/* Value change hero */}
          <div className="rounded-xl bg-muted/40 border border-border/40 p-4 text-center">
            {isStock ? (
              <div className="flex items-center justify-center gap-4">
                {entry.quantity_after != null && entry.quantity_change != null && (
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Before</p>
                    <p className="text-lg tabular-nums">{entry.quantity_after - entry.quantity_change}</p>
                  </div>
                )}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'text-xs font-medium tabular-nums px-2 py-0.5 rounded-full',
                    isPositive ? 'bg-success/10 text-success' : isNegative ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                  )}>
                    {entry.quantity_change != null
                      ? (isPositive ? '+' : '') + entry.quantity_change
                      : '—'}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground mt-1" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-muted-foreground">After</p>
                  <p className="text-lg tabular-nums font-medium">{entry.quantity_after ?? '—'}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Previous</p>
                  <p className="text-lg tabular-nums">{entry.old_value ?? '—'}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-[10px] text-muted-foreground">New Value</p>
                  <p className="text-lg tabular-nums font-medium">{entry.quantity_after ?? '—'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="px-5 pb-5 space-y-0">
          {entry.product_name && (
            <DetailRow
              icon={Package}
              label="Product"
              value={entry.product_name}
              className="font-medium"
            />
          )}

          <DetailRow
            icon={Clock}
            label="Timestamp"
            value={format(new Date(entry.created_at), 'EEEE, MMM d, yyyy · h:mm:ss a')}
            className="tabular-nums"
          />

          <DetailRow
            icon={User}
            label="Changed By"
            value={entry.changed_by_name ?? 'System'}
          />

          <DetailRow
            icon={Hash}
            label="Entry ID"
            value={<span className="text-xs text-muted-foreground font-mono">{entry.id}</span>}
          />

          {entry.notes && (
            <>
              <Separator className="my-1" />
              <DetailRow
                icon={FileText}
                label="Notes"
                value={entry.notes}
                className="text-muted-foreground"
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
