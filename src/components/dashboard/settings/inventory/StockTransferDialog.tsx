import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { tokens } from '@/lib/design-tokens';
import { useCreateStockTransfer } from '@/hooks/useStockTransfers';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useLocations } from '@/hooks/useLocations';
import { useProducts, type Product } from '@/hooks/useProducts';
import { ArrowRight, Loader2 } from 'lucide-react';

interface StockTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedProduct?: Product;
}

export function StockTransferDialog({ open, onOpenChange, preselectedProduct }: StockTransferDialogProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const { data: locations } = useLocations();
  const { data: products } = useProducts({});
  const createTransfer = useCreateStockTransfer();

  const [productId, setProductId] = useState(preselectedProduct?.id || '');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');

  const activeLocations = locations?.filter(l => l.is_active) ?? [];
  const selectedProduct = products?.find(p => p.id === productId);

  const handleSubmit = () => {
    if (!effectiveOrganization?.id || !productId || !fromLocation || !toLocation || !quantity) return;
    createTransfer.mutate({
      organization_id: effectiveOrganization.id,
      product_id: productId,
      from_location_id: fromLocation,
      to_location_id: toLocation,
      quantity: parseInt(quantity),
      notes: notes || undefined,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setProductId('');
        setFromLocation('');
        setToLocation('');
        setQuantity('1');
        setNotes('');
      },
    });
  };

  const canSubmit = productId && fromLocation && toLocation && fromLocation !== toLocation && parseInt(quantity) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-wide">STOCK TRANSFER</DialogTitle>
          <DialogDescription>Move inventory between locations</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!preselectedProduct && (
            <div className="space-y-1.5">
              <Label className="text-xs">Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {(products ?? []).filter(p => (p.quantity_on_hand ?? 0) > 0).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.quantity_on_hand} in stock)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">From Location</Label>
              <Select value={fromLocation} onValueChange={setFromLocation}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground mb-2" />
            <div className="space-y-1.5">
              <Label className="text-xs">To Location</Label>
              <Select value={toLocation} onValueChange={setToLocation}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.filter(l => l.id !== fromLocation).map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Quantity</Label>
            <Input
              type="number"
              min="1"
              max={selectedProduct?.quantity_on_hand ?? 999}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-sm" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} size={tokens.button.card}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createTransfer.isPending} size={tokens.button.card}>
            {createTransfer.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Create Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
