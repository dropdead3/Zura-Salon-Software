import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Download, Loader2 } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { format } from 'date-fns';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { usePurchaseOrderLines, type PurchaseOrderLine } from '@/hooks/inventory/usePurchaseOrderLines';
import { useProducts, type Product } from '@/hooks/useProducts';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'text-muted-foreground border-border' },
  sent: { label: 'Sent', className: 'text-blue-600 border-blue-300 dark:text-blue-400' },
  confirmed: { label: 'Confirmed', className: 'text-indigo-600 border-indigo-300 dark:text-indigo-400' },
  received: { label: 'Received', className: 'text-emerald-600 border-emerald-300 dark:text-emerald-400' },
  cancelled: { label: 'Cancelled', className: 'text-rose-600 border-rose-300 dark:text-rose-400' },
};

interface PurchaseOrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PurchaseOrder;
}

export function PurchaseOrderDetailDialog({ open, onOpenChange, order }: PurchaseOrderDetailDialogProps) {
  const { formatCurrency } = useFormatCurrency();
  const { data: lines, isLoading: linesLoading } = usePurchaseOrderLines(order.id);
  const { data: products } = useProducts({});

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products || []) map.set(p.id, p);
    return map;
  }, [products]);

  // For legacy single-product POs, synthesize a line item
  const displayLines = useMemo(() => {
    if (lines && lines.length > 0) return lines;
    // Fallback: show single product from PO header
    if (order.product_id) {
      return [{
        id: order.id,
        purchase_order_id: order.id,
        product_id: order.product_id,
        vendor_product_id: null,
        quantity_ordered: order.quantity,
        quantity_received: order.status === 'received' ? order.quantity : 0,
        unit_cost: order.unit_cost,
        line_total: order.total_cost,
        notes: null,
        created_at: order.created_at,
      }] as PurchaseOrderLine[];
    }
    return [];
  }, [lines, order]);

  const { itemCount, subtotal } = useMemo(() => {
    let count = 0;
    let total = 0;
    for (const line of displayLines) {
      count += line.quantity_ordered;
      total += line.line_total ?? 0;
    }
    return { itemCount: count, subtotal: total };
  }, [displayLines]);

  const cfg = statusConfig[order.status] || statusConfig.draft;

  const exportCsv = () => {
    const headers = ['Product', 'Brand', 'Category', 'Container Size', 'Qty Ordered', 'Qty Received', 'Unit Cost', 'Line Total'];
    const rows = displayLines.map(line => {
      const prod = productMap.get(line.product_id);
      return [
        `"${(prod?.name || 'Unknown').replace(/"/g, '""')}"`,
        `"${(prod?.brand || '').replace(/"/g, '""')}"`,
        `"${(prod?.category || '').replace(/"/g, '""')}"`,
        `"${(prod?.container_size || '').replace(/"/g, '""')}"`,
        line.quantity_ordered,
        line.quantity_received,
        line.unit_cost ?? '',
        line.line_total ?? '',
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PO_${(order as any).po_number || order.id.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className={cn(tokens.card.title, 'text-base')}>
              Order Summary
            </DialogTitle>
            <Badge variant="outline" className={cn('text-[10px]', cfg.className)}>{cfg.label}</Badge>
          </div>
        </DialogHeader>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm border-b border-border pb-4">
          <div>
            <span className="text-muted-foreground text-xs">Created</span>
            <p>{format(new Date(order.created_at), 'MMM d, yyyy')}</p>
          </div>
          {order.sent_at && (
            <div>
              <span className="text-muted-foreground text-xs">Submitted</span>
              <p>{format(new Date(order.sent_at), 'MMM d, yyyy')}</p>
            </div>
          )}
          {order.received_at && (
            <div>
              <span className="text-muted-foreground text-xs">Received</span>
              <p>{format(new Date(order.received_at), 'MMM d, yyyy')}</p>
            </div>
          )}
          {order.expected_delivery_date && (
            <div>
              <span className="text-muted-foreground text-xs">Expected Delivery</span>
              <p>{format(new Date(order.expected_delivery_date), 'MMM d, yyyy')}</p>
            </div>
          )}
          {order.supplier_name && (
            <div>
              <span className="text-muted-foreground text-xs">Supplier</span>
              <p>{order.supplier_name}</p>
            </div>
          )}
          {(order as any).po_number && (
            <div>
              <span className="text-muted-foreground text-xs">PO Number</span>
              <p className="font-mono text-xs">{(order as any).po_number}</p>
            </div>
          )}
        </div>

        {/* Line Items */}
        {linesLoading ? (
          <DashboardLoader size="sm" className="py-8" />
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tokens.table.columnHeader}>Product</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Brand</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Size</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Ordered</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Received</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Unit Cost</TableHead>
                  <TableHead className={cn(tokens.table.columnHeader, 'text-right')}>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayLines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No line items</TableCell>
                  </TableRow>
                ) : displayLines.map(line => {
                  const prod = productMap.get(line.product_id);
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="text-sm font-medium">{prod?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{prod?.brand || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{prod?.container_size || '—'}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{line.quantity_ordered}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {line.quantity_received}
                        {line.quantity_received < line.quantity_ordered && (
                          <span className="text-amber-600 dark:text-amber-400 ml-1 text-xs">
                            ({line.quantity_ordered - line.quantity_received} pending)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                        <BlurredAmount>{line.unit_cost != null ? formatCurrency(line.unit_cost) : '—'}</BlurredAmount>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        <BlurredAmount>{line.line_total != null ? formatCurrency(line.line_total) : '—'}</BlurredAmount>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-sm text-muted-foreground">
            {displayLines.length} item{displayLines.length !== 1 ? 's' : ''} · {itemCount} unit{itemCount !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium tabular-nums">
              Subtotal: <BlurredAmount>{formatCurrency(subtotal)}</BlurredAmount>
            </div>
            <Button variant="outline" size={tokens.button.card} className="gap-1.5" onClick={exportCsv}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
