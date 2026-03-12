import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { usePurchaseOrders, useUpdatePurchaseOrder } from '@/hooks/usePurchaseOrders';
import { ClipboardCheck, Check, X, ShoppingCart, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export function ReorderApprovalCard() {
  const { data: allPOs, isLoading } = usePurchaseOrders({ status: 'draft' });
  const updatePO = useUpdatePurchaseOrder();
  const { formatCurrency } = useFormatCurrency();

  const draftPOs = allPOs?.filter(po => po.status === 'draft') ?? [];

  const handleApprove = (poId: string) => {
    updatePO.mutate({ id: poId, updates: { status: 'sent', sent_at: new Date().toISOString() } }, {
      onSuccess: () => toast.success('PO approved and marked as sent'),
    });
  };

  const handleReject = (poId: string) => {
    updatePO.mutate({ id: poId, updates: { status: 'cancelled' } }, {
      onSuccess: () => toast.success('PO rejected'),
    });
  };

  if (isLoading) return null;
  if (draftPOs.length === 0) return null;

  const totalValue = draftPOs.reduce((s, po) => s + (po.total_cost ?? 0), 0);

  return (
    <PinnableCard elementKey="retail_reorder_approval" elementName="Reorder Approval Queue" category="Analytics Hub - Retail">
      <Card className="border-blue-200/50 dark:border-blue-800/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 flex items-center justify-center rounded-lg">
                <ClipboardCheck className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className={tokens.card.title}>REORDER APPROVAL QUEUE</CardTitle>
                  <MetricInfoTooltip description="Draft purchase orders from auto-reorder that need your approval before being sent to suppliers." />
                </div>
                <CardDescription className="text-xs">
                  {draftPOs.length} pending · <BlurredAmount>{formatCurrency(totalValue)}</BlurredAmount> total
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
              <ShoppingCart className="w-3 h-3 mr-1" />
              {draftPOs.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {draftPOs.slice(0, 6).map(po => (
              <div key={po.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{po.supplier_name || 'Unknown Supplier'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {po.quantity} units
                    </span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      <BlurredAmount>{formatCurrency(po.total_cost ?? 0)}</BlurredAmount>
                    </span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(po.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                    onClick={() => handleApprove(po.id)}
                    disabled={updatePO.isPending}
                    title="Approve & send"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={() => handleReject(po.id)}
                    disabled={updatePO.isPending}
                    title="Reject"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {draftPOs.length > 6 && (
              <p className="text-xs text-muted-foreground text-center py-1">
                +{draftPOs.length - 6} more pending
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </PinnableCard>
  );
}
