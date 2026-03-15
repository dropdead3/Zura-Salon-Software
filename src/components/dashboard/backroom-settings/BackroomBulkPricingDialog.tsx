import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  /** Product IDs to apply pricing to */
  productIds: string[];
  scopeLabel: string; // e.g. "Redken Color" or "lightener"
}

export function BackroomBulkPricingDialog({ open, onOpenChange, orgId, productIds, scopeLabel }: Props) {
  const queryClient = useQueryClient();
  const [costPerGram, setCostPerGram] = useState('');
  const [markupPct, setMarkupPct] = useState('');
  const [containerSize, setContainerSize] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (costPerGram) updates.cost_per_gram = parseFloat(costPerGram);
      if (markupPct) updates.markup_pct = parseFloat(markupPct);
      if (containerSize) updates.container_size = containerSize;

      if (Object.keys(updates).length <= 1) throw new Error('Enter at least one value');

      const { error } = await supabase
        .from('products')
        .update(updates)
        .in('id', productIds)
        .eq('organization_id', orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backroom-product-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['backroom-inventory-table'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Pricing applied to ${productIds.length} products`);
      onOpenChange(false);
      setCostPerGram('');
      setMarkupPct('');
      setContainerSize('');
    },
    onError: (err: any) => {
      toast.error('Failed to apply pricing: ' + err.message);
    },
  });

  const chargePreview = costPerGram && markupPct
    ? (parseFloat(costPerGram) * (1 + parseFloat(markupPct) / 100)).toFixed(4)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-wide">Set Pricing</DialogTitle>
          <DialogDescription className="font-sans text-sm text-muted-foreground">
            Apply to {productIds.length} product{productIds.length === 1 ? '' : 's'} in {scopeLabel}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="font-sans text-xs">Cost per Gram ($)</Label>
            <Input
              type="number"
              step="0.0001"
              placeholder="0.0000"
              value={costPerGram}
              onChange={(e) => setCostPerGram(e.target.value)}
              autoCapitalize="off"
              className="font-sans h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-sans text-xs">Markup %</Label>
            <Input
              type="number"
              step="1"
              placeholder="0"
              value={markupPct}
              onChange={(e) => setMarkupPct(e.target.value)}
              autoCapitalize="off"
              className="font-sans h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-sans text-xs">Container Size (optional)</Label>
            <Input
              placeholder="e.g. 60ml, 2oz"
              value={containerSize}
              onChange={(e) => setContainerSize(e.target.value)}
              className="font-sans h-9"
            />
          </div>

          {chargePreview && (
            <div className="text-xs font-sans text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              Charge per gram: <span className="text-foreground font-medium">${chargePreview}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="font-sans">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || (!costPerGram && !markupPct && !containerSize)}
            className="font-sans"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Apply to {productIds.length} Products
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
