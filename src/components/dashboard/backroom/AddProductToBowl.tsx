/**
 * AddProductToBowl — Product search and weight capture for bowl lines.
 * Searches existing product catalog and captures dispensed weight.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ManualWeightInput } from './ManualWeightInput';
import { useStaffPinnedProducts, useTogglePinnedProduct } from '@/hooks/backroom/useStaffPinnedProducts';
import { useProductSubstitutions } from '@/hooks/backroom/useProductSubstitutions';
import { Search, X, Pin, PinOff, AlertTriangle, ArrowRight } from 'lucide-react';

interface AddProductToBowlProps {
  bowlId: string;
  onAdd: (
    productId: string,
    productName: string,
    brand: string | null,
    costPerUnit: number,
    quantity: number,
    unit: string,
    capturedVia: string
  ) => void;
  onCancel: () => void;
  /** When true, renders always-visible search without cancel button */
  inline?: boolean;
}

export function AddProductToBowl({ bowlId, onAdd, onCancel, inline = false }: AddProductToBowlProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
    brand: string | null;
    cost_price: number | null;
  } | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ['backroom-products', orgId, search],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('id, name, brand, cost_price, category')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('name')
        .limit(20);

      if (search) {
        query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  if (selectedProduct) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-sans text-sm font-medium">{selectedProduct.name}</p>
            {selectedProduct.brand && (
              <p className="font-sans text-xs text-muted-foreground">{selectedProduct.brand}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedProduct(null)}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        <ManualWeightInput
          onSubmit={(weight, unit) => {
            onAdd(
              selectedProduct.id,
              selectedProduct.name,
              selectedProduct.brand,
              selectedProduct.cost_price ?? 0,
              weight,
              unit,
              'manual'
            );
            // In inline mode, auto-clear for next product
            if (inline) {
              setSelectedProduct(null);
              setSearch('');
            }
          }}
          label="Dispensed amount"
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-8 h-10 font-sans text-sm"
            autoFocus
          />
        </div>
        {!inline && (
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="max-h-[200px]">
        <div className="space-y-0.5">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors text-left min-h-[44px]"
            >
              <div>
                <p className="font-sans text-sm">{product.name}</p>
                {product.brand && (
                  <p className="font-sans text-xs text-muted-foreground">{product.brand}</p>
                )}
              </div>
              {product.cost_price != null && (
                <span className="font-sans text-xs text-muted-foreground shrink-0">
                  ${product.cost_price.toFixed(2)}/unit
                </span>
              )}
            </button>
          ))}
          {products.length === 0 && (
            <p className="font-sans text-xs text-muted-foreground text-center py-3">
              No products found
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
