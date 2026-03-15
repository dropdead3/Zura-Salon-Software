import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle2, Truck } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { usePurchaseOrders, useMarkPurchaseOrderReceived, type PurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useProducts } from '@/hooks/useProducts';
import { format } from 'date-fns';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { PurchaseOrderDetailDialog } from './PurchaseOrderDetailDialog';

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
  const [groupBySupplier, setGroupBySupplier] = useState(false);
  const { data: orders, isLoading } = usePurchaseOrders({ status: statusFilter });
  const { data: products } = useProducts({});
  const markReceived = useMarkPurchaseOrderReceived();

  const productMap = new Map((products || []).map(p => [p.id, p]));

  // Group orders by supplier when toggle is on
  const groupedOrders = useMemo(() => {
    if (!groupBySupplier || !orders) return null;
    const groups = new Map<string, PurchaseOrder[]>();
    for (const po of orders) {
      const key = po.supplier_name || 'No Supplier';
      const list = groups.get(key) || [];
      list.push(po);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === 'No Supplier') return 1;
      if (b[0] === 'No Supplier') return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [orders, groupBySupplier]);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  const renderRow = (po: PurchaseOrder) => {
    const prod = productMap.get(po.product_id);
    const cfg = statusConfig[po.status] || statusConfig.draft;
    return (
      <TableRow key={po.id}>
        <TableCell className="font-medium text-sm">{prod?.name || 'Unknown'}</TableCell>
        {!groupBySupplier && (
          <TableCell className="text-sm text-muted-foreground">{po.supplier_name || '—'}</TableCell>
        )}
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
              onClick={() => markReceived.mutate({ poId: po.id, productId: po.product_id, quantity: po.quantity, organizationId: po.organization_id })}
              disabled={markReceived.isPending}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Received
            </Button>
          )}
        </TableCell>
      </TableRow>
    );
  };

  const colCount = groupBySupplier ? 6 : 7;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{orders?.length || 0} purchase order(s)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={groupBySupplier} onCheckedChange={setGroupBySupplier} id="group-supplier" />
            <Label htmlFor="group-supplier" className="text-xs cursor-pointer">Group by Supplier</Label>
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
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              {!groupBySupplier && <TableHead>Supplier</TableHead>}
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
                <TableCell colSpan={colCount} className="text-center py-8 text-muted-foreground">
                  No purchase orders yet
                </TableCell>
              </TableRow>
            ) : groupBySupplier && groupedOrders ? (
              groupedOrders.map(([supplierName, supplierPOs]) => {
                const subtotal = supplierPOs.reduce((sum, po) => sum + (po.total_cost ?? 0), 0);
                const totalQty = supplierPOs.reduce((sum, po) => sum + po.quantity, 0);
                return (
                  <>
                    <TableRow key={`header-${supplierName}`} className="bg-muted/40">
                      <TableCell colSpan={colCount} className="py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{supplierName}</span>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{supplierPOs.length} order(s)</span>
                            <span>Qty: {totalQty}</span>
                            {subtotal > 0 && <span><BlurredAmount>{formatCurrency(subtotal)}</BlurredAmount></span>}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                    {supplierPOs.map(renderRow)}
                  </>
                );
              })
            ) : (
              orders.map(renderRow)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
