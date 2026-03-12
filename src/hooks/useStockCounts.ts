import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface StockCount {
  id: string;
  organization_id: string;
  location_id: string | null;
  product_id: string;
  counted_quantity: number;
  expected_quantity: number;
  variance: number;
  counted_by: string | null;
  counted_at: string;
  notes: string | null;
  created_at: string;
}

export interface ShrinkageSummary {
  productId: string;
  productName: string;
  category: string | null;
  lastCountedAt: string;
  expectedQty: number;
  countedQty: number;
  variance: number;
  shrinkageUnits: number;
  shrinkageCost: number;
  costPrice: number;
}

export function useStockCounts(productId?: string, locationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['stock-counts', orgId, productId, locationId],
    queryFn: async () => {
      let query = supabase
        .from('stock_counts')
        .select('*')
        .eq('organization_id', orgId!)
        .order('counted_at', { ascending: false })
        .limit(100);

      if (productId) query = query.eq('product_id', productId);
      if (locationId && locationId !== 'all') query = query.eq('location_id', locationId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as StockCount[];
    },
    enabled: !!orgId,
  });
}

export function useCreateStockCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      product_id: string;
      counted_quantity: number;
      expected_quantity: number;
      location_id?: string;
      notes?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data, error } = await supabase
        .from('stock_counts')
        .insert({
          organization_id: params.organization_id,
          product_id: params.product_id,
          counted_quantity: params.counted_quantity,
          expected_quantity: params.expected_quantity,
          location_id: params.location_id || null,
          counted_by: userId,
          notes: params.notes || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-counts'] });
      toast.success('Stock count recorded');
    },
    onError: (error) => {
      toast.error('Failed to record stock count: ' + error.message);
    },
  });
}

/**
 * Compute shrinkage summaries from the most recent stock count per product.
 * Shrinkage = expected - counted (positive = loss).
 */
export function useShrinkageSummary(locationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['shrinkage-summary', orgId, locationId],
    queryFn: async () => {
      // Get all stock counts for the org
      let countQuery = supabase
        .from('stock_counts')
        .select('*')
        .eq('organization_id', orgId!)
        .order('counted_at', { ascending: false });

      if (locationId && locationId !== 'all') {
        countQuery = countQuery.eq('location_id', locationId);
      }

      const { data: counts, error: countError } = await countQuery;
      if (countError) throw countError;

      if (!counts || counts.length === 0) return [];

      // Get the most recent count per product
      const latestByProduct = new Map<string, any>();
      for (const c of counts) {
        if (!latestByProduct.has(c.product_id)) {
          latestByProduct.set(c.product_id, c);
        }
      }

      // Get product details
      const productIds = Array.from(latestByProduct.keys());
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, name, category, cost_price')
        .in('id', productIds);

      if (prodError) throw prodError;

      const productMap = new Map((products || []).map(p => [p.id, p]));

      const summaries: ShrinkageSummary[] = [];
      for (const [productId, count] of latestByProduct) {
        const product = productMap.get(productId);
        if (!product) continue;

        const variance = count.counted_quantity - count.expected_quantity;
        // Only include products with negative variance (shrinkage)
        if (variance >= 0) continue;

        const shrinkageUnits = Math.abs(variance);
        summaries.push({
          productId,
          productName: product.name,
          category: product.category,
          lastCountedAt: count.counted_at,
          expectedQty: count.expected_quantity,
          countedQty: count.counted_quantity,
          variance,
          shrinkageUnits,
          shrinkageCost: shrinkageUnits * (product.cost_price || 0),
          costPrice: product.cost_price || 0,
        });
      }

      return summaries.sort((a, b) => b.shrinkageCost - a.shrinkageCost);
    },
    enabled: !!orgId,
  });
}
