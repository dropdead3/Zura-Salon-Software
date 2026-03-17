/**
 * useSupplyLibraryBrandMeta — CRUD hooks for the supply_library_brands table.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SupplyBrandMeta {
  id: string;
  name: string;
  description: string | null;
  website_url: string | null;
  logo_url: string | null;
  country_of_origin: string | null;
  default_category: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch all active brand metadata */
export function useSupplyBrandsMeta() {
  return useQuery({
    queryKey: ['supply-library-brands-meta'],
    queryFn: async (): Promise<SupplyBrandMeta[]> => {
      const { data, error } = await supabase
        .from('supply_library_brands')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as SupplyBrandMeta[];
    },
    staleTime: 120_000,
  });
}

/** Create a new brand + optionally link products */
export function useCreateSupplyBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      website_url?: string;
      logo_url?: string;
      country_of_origin?: string;
      default_category?: string;
      products?: Array<{
        name: string;
        category: string;
        product_line?: string;
        size_options?: string[];
        default_depletion?: string;
        default_unit?: string;
        wholesale_price?: number;
      }>;
    }) => {
      // Insert brand
      const { data: brand, error: brandErr } = await supabase
        .from('supply_library_brands')
        .insert({
          name: params.name.trim(),
          description: params.description || null,
          website_url: params.website_url || null,
          logo_url: params.logo_url || null,
          country_of_origin: params.country_of_origin || null,
          default_category: params.default_category || 'color',
        } as any)
        .select()
        .single();

      if (brandErr) throw brandErr;

      // Insert products if provided
      let productCount = 0;
      if (params.products && params.products.length > 0) {
        const BATCH = 200;
        for (let i = 0; i < params.products.length; i += BATCH) {
          const batch = params.products.slice(i, i + BATCH).map((p) => ({
            brand: params.name.trim(),
            brand_id: (brand as any).id,
            name: p.name,
            category: p.category || params.default_category || 'color',
            product_line: p.product_line || null,
            size_options: p.size_options || [],
            default_depletion: p.default_depletion || 'weighed',
            default_unit: p.default_unit || 'g',
            wholesale_price: p.wholesale_price ?? null,
            is_active: true,
          }));
          const { error } = await supabase
            .from('supply_library_products')
            .insert(batch as any);
          if (error) throw error;
          productCount += batch.length;
        }
      }

      // Backfill brand_id on existing products with matching brand name
      await supabase
        .from('supply_library_products')
        .update({ brand_id: (brand as any).id } as any)
        .eq('brand', params.name.trim())
        .is('brand_id', null);

      return { brand, productCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['supply-library-brands-meta'] });
      queryClient.invalidateQueries({ queryKey: ['supply-library-products'] });
      queryClient.invalidateQueries({ queryKey: ['supply-library-brands'] });
      queryClient.invalidateQueries({ queryKey: ['supply-library-init-status'] });
      const parts = [`${result.brand.name} added`];
      if (result.productCount > 0) parts.push(`with ${result.productCount} products`);
      toast.success(parts.join(' '));
    },
    onError: (err: any) => {
      if (err.message?.includes('supply_library_brands_name_unique')) {
        toast.error('A brand with this name already exists');
      } else {
        toast.error('Failed to create brand: ' + err.message);
      }
    },
  });
}

/** Upload a brand logo to storage */
export async function uploadBrandLogo(file: File, brandName: string): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'png';
  const safeName = brandName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const path = `${safeName}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('brand-logos')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error('Logo upload failed:', error);
    return null;
  }

  const { data } = supabase.storage.from('brand-logos').getPublicUrl(path);
  return data?.publicUrl || null;
}
