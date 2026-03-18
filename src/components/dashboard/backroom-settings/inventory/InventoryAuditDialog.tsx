/**
 * InventoryAuditDialog — Shows chronological audit trail for a product's
 * stock changes and min/max setting changes.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowUp, ArrowDown, Settings, User, Clock } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useInventoryAuditTrail, type AuditEntry } from '@/hooks/backroom/useInventoryAuditTrail';
import { DRILLDOWN_DIALOG_CONTENT_CLASS } from '@/components/dashboard/drilldownDialogStyles';
import { format, formatDistanceToNow } from 'date-fns';

interface InventoryAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  productName: string;
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

export function InventoryAuditDialog({ open, onOpenChange, productId, productName }: InventoryAuditDialogProps) {
  const { data: entries = [], isLoading } = useInventoryAuditTrail(open ? productId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DRILLDOWN_DIALOG_CONTENT_CLASS}>
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <DialogTitle className={cn(tokens.card.title, 'text-sm')}>
            Audit Trail
          </DialogTitle>
          <p className="text-muted-foreground text-xs mt-0.5">{productName}</p>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-5 py-3 space-y-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className={tokens.loading.spinner} />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No changes recorded yet</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border/60" />

                {entries.map((entry, i) => (
                  <AuditRow key={entry.id} entry={entry} isLast={i === entries.length - 1} />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function AuditRow({ entry, isLast }: { entry: AuditEntry; isLast: boolean }) {
  const isStock = entry.type === 'stock';
  const isPositive = isStock && (entry.quantity_change ?? 0) > 0;
  const isNegative = isStock && (entry.quantity_change ?? 0) < 0;

  return (
    <div className={cn('relative flex gap-3 pb-4', isLast && 'pb-0')}>
      {/* Timeline dot */}
      <div className={cn(
        'relative z-10 mt-1.5 w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0',
        isStock
          ? isPositive
            ? 'bg-success/10 text-success'
            : isNegative
              ? 'bg-destructive/10 text-destructive'
              : 'bg-muted text-muted-foreground'
          : 'bg-primary/10 text-primary'
      )}>
        {isStock ? (
          isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <Settings className="w-3 h-3" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn(
            'text-[10px] font-medium border',
            isStock ? 'bg-muted/50 text-foreground/70' : 'bg-primary/5 text-primary border-primary/20'
          )}>
            {getFieldLabel(entry.field)}
          </Badge>

          {isStock && entry.quantity_change != null && (
            <span className={cn(
              'text-xs font-medium tabular-nums',
              isPositive ? 'text-success' : isNegative ? 'text-destructive' : 'text-muted-foreground'
            )}>
              {isPositive ? '+' : ''}{entry.quantity_change}
            </span>
          )}

          {isStock && entry.quantity_after != null && (
            <span className="text-muted-foreground text-[10px] tabular-nums">
              → {entry.quantity_after}
            </span>
          )}

          {!isStock && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {entry.old_value ?? '—'} → {entry.quantity_after ?? '—'}
            </span>
          )}
        </div>

        {entry.notes && (
          <p className="text-muted-foreground text-[11px] mt-0.5 truncate">{entry.notes}</p>
        )}

        <div className="flex items-center gap-2 mt-1 text-muted-foreground/60 text-[10px]">
          {entry.changed_by_name && (
            <span className="flex items-center gap-0.5">
              <User className="w-2.5 h-2.5" />
              {entry.changed_by_name}
            </span>
          )}
          <span title={format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}>
            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}
