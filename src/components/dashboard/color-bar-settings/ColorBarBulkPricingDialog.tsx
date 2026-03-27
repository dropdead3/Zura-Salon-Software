import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  /** Product IDs to apply pricing to */
  productIds: string[];
  scopeLabel: string;
}

function UnitInput({
  label,
  unit,
  value,
  onChange,
  readOnly = false,
  placeholder = '0.00',
  step,
}: {
  label: string;
  unit: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-sans text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <input
          type="number"
          step={step ?? '0.01'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          className={
            'flex h-10 w-full rounded-full border border-input bg-background px-4 pr-10 py-2 text-sm font-sans ' +
            'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-foreground/30 transition-colors ' +
            (readOnly ? 'bg-muted/40 text-muted-foreground cursor-default' : '')
          }
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-sans text-muted-foreground select-none">
          {unit}
        </span>
      </div>
    </div>
  );
}

export function BackroomBulkPricingDialog({ open, onOpenChange, orgId, productIds, scopeLabel }: Props) {
  const queryClient = useQueryClient();
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [markupPct, setMarkupPct] = useState('');
  const [containerSize, setContainerSize] = useState('');

  const retailPrice =
    wholesalePrice && markupPct
      ? (parseFloat(wholesalePrice) * (1 + parseFloat(markupPct) / 100)).toFixed(2)
      : '';

  const mutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (wholesalePrice) updates.wholesale_price = parseFloat(wholesalePrice);
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
          <DialogTitle className="font-display text-base tracking-wide">Set Pricing</DialogTitle>
          <DialogDescription className="font-sans text-sm text-muted-foreground">
            {productIds.length} product{productIds.length === 1 ? '' : 's'} in {scopeLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <UnitInput
            label="Wholesale Price"
            unit="$"
            value={wholesalePrice}
            onChange={setWholesalePrice}
            step="0.01"
          />
          <UnitInput
            label="Markup"
            unit="%"
            value={markupPct}
            onChange={setMarkupPct}
            step="1"
            placeholder="0"
          />
          <UnitInput
            label="Retail Price"
            unit="$"
            value={retailPrice}
            readOnly
          />
          <UnitInput
            label="Container Size"
            unit="g"
            value={containerSize}
            onChange={setContainerSize}
            step="1"
            placeholder="0"
          />
        </div>

        <Button
          className="w-full font-sans"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || (!wholesalePrice && !markupPct && !containerSize)}
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}
