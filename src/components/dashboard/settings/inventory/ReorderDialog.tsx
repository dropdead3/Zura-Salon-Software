import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Loader2, Sparkles, Send, FileText, Truck, Info, AlertTriangle } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useReorderSuggestion } from '@/hooks/useReorderSuggestion';
import { useProductSupplier } from '@/hooks/useProductSuppliers';
import { useCreatePurchaseOrder } from '@/hooks/usePurchaseOrders';
import type { Product } from '@/hooks/useProducts';

interface ReorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  organizationId: string;
  onOpenSupplier: () => void;
}

const confidenceColors: Record<string, string> = {
  high: 'text-emerald-600 border-emerald-300 dark:text-emerald-400',
  medium: 'text-amber-600 border-amber-300 dark:text-amber-400',
  low: 'text-rose-600 border-rose-300 dark:text-rose-400',
};

export function ReorderDialog({ open, onOpenChange, product, organizationId, onOpenSupplier }: ReorderDialogProps) {
  const { data: suggestion, isLoading: sugLoading } = useReorderSuggestion(
    open ? product.id : undefined,
    organizationId,
    open,
  );
  const { data: supplier } = useProductSupplier(open ? product.id : undefined);
  const createPO = useCreatePurchaseOrder();

  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (suggestion?.suggested_quantity) {
      setQuantity(Math.max(1, suggestion.suggested_quantity));
    }
  }, [suggestion]);

  const handleCreate = (sendEmail: boolean) => {
    createPO.mutate({
      organization_id: organizationId,
      product_id: product.id,
      supplier_name: supplier?.supplier_name,
      supplier_email: supplier?.supplier_email ?? undefined,
      quantity,
      unit_cost: product.cost_price ?? undefined,
      notes: notes || undefined,
      send_email: sendEmail,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setNotes('');
      },
    });
  };

  const hasSupplier = !!supplier;
  const canSendEmail = hasSupplier && !!supplier.supplier_email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className={tokens.heading.dialog}>Reorder — {product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Stock Info */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className="text-xs text-muted-foreground mb-0.5">On Hand</div>
              <div className="text-lg tabular-nums font-medium">{product.quantity_on_hand ?? 0}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className="text-xs text-muted-foreground mb-0.5">Min. Stock</div>
              <div className="text-lg tabular-nums font-medium">{product.reorder_level ?? '—'}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className="text-xs text-muted-foreground mb-0.5">Unit Cost</div>
              <div className="text-lg tabular-nums font-medium">{product.cost_price != null ? `$${product.cost_price.toFixed(2)}` : '—'}</div>
            </div>
          </div>

          {/* AI Suggestion */}
          <div className={cn("p-3 rounded-lg border", sugLoading ? "border-border/60" : "border-primary/20 bg-primary/5")}>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">AI Suggestion</span>
              {suggestion && (
                <Badge variant="outline" className={cn("text-[10px]", confidenceColors[suggestion.confidence])}>
                  {suggestion.confidence} confidence
                </Badge>
              )}
            </div>
            {sugLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Analyzing sales data…
              </div>
            ) : suggestion ? (
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="font-medium">Suggested: {suggestion.suggested_quantity} units</span>
                  <span className="text-muted-foreground ml-1.5">({suggestion.total_sold_90d} sold in 90 days, trend: {suggestion.trend})</span>
                </div>
                <p className="text-xs text-muted-foreground">{suggestion.reasoning}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No sales data available for analysis.</p>
            )}
          </div>

          {/* Supplier Info */}
          {hasSupplier ? (
            <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{supplier.supplier_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {supplier.reorder_method === 'email' ? supplier.supplier_email : supplier.reorder_method}
                    {supplier.lead_time_days && ` • ${supplier.lead_time_days} day lead time`}
                  </div>
                </div>
                <Button variant="ghost" size={tokens.button.inline} onClick={onOpenSupplier}>Edit</Button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm">No supplier configured</span>
                </div>
                <Button variant="outline" size={tokens.button.inline} onClick={onOpenSupplier}>Add Supplier</Button>
              </div>
            </div>
          )}

          {/* Quantity & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantity to Order</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
              {product.cost_price != null && (
                <p className="text-xs text-muted-foreground">Total: ${(quantity * product.cost_price).toFixed(2)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional…" rows={2} className="resize-none" />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="outline"
            onClick={() => handleCreate(false)}
            disabled={createPO.isPending}
          >
            {createPO.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
            <FileText className="w-4 h-4 mr-1.5" />
            Save as Draft
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={() => handleCreate(true)}
                    disabled={createPO.isPending || !canSendEmail}
                  >
                    {createPO.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                    <Send className="w-4 h-4 mr-1.5" />
                    Send to Supplier
                  </Button>
                </span>
              </TooltipTrigger>
              {!canSendEmail && (
                <TooltipContent>
                  {!hasSupplier ? 'Add a supplier first' : 'Supplier email required to send'}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
