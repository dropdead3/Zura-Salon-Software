import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Send, Save } from 'lucide-react';
import { useBatchCreatePurchaseOrders } from '@/hooks/useBatchReorder';
import type { BackroomInventoryRow } from '@/hooks/backroom/useBackroomInventoryTable';

interface BackroomBulkReorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  reorderItems: BackroomInventoryRow[];
}

interface ReorderLine {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  currentStock: number;
  parLevel: number | null;
  orderQty: number;
  unitCost: number | null;
  supplierName: string | null;
  supplierEmail: string | null;
  included: boolean;
}

export function BackroomBulkReorderDialog({ open, onOpenChange, orgId, reorderItems }: BackroomBulkReorderDialogProps) {
  const batchMutation = useBatchCreatePurchaseOrders();

  const [lines, setLines] = useState<ReorderLine[]>(() =>
    reorderItems.map((item) => ({
      id: item.id,
      name: item.name,
      brand: item.brand,
      category: item.category,
      currentStock: item.quantity_on_hand,
      parLevel: item.par_level,
      orderQty: item.order_qty > 0 ? item.order_qty : 1,
      unitCost: item.cost_per_gram,
      supplierName: null,
      supplierEmail: null,
      included: true,
    }))
  );

  // Reset lines when items change
  useMemo(() => {
    setLines(
      reorderItems.map((item) => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        category: item.category,
        currentStock: item.quantity_on_hand,
        parLevel: item.par_level,
      orderQty: item.order_qty > 0 ? item.order_qty : 1,
      unitCost: item.cost_per_gram,
      supplierName: null,
      supplierEmail: null,
        included: true,
      }))
    );
  }, [reorderItems]);

  const includedLines = lines.filter((l) => l.included);
  const totalItems = includedLines.length;
  const totalCost = includedLines.reduce((sum, l) => sum + (l.unitCost ? l.unitCost * l.orderQty : 0), 0);

  const toggleLine = (id: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, included: !l.included } : l)));
  };

  const updateQty = (id: string, qty: number) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, orderQty: Math.max(1, qty) } : l)));
  };

  const handleSubmit = (sendEmails: boolean) => {
    const items = includedLines.map((l) => ({
      organization_id: orgId,
      product_id: l.id,
      supplier_name: l.supplierName || undefined,
      supplier_email: l.supplierEmail || undefined,
      quantity: l.orderQty,
      unit_cost: l.unitCost || undefined,
      notes: `Bulk reorder: stock=${l.currentStock}, par=${l.parLevel}`,
    }));

    batchMutation.mutate(
      { items, sendEmails },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className={tokens.card.title}>Bulk Reorder</DialogTitle>
          <p className="text-sm font-sans text-muted-foreground mt-1">
            Create purchase orders for {reorderItems.length} product{reorderItems.length === 1 ? '' : 's'} needing replenishment.
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2">
            {lines.map((line) => (
              <div
                key={line.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                  line.included ? 'border-border/60 bg-card' : 'border-border/30 bg-muted/20 opacity-60'
                )}
              >
                <Checkbox
                  checked={line.included}
                  onCheckedChange={() => toggleLine(line.id)}
                  className="shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-sans text-foreground truncate">
                    {line.brand && <span className="text-muted-foreground">{line.brand} — </span>}
                    {line.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {line.category && (
                      <Badge variant="outline" className="text-[10px] capitalize">{line.category}</Badge>
                    )}
                    <span className="text-[11px] font-sans text-muted-foreground">
                      Stock: {line.currentStock} → Par: {line.parLevel ?? '—'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    type="number"
                    min={1}
                    value={line.orderQty}
                    onChange={(e) => updateQty(line.id, parseInt(e.target.value) || 1)}
                    className="w-16 h-8 text-sm text-center font-sans"
                    disabled={!line.included}
                  />
                  {line.unitCost != null && (
                    <span className="text-xs font-sans text-muted-foreground tabular-nums w-16 text-right">
                      ${(line.unitCost * line.orderQty).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Summary */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          <div className="text-sm font-sans text-muted-foreground">
            {totalItems} item{totalItems === 1 ? '' : 's'} selected
            {totalCost > 0 && (
              <span className="ml-2 text-foreground tabular-nums">${totalCost.toFixed(2)} est.</span>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={totalItems === 0 || batchMutation.isPending}
            className="font-sans gap-1.5"
          >
            {batchMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save as Drafts
          </Button>
          <Button
            onClick={() => handleSubmit(true)}
            disabled={totalItems === 0 || batchMutation.isPending}
            className="font-sans gap-1.5"
          >
            {batchMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send to Suppliers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
