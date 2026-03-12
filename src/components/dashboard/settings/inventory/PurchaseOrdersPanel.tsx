import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Package, CheckCircle2, Truck } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { usePurchaseOrders, useMarkPurchaseOrderReceived, type PurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useProducts } from '@/hooks/useProducts';
import { format } from 'date-fns';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'text-muted-foreground border-border' },
  sent: { label: 'Sent', className: 'text-blue-600 border-blue-300 dark:text-blue-400' },
  confirmed: { label: 'Confirmed', className: 'text-indigo-600 border-indigo-300 dark:text-indigo-400' },
  received: { label: 'Received', className: 'text-emerald-600 border-emerald-300 dark:text-emerald-400' },
  cancelled: { label: 'Cancelled', className: 'text-rose-600 border-rose-300 dark:text-rose-400' },
};

export function PurchaseOrdersPanel() {
  const { formatCurrency } = useFormatCurrency();
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: orders, isLoading } = usePurchaseOrders({ status: statusFilter });
  const { data: products } = useProducts({});
  const markReceived = useMarkPurchaseOrderReceived();

  const productMap = new Map((products || []).map(p => [p.id, p]));

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{orders?.length || 0} purchase order(s)</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-center w-28">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!orders?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No purchase orders yet
                </TableCell>
              </TableRow>
            ) : orders.map(po => {
              const prod = productMap.get(po.product_id);
              const cfg = statusConfig[po.status] || statusConfig.draft;
              return (
                <TableRow key={po.id}>
                  <TableCell className="font-medium text-sm">{prod?.name || 'Unknown'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{po.supplier_name || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{po.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                    <BlurredAmount>{po.total_cost != null ? formatCurrency(po.total_cost) : '—'}</BlurredAmount>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px]", cfg.className)}>{cfg.label}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(po.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-center">
                    {(po.status === 'sent' || po.status === 'confirmed') && (
                      <Button
                        variant="outline"
                        size={tokens.button.inline}
                        className="gap-1"
                        onClick={() => markReceived.mutate({ poId: po.id, productId: po.product_id, quantity: po.quantity })}
                        disabled={markReceived.isPending}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Received
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
