/**
 * ReceiveTab — Shipment receiving workflow.
 * Lists POs that are sent/partially received. Click to open line-by-line receiving.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Truck, CheckCircle2, Package } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { usePurchaseOrders, useMarkPurchaseOrderReceived, type PurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { format } from 'date-fns';

export function ReceiveTab() {
  const { data: sentOrders = [], isLoading } = usePurchaseOrders({ status: 'sent' });
  const markReceived = useMarkPurchaseOrderReceived();
  const { effectiveOrganization } = useOrganizationContext();
  const { formatCurrency } = useFormatCurrency();
  const [receivingPoId, setReceivingPoId] = useState<string | null>(null);
  const [receivedQty, setReceivedQty] = useState<Record<string, number>>({});

  const handleReceive = (po: PurchaseOrder) => {
    const qty = receivedQty[po.id] ?? po.quantity;
    markReceived.mutate({
      poId: po.id,
      productId: po.product_id,
      quantity: qty,
      organizationId: effectiveOrganization?.id || '',
    }, {
      onSuccess: () => {
        setReceivingPoId(null);
        setReceivedQty(prev => { const n = { ...prev }; delete n[po.id]; return n; });
      },
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className={tokens.loading.spinner} /></div>;
  }

  if (sentOrders.length === 0) {
    return (
      <div className={tokens.empty.container}>
        <Truck className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No pending shipments</h3>
        <p className={tokens.empty.description}>Purchase orders marked as "Sent" will appear here for receiving.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className={tokens.body.emphasis}>{sentOrders.length} shipment{sentOrders.length !== 1 ? 's' : ''} awaiting receiving</p>
        <p className={tokens.body.muted}>Click a shipment to receive items and update stock levels.</p>
      </div>

      <div className="space-y-3">
        {sentOrders.map((po) => {
          const isReceiving = receivingPoId === po.id;
          const qty = receivedQty[po.id] ?? po.quantity;

          return (
            <Card key={po.id} className={cn(isReceiving && 'ring-1 ring-primary/30')}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={tokens.card.iconBox}>
                      <Package className={tokens.card.icon} />
                    </div>
                    <div>
                      <CardTitle className={cn(tokens.card.title, 'text-sm')}>
                        PO {po.id.slice(0, 8).toUpperCase()}
                      </CardTitle>
                      <CardDescription>
                        {po.supplier_name || 'Unknown Supplier'} · {po.quantity} units
                        {po.total_cost != null && ` · ${formatCurrency(po.total_cost)}`}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      Sent {po.sent_at ? format(new Date(po.sent_at), 'MMM d') : '—'}
                    </span>
                    {!isReceiving ? (
                      <Button size="sm" variant="outline" onClick={() => setReceivingPoId(po.id)} className={tokens.button.cardAction}>
                        <Truck className="w-4 h-4" /> Receive
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleReceive(po)}
                        disabled={markReceived.isPending}
                        className={tokens.button.cardAction}
                      >
                        {markReceived.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Confirm Receipt
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {isReceiving && (
                <CardContent className="pt-0">
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className={tokens.label.default}>Quantity Received</label>
                        <p className="text-xs text-muted-foreground mb-1.5">Enter actual quantity received (ordered: {po.quantity})</p>
                        <Input
                          type="number"
                          min={0}
                          max={po.quantity}
                          value={qty}
                          onChange={e => setReceivedQty(prev => ({ ...prev, [po.id]: Number(e.target.value) }))}
                          className="w-32"
                        />
                      </div>
                      {qty < po.quantity && (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs">
                          Partial Receive
                        </Badge>
                      )}
                      {qty === po.quantity && (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">
                          Full Receive
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
