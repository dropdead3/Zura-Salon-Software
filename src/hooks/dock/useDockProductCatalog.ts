/**
 * useDockProductCatalog — Fetches products from supply_library_products for Dock mixing.
 * Provides brand list, products by brand, and search.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDockDemo } from '@/contexts/DockDemoContext';
import { DEMO_BRANDS, getDemoProductsByBrand, searchDemoProducts } from './dockDemoData';

export interface DockProduct {
  id: string;
  brand: string;
  name: string;
  category: string;
  product_line: string | null;
  swatch_color: string | null;
  wholesale_price: number | null;
  default_unit: string;
}

/** Fetch distinct brands with product counts */
export function useDockBrands() {
  const { isDemoMode } = useDockDemo();
  return useQuery({
    queryKey: ['dock-brands', isDemoMode],
    queryFn: async () => {
      if (isDemoMode) return DEMO_BRANDS;
      const { data, error } = await supabase
        .from('supply_library_products')
        .select('brand')
        .eq('is_active', true);

      if (error) throw error;

      // Count per brand
      const counts = new Map<string, number>();
      for (const row of data || []) {
        counts.set(row.brand, (counts.get(row.brand) || 0) + 1);
      }

      return Array.from(counts.entries())
        .map(([brand, count]) => ({ brand, count }))
        .sort((a, b) => a.brand.localeCompare(b.brand));
    },
    staleTime: 5 * 60_000,
  });
}

/** Fetch products for a specific brand, grouped by category */
export function useDockBrandProducts(brand: string | null) {
  const { isDemoMode } = useDockDemo();
  return useQuery({
    queryKey: ['dock-brand-products', brand, isDemoMode],
    queryFn: async (): Promise<DockProduct[]> => {
      if (isDemoMode) return getDemoProductsByBrand(brand!);
      const { data, error } = await supabase
        .from('supply_library_products')
        .select('id, brand, name, category, product_line, swatch_color, wholesale_price, default_unit')
        .eq('is_active', true)
        .eq('brand', brand!)
        .order('category')
        .order('name');

      if (error) throw error;
      return (data || []) as DockProduct[];
    },
    enabled: !!brand,
    staleTime: 2 * 60_000,
  });
}

/** Search products across all brands */
export function useDockProductSearch(query: string) {
  const { isDemoMode } = useDockDemo();
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['dock-product-search', trimmed, isDemoMode],
    queryFn: async (): Promise<DockProduct[]> => {
      if (isDemoMode) return searchDemoProducts(trimmed);
      const { data, error } = await supabase
        .from('supply_library_products')
        .select('id, brand, name, category, product_line, swatch_color, wholesale_price, default_unit')
        .eq('is_active', true)
        .or(`name.ilike.%${trimmed}%,brand.ilike.%${trimmed}%`)
        .order('brand')
        .order('name')
        .limit(50);

      if (error) throw error;
      return (data || []) as DockProduct[];
    },
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });
}
