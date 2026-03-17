import { useState, useMemo } from 'react';
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
import { DollarSign } from 'lucide-react';

const MARKUP_PRESETS = [50, 75, 100];

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
  const [markupPct, setMarkupPct] = useState('');
  const [containerSize, setContainerSize] = useState('');

  const retailPreview = useMemo(() => {
    const wp = parseFloat(wholesalePrice);
    const mp = parseFloat(markupPct);
    if (!isNaN(wp) && wp > 0 && !isNaN(mp) && mp >= 0) {
      return (wp * (1 + mp / 100)).toFixed(2);
    }
    return null;
  }, [wholesalePrice, markupPct]);

  const mutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, any> = { price_updated_at: new Date().toISOString() };
      const wp = wholesalePrice ? parseFloat(wholesalePrice) : null;
      const mp = markupPct ? parseFloat(markupPct) : null;

      if (wp != null) updates.wholesale_price = wp;
      if (mp != null) updates.default_markup_pct = mp;
      if (containerSize.trim()) updates.size_options = [containerSize.trim()];

      // Auto-compute recommended_retail for backward compat
      if (wp != null && mp != null) {
        updates.recommended_retail = Math.round(wp * (1 + mp / 100) * 100) / 100;
      }

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
      setMarkupPct('');
      setContainerSize('');
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
            <Label>Markup %</Label>
            <PlatformInput
              type="number"
              step="1"
              placeholder="0"
              value={markupPct}
              onChange={(e) => setMarkupPct(e.target.value)}
              autoCapitalize="off"
            />
            <div className="flex items-center gap-1.5 pt-1">
              {MARKUP_PRESETS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setMarkupPct(String(pct))}
                  className={`px-2.5 py-1 rounded-full text-xs font-sans transition-colors ${
                    markupPct === String(pct)
                      ? 'bg-[hsl(var(--platform-primary))] text-[hsl(var(--platform-primary-foreground))]'
                      : 'bg-[hsl(var(--platform-muted))] text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))]'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Container Size (optional)</Label>
            <PlatformInput
              placeholder="e.g. 60g, 2oz"
              value={containerSize}
              onChange={(e) => setContainerSize(e.target.value)}
            />
          </div>

          {retailPreview && (
            <div className="text-xs font-sans text-[hsl(var(--platform-foreground-muted))] bg-[hsl(var(--platform-muted)/0.4)] rounded-lg px-3 py-2 space-y-1">
              <div>
                Retail price: <span className="text-[hsl(var(--platform-foreground))] font-medium">${retailPreview}</span>
              </div>
              <div className="text-[10px] text-[hsl(var(--platform-foreground-muted))]">
                Clients are charged this rate per unit for overage beyond the service allowance
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <PlatformButton variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </PlatformButton>
          <PlatformButton
            size="sm"
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={mutation.isPending || (!wholesalePrice && !markupPct && !containerSize)}
          >
            Apply to {productIds.length} Products
          </PlatformButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
