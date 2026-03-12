import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Send, Save, AlertTriangle } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { type Product } from '@/hooks/useProducts';
import { type ProductSupplier } from '@/hooks/useProductSuppliers';
import { useBatchCreatePurchaseOrders } from '@/hooks/useBatchReorder';

interface BatchReorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  supplierMap: Map<string, ProductSupplier>;
  organizationId: string;
}

interface ReorderItem {
  product: Product;
  supplier: ProductSupplier | null;
  quantity: number;
  include: boolean;
}

export function BatchReorderDialog({ open, onOpenChange, products, supplierMap, organizationId }: BatchReorderDialogProps) {
  const batchCreate = useBatchCreatePurchaseOrders();

  const initialItems: ReorderItem[] = useMemo(() =>
    products.map(p => {
      const supplier = supplierMap.get(p.id) || null;
      const deficit = Math.max(1, ((p.reorder_level ?? 0) * 2) - (p.quantity_on_hand ?? 0));
      return { product: p, supplier, quantity: deficit, include: true };
    }),
  [products, supplierMap]);

  const [items, setItems] = useState<ReorderItem[]>(initialItems);

  const updateItem = (idx: number, updates: Partial<ReorderItem>) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...updates } : item));
  };

  // Group by supplier
  const grouped = useMemo(() => {
    const groups = new Map<string, { supplier: ProductSupplier | null; items: { item: ReorderItem; idx: number }[] }>();
    items.forEach((item, idx) => {
      const key = item.supplier?.supplier_name || '__unassigned__';
      const group = groups.get(key) || { supplier: item.supplier, items: [] };
      group.items.push({ item, idx });
      groups.set(key, group);
    });
    // Sort: assigned suppliers first, unassigned last
    const entries = Array.from(groups.entries());
    entries.sort((a, b) => {
      if (a[0] === '__unassigned__') return 1;
      if (b[0] === '__unassigned__') return -1;
      return a[0].localeCompare(b[0]);
    });
    return entries;
  }, [items]);

  const includedItems = items.filter(i => i.include);

  const handleSubmit = (sendEmails: boolean) => {
    const poItems = includedItems.map(i => ({
      organization_id: organizationId,
      product_id: i.product.id,
      supplier_name: i.supplier?.supplier_name,
      supplier_email: i.supplier?.supplier_email ?? undefined,
      quantity: i.quantity,
      unit_cost: i.product.cost_price ?? undefined,
    }));

    batchCreate.mutate(
      { items: poItems, sendEmails },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={cn(tokens.heading.cardTitle, 'flex items-center gap-2')}>
            <Package className="w-5 h-5 text-primary" />
            Batch Reorder — {products.length} Product(s)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {grouped.map(([key, group]) => (
            <div key={key} className="border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-muted/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {key === '__unassigned__' ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-sm font-medium text-muted-foreground">No Supplier Assigned</span>
                    </>
                  ) : (
                    <span className="text-sm font-medium">{key}</span>
                  )}
                  <Badge variant="secondary" className="text-[10px]">{group.items.length}</Badge>
                </div>
                {group.supplier?.supplier_email && (
                  <span className="text-xs text-muted-foreground">{group.supplier.supplier_email}</span>
                )}
              </div>
              <div className="divide-y">
                {group.items.map(({ item, idx }) => (
                  <div key={item.product.id} className={cn("flex items-center gap-3 px-3 py-2", !item.include && "opacity-40")}>
                    <input
                      type="checkbox"
                      checked={item.include}
                      onChange={e => updateItem(idx, { include: e.target.checked })}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{item.product.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Stock: {item.product.quantity_on_hand ?? 0} / Min: {item.product.reorder_level ?? '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">Qty:</span>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-20 h-8 text-sm"
                        disabled={!item.include}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <span className="text-xs text-muted-foreground mr-auto">
            {includedItems.length} of {items.length} selected
          </span>
          <Button
            variant="outline"
            size={tokens.button.card}
            className="gap-1.5"
            onClick={() => handleSubmit(false)}
            disabled={includedItems.length === 0 || batchCreate.isPending}
          >
            {batchCreate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All as Drafts
          </Button>
          <Button
            size={tokens.button.card}
            className="gap-1.5"
            onClick={() => handleSubmit(true)}
            disabled={includedItems.length === 0 || batchCreate.isPending}
          >
            {batchCreate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send All to Suppliers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
