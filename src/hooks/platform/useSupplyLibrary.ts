/**
 * useSupplyLibrary — Fetches the supply library from the database.
 * Falls back to the static data file if the DB table is empty (pre-initialization).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SUPPLY_LIBRARY, getSupplyBrands, getProductsByBrand, type SupplyLibraryItem } from '@/data/professional-supply-library';
import { extractProductLine } from '@/lib/supply-line-parser';
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
  default_markup_pct: number | null;
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
        .order('brand')
        .limit(10000);

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
      // Fetch existing (brand, name) pairs to skip duplicates
      const { data: existing, error: fetchErr } = await supabase
        .from('supply_library_products')
        .select('brand, name')
        .eq('is_active', true);
      if (fetchErr) throw fetchErr;

      const existingSet = new Set(
        (existing || []).map((p: any) => `${p.brand}::${p.name}`.toLowerCase())
      );

      const newItems = SUPPLY_LIBRARY.filter(
        (item) => !existingSet.has(`${item.brand}::${item.name}`.toLowerCase())
      );

      // Insert in batches of 200 to avoid payload limits
      const BATCH_SIZE = 200;
      let inserted = 0;

      for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
        const batch = newItems.slice(i, i + BATCH_SIZE).map((item) => ({
          brand: item.brand,
          name: item.name,
          category: item.category,
          default_depletion: item.defaultDepletion,
          default_unit: item.defaultUnit,
          size_options: item.sizeOptions || [],
          product_line: extractProductLine(item.name),
          is_active: true,
        }));

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

/** Sync the supply library DB with the static data file (insert missing + backfill product_line) */
export function useSyncSupplyLibrary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // 1. Fetch existing (brand, name) pairs from DB
      const { data: existing, error: fetchErr } = await supabase
        .from('supply_library_products')
        .select('id, brand, name, product_line')
        .eq('is_active', true);

      if (fetchErr) throw fetchErr;

      const existingSet = new Set(
        (existing || []).map((p: any) => `${p.brand}::${p.name}`.toLowerCase())
      );

      // 2. Diff against static library — find missing products (case-insensitive)
      const missing = SUPPLY_LIBRARY.filter(
        (item) => !existingSet.has(`${item.brand}::${item.name}`.toLowerCase())
      );

      // 3. Insert missing in batches
      let inserted = 0;
      const BATCH_SIZE = 200;
      for (let i = 0; i < missing.length; i += BATCH_SIZE) {
        const batch = missing.slice(i, i + BATCH_SIZE).map((item) => ({
          brand: item.brand,
          name: item.name,
          category: item.category,
          default_depletion: item.defaultDepletion,
          default_unit: item.defaultUnit,
          size_options: item.sizeOptions || [],
          product_line: extractProductLine(item.name),
          is_active: true,
        }));
        const { error } = await supabase
          .from('supply_library_products')
          .insert(batch);
        if (error) throw error;
        inserted += batch.length;
      }

      // 4. Backfill product_line on existing rows where it's NULL
      const needsBackfill = (existing || []).filter((p: any) => p.product_line == null);
      let backfilled = 0;
      for (const row of needsBackfill) {
        const pl = extractProductLine(row.name);
        const { error } = await supabase
          .from('supply_library_products')
          .update({ product_line: pl } as any)
          .eq('id', row.id);
        if (error) throw error;
        backfilled++;
      }

      return { inserted, backfilled };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['supply-library-products'] });
      queryClient.invalidateQueries({ queryKey: ['supply-library-brands'] });
      queryClient.invalidateQueries({ queryKey: ['supply-library-init-status'] });
      const parts: string[] = [];
      if (result.inserted > 0) parts.push(`${result.inserted} new products added`);
      if (result.backfilled > 0) parts.push(`${result.backfilled} product lines backfilled`);
      if (parts.length === 0) parts.push('Library is already up to date');
      toast.success(parts.join(', '));
    },
    onError: (error) => {
      toast.error('Sync failed: ' + error.message);
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
        .order('name')
        .range(0, 4999);

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

/** Fetch supply library items for a single brand (avoids row-limit issues) */
export function useSupplyLibraryItemsByBrand(brand: string | null) {
  return useQuery({
    queryKey: ['supply-library-items-brand', brand],
    queryFn: async (): Promise<SupplyLibraryItem[]> => {
      if (!brand) return [];
      const { data, error } = await supabase
        .from('supply_library_products')
        .select('*')
        .eq('is_active', true)
        .eq('brand', brand)
        .order('name')
        .range(0, 999);

      if (error) throw error;

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

      return [];
    },
    enabled: !!brand,
    staleTime: 120_000,
  });
}

/** Fetch brand + category counts via server-side aggregation (no row-limit issue) */
export interface BrandSummaryRow {
  brand: string;
  category: string;
  cnt: number;
  missing_price: number;
  missing_swatch: number;
  is_professional: boolean;
}

export function useSupplyLibraryBrandSummaries() {
  return useQuery({
    queryKey: ['supply-library-brand-summaries'],
    queryFn: async (): Promise<BrandSummaryRow[]> => {
      const { data, error } = await supabase.rpc('get_supply_library_brand_summaries');
      if (error) throw error;
      return (data || []) as BrandSummaryRow[];
    },
    staleTime: 120_000,
  });
}
