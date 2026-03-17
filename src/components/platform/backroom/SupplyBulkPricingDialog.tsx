import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  PlatformDialogContent as DialogContent,
  DialogHeader,
  PlatformDialogTitle as DialogTitle,
  PlatformDialogDescription as DialogDescription,
  DialogFooter,
} from '@/components/platform/ui/PlatformDialog';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformLabel as Label } from '@/components/platform/ui/PlatformLabel';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { toast } from 'sonner';
import { Loader2, DollarSign } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Supply library product IDs to apply pricing to */
  productIds: string[];
  scopeLabel: string;
}

export function SupplyBulkPricingDialog({ open, onOpenChange, productIds, scopeLabel }: Props) {
  const queryClient = useQueryClient();
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [recommendedRetail, setRecommendedRetail] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, any> = { price_updated_at: new Date().toISOString() };
      if (wholesalePrice) updates.wholesale_price = parseFloat(wholesalePrice);
      if (recommendedRetail) updates.recommended_retail = parseFloat(recommendedRetail);

      if (Object.keys(updates).length <= 1) throw new Error('Enter at least one value');

      const { error } = await supabase
        .from('supply_library_products')
        .update(updates)
        .in('id', productIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-library-products'] });
      queryClient.invalidateQueries({ queryKey: ['supply-library-brand-summaries'] });
      toast.success(`Pricing applied to ${productIds.length} products`);
      onOpenChange(false);
      setWholesalePrice('');
      setRecommendedRetail('');
    },
    onError: (err: any) => {
      toast.error('Failed to apply pricing: ' + err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-violet-400" />
              Set Pricing
            </div>
          </DialogTitle>
          <DialogDescription>
            Apply to {productIds.length} product{productIds.length === 1 ? '' : 's'} in {scopeLabel}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Wholesale Price ($)</Label>
            <PlatformInput
              type="number"
              step="0.01"
              placeholder="0.00"
              value={wholesalePrice}
              onChange={(e) => setWholesalePrice(e.target.value)}
              autoCapitalize="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Recommended Retail ($)</Label>
            <PlatformInput
              type="number"
              step="0.01"
              placeholder="0.00"
              value={recommendedRetail}
              onChange={(e) => setRecommendedRetail(e.target.value)}
              autoCapitalize="off"
            />
          </div>
        </div>

        <DialogFooter>
          <PlatformButton variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </PlatformButton>
          <PlatformButton
            size="sm"
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={mutation.isPending || (!wholesalePrice && !recommendedRetail)}
          >
            Apply to {productIds.length} Products
          </PlatformButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
