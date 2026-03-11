import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BrandSummary {
  brand: string;
  productCount: number;
  totalInventoryValue: number;
  totalStock: number;
}

export interface CategorySummary {
  category: string;
  productCount: number;
  totalInventoryValue: number;
  totalStock: number;
  typeCounts: Record<string, number>;
}

export function useProductBrands() {
  return useQuery({
    queryKey: ['product-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('brand, retail_price, quantity_on_hand')
        .eq('is_active', true);

      if (error) throw error;

      const brandMap = new Map<string, BrandSummary>();
      (data || []).forEach((p: any) => {
        const brand = p.brand || 'Uncategorized';
        if (!brandMap.has(brand)) {
          brandMap.set(brand, { brand, productCount: 0, totalInventoryValue: 0, totalStock: 0 });
        }
        const b = brandMap.get(brand)!;
        b.productCount++;
        b.totalStock += p.quantity_on_hand || 0;
        b.totalInventoryValue += (p.retail_price || 0) * (p.quantity_on_hand || 0);
      });

      return Array.from(brandMap.values()).sort((a, b) => b.productCount - a.productCount);
    },
  });
}

export function useProductCategorySummaries() {
  return useQuery({
    queryKey: ['product-category-summaries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category, retail_price, quantity_on_hand')
        .eq('is_active', true);

      if (error) throw error;

      const catMap = new Map<string, CategorySummary>();
      (data || []).forEach((p: any) => {
        const category = p.category || 'Uncategorized';
        if (!catMap.has(category)) {
          catMap.set(category, { category, productCount: 0, totalInventoryValue: 0, totalStock: 0 });
        }
        const c = catMap.get(category)!;
        c.productCount++;
        c.totalStock += p.quantity_on_hand || 0;
        c.totalInventoryValue += (p.retail_price || 0) * (p.quantity_on_hand || 0);
      });

      return Array.from(catMap.values()).sort((a, b) => b.productCount - a.productCount);
    },
  });
}
