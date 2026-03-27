/**
 * QuickReorderButton — One-tap PO creation from supply intelligence insights.
 */

import { useState } from 'react';
import { ShoppingCart, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { useCreatePurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useReorderSuggestion } from '@/hooks/useReorderSuggestion';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

interface QuickReorderButtonProps {
  productId: string;
}

export function QuickReorderButton({ productId }: QuickReorderButtonProps) {
  const [created, setCreated] = useState(false);
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data: suggestion } = useReorderSuggestion(productId, orgId, true);
  const createPO = useCreatePurchaseOrder();

  const handleReorder = async () => {
    if (!orgId) return;

    const qty = suggestion?.suggested_quantity ?? 10;

    createPO.mutate(
      {
        organization_id: orgId,
        product_id: productId,
        quantity: qty,
        notes: `Auto-created from Supply Intelligence. ${suggestion?.reasoning ?? ''}`,
      },
      {
        onSuccess: () => {
          setCreated(true);
          toast.success('Draft purchase order created');
        },
      },
    );
  };

  if (created) {
    return (
      <Button variant="ghost" size={tokens.button.inline} disabled className="text-emerald-600 dark:text-emerald-400">
        <Check className="w-3.5 h-3.5 mr-1" />
        Ordered
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size={tokens.button.inline}
      onClick={handleReorder}
      disabled={createPO.isPending}
      className="font-sans text-xs"
    >
      {createPO.isPending ? (
        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
      ) : (
        <ShoppingCart className="w-3.5 h-3.5 mr-1" />
      )}
      Reorder
    </Button>
  );
}
