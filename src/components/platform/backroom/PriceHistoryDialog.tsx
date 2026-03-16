import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlatformBadge as Badge } from '@/components/platform/ui/PlatformBadge';
import { PlatformTable as Table, PlatformTableBody as TableBody, PlatformTableCell as TableCell, PlatformTableHead as TableHead, PlatformTableHeader as TableHeader, PlatformTableRow as TableRow } from '@/components/platform/ui/PlatformTable';
import { Loader2, History } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { PriceQueueStatus } from '@/hooks/platform/useWholesalePriceQueue';

interface PriceHistoryDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productName: string;
  brand: string;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    approved: { label: 'Approved', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    rejected: { label: 'Rejected', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    auto_applied: { label: 'Auto-Applied', className: 'bg-primary/10 text-primary border-primary/20' },
  };
  const cfg = map[status] || { label: status, className: '' };
  return <Badge variant="outline" className={cn('font-sans text-xs', cfg.className)}>{cfg.label}</Badge>;
}

export function PriceHistoryDialog({ open, onOpenChange, productName, brand }: PriceHistoryDialogProps) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['price-history', productName, brand],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wholesale_price_queue')
        .select('*')
        .eq('product_name', productName)
        .eq('brand', brand)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-sans text-base flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Price History — {productName}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className={tokens.loading.spinner} />
            </div>
          ) : history.length === 0 ? (
            <div className={cn(tokens.empty.container, 'py-12')}>
              <History className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No history found</h3>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tokens.table.columnHeader}>Date</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Price</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Previous</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Δ%</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Status</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h: any) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-sans text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-sans text-sm tabular-nums">${Number(h.wholesale_price).toFixed(2)}</TableCell>
                    <TableCell className="font-sans text-sm tabular-nums text-muted-foreground">
                      {h.previous_price != null ? `$${Number(h.previous_price).toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell className="font-sans text-sm tabular-nums">
                      {h.price_delta_pct != null ? (
                        <span className={h.price_delta_pct > 0 ? 'text-destructive' : 'text-emerald-600'}>
                          {h.price_delta_pct > 0 ? '+' : ''}{Number(h.price_delta_pct).toFixed(1)}%
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>{statusBadge(h.status)}</TableCell>
                    <TableCell className="font-sans text-xs text-muted-foreground max-w-[150px] truncate">
                      {h.notes || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
