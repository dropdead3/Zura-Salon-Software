import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, Loader2, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStockMovements } from '@/hooks/useStockMovements';
import { formatDistanceToNow } from 'date-fns';
import { exportStockMovementsCsv } from '@/lib/exportStockMovementsCsv';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

const REASON_LABELS: Record<string, string> = {
  manual_adjust: 'Manual Adjustment',
  po_received: 'PO Received',
  receiving: 'Received',
  sale: 'Sale',
  return: 'Return',
  correction: 'Correction',
  usage: 'Mix Usage',
  transfer_out: 'Transfer Out',
  transfer_in: 'Transfer In',
  count_adjustment: 'Count Adjustment',
  waste_adjustment: 'Waste',
  expiration_discard: 'Expired',
};

const REFERENCE_TYPE_STYLES: Record<string, string> = {
  mix_session: 'bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400',
  purchase_order: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  transfer: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  count: 'bg-teal-100 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400',
  waste_event: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  manual: 'bg-muted text-muted-foreground',
};

const REFERENCE_TYPE_LABELS: Record<string, string> = {
  mix_session: 'Mix',
  purchase_order: 'PO',
  transfer: 'Transfer',
  count: 'Count',
  waste_event: 'Waste',
  manual: 'Manual',
};

interface StockMovementHistoryProps {
  productId: string;
}

export function StockMovementHistory({ productId }: StockMovementHistoryProps) {
  const { data: movements, isLoading } = useStockMovements(productId);
  const { effectiveOrganization } = useOrganizationContext();

  const handleExport = async () => {
    if (!effectiveOrganization?.id) return;
    try {
      await exportStockMovementsCsv(effectiveOrganization.id, productId);
      toast.success('Stock movements exported');
    } catch {
      toast.error('Failed to export movements');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="w-7 h-7" title="Stock history">
          <History className="w-3.5 h-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b flex items-center justify-between">
          <h4 className="font-display text-sm tracking-wide">Stock History</h4>
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={handleExport} title="Export CSV">
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : !movements?.length ? (
            <div className="py-6 text-center text-xs text-muted-foreground">No stock changes recorded</div>
          ) : (
            <div className="divide-y">
              {movements.map((m) => {
                const refType = (m as any).reference_type as string | null;

                return (
                  <div key={m.id} className="px-3 py-2 flex items-start gap-2">
                    <div className={cn(
                      'mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                      m.quantity_change > 0 ? 'bg-emerald-100 dark:bg-emerald-950/30' : 'bg-red-100 dark:bg-red-950/30'
                    )}>
                      {m.quantity_change > 0 ? (
                        <ArrowUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            'text-sm tabular-nums font-medium',
                            m.quantity_change > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                          )}>
                            {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                          </span>
                          {refType && REFERENCE_TYPE_LABELS[refType] && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[9px] px-1 py-0 h-4 border-0',
                                REFERENCE_TYPE_STYLES[refType] ?? 'bg-muted text-muted-foreground'
                              )}
                            >
                              {REFERENCE_TYPE_LABELS[refType]}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          → {m.quantity_after}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {REASON_LABELS[m.reason] || m.reason}
                      </div>
                      {m.notes && (
                        <div className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{m.notes}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground/50 mt-0.5">
                        {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
