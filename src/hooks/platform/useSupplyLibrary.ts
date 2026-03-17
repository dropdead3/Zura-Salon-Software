/**
 * useSupplyLibrary — Fetches the supply library from the database.
 * Falls back to the static data file if the DB table is empty (pre-initialization).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SUPPLY_LIBRARY, getSupplyBrands, getProductsByBrand, type SupplyLibraryItem } from '@/data/professional-supply-library';
import { toast } from 'sonner';

export interface SupplyLibraryProduct {
  id: string;
  brand: string;
  name: string;
  category: string;
  default_depletion: string;
  default_unit: string;
  size_options: string[];
  is_active: boolean;
  wholesale_price: number | null;
  recommended_retail: number | null;
  currency: string;
  price_source_id: string | null;
  price_updated_at: string | null;
  product_line: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch all supply library products from the DB */
export function useSupplyLibraryProducts(options?: { brand?: string; search?: string }) {
  return useQuery({
    queryKey: ['supply-library-products', options?.brand, options?.search],
    queryFn: async (): Promise<SupplyLibraryProduct[]> => {
      let query = supabase
        .from('supply_library_products')
        .select('*')
        .eq('is_active', true)
        .order('brand')
        .order('name');

      if (options?.brand) {
        query = query.eq('brand', options.brand);
      }
      if (options?.search) {
        query = query.or(`name.ilike.%${options.search}%,brand.ilike.%${options.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SupplyLibraryProduct[];
    },
    staleTime: 60_000,
  });
}

/** Get unique brands from the DB */
export function useSupplyLibraryBrands() {
  return useQuery({
    queryKey: ['supply-library-brands'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('supply_library_products')
        .select('brand')
        .eq('is_active', true)
        .order('brand');

      if (error) throw error;
      if (!data || data.length === 0) {
        // Fallback to static data if DB is empty
        return getSupplyBrands();
      }
      return [...new Set((data as any[]).map((d) => d.brand))];
    },
    staleTime: 120_000,
  });
}

/** Check if the supply library DB has been initialized */
export function useSupplyLibraryInitStatus() {
  return useQuery({
    queryKey: ['supply-library-init-status'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('supply_library_products')
        .select('id', { count: 'exact', head: true });

      if (error) throw error;
      return { isInitialized: (count || 0) > 0, count: count || 0 };
    },
    staleTime: 30_000,
  });
}

/** Seed the supply library DB from the static data file */
export function useSeedSupplyLibrary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Insert in batches of 200 to avoid payload limits
      const BATCH_SIZE = 200;
      let inserted = 0;

      for (let i = 0; i < SUPPLY_LIBRARY.length; i += BATCH_SIZE) {
      const batch = SUPPLY_LIBRARY.slice(i, i + BATCH_SIZE).map((item) => {
          const { extractProductLine } = require('@/lib/supply-line-parser');
          return {
            brand: item.brand,
            name: item.name,
            category: item.category,
            default_depletion: item.defaultDepletion,
            default_unit: item.defaultUnit,
            size_options: item.sizeOptions || [],
            product_line: extractProductLine(item.name),
            is_active: true,
          };
        });

        const { error } = await supabase
          .from('supply_library_products')
          .insert(batch);

        if (error) throw error;
        inserted += batch.length;
      }

      return { inserted };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['supply-library-products'] });
      queryClient.invalidateQueries({ queryKey: ['supply-library-brands'] });
      queryClient.invalidateQueries({ queryKey: ['supply-library-init-status'] });
      toast.success(`Initialized supply library with ${result.inserted} products`);
    },
    onError: (error) => {
      toast.error('Failed to initialize supply library: ' + error.message);
    },
  });
}

/**
 * For consumers that need the SupplyLibraryItem interface (e.g. SupplyLibraryDialog).
 * Reads from DB if initialized, otherwise falls back to static data.
 */
export function useSupplyLibraryItems() {
  return useQuery({
    queryKey: ['supply-library-items'],
    queryFn: async (): Promise<SupplyLibraryItem[]> => {
      const { data, error } = await supabase
        .from('supply_library_products')
        .select('*')
        .eq('is_active', true)
        .order('brand')
        .order('name');

      if (error) throw error;

      // If DB has data, map to SupplyLibraryItem interface
      if (data && data.length > 0) {
        return (data as any[]).map((p) => ({
          brand: p.brand,
          name: p.name,
          category: p.category as SupplyLibraryItem['category'],
          defaultDepletion: p.default_depletion as SupplyLibraryItem['defaultDepletion'],
          defaultUnit: p.default_unit as SupplyLibraryItem['defaultUnit'],
          sizeOptions: p.size_options || [],
        }));
      }

      // Fallback to static data
      return SUPPLY_LIBRARY;
    },
    staleTime: 120_000,
  });
}
