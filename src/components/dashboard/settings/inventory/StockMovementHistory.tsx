import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { History, Loader2, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useStockMovements } from '@/hooks/useStockMovements';
import { formatDistanceToNow } from 'date-fns';
import { exportStockMovementsCsv } from '@/lib/exportStockMovementsCsv';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

const REASON_LABELS: Record<string, string> = {
  manual_adjust: 'Manual Adjustment',
  po_received: 'PO Received',
  sale: 'Sale',
  return: 'Return',
  correction: 'Correction',
};

interface StockMovementHistoryProps {
  productId: string;
}

export function StockMovementHistory({ productId }: StockMovementHistoryProps) {
  const { data: movements, isLoading } = useStockMovements(productId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="w-7 h-7" title="Stock history">
          <History className="w-3.5 h-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-display text-sm tracking-wide">Stock History</h4>
        </div>
        <div className="max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : !movements?.length ? (
            <div className="py-6 text-center text-xs text-muted-foreground">No stock changes recorded</div>
          ) : (
            <div className="divide-y">
              {movements.map((m) => (
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
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        'text-sm tabular-nums font-medium',
                        m.quantity_change > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      )}>
                        {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                      </span>
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
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
