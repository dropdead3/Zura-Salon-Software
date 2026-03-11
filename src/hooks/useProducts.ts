import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Product {
  id: string;
  organization_id: string | null;
  location_id: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  brand: string | null;
  description: string | null;
  retail_price: number | null;
  cost_price: number | null;
  quantity_on_hand: number | null;
  reorder_level: number | null;
  is_active: boolean | null;
  available_online: boolean | null;
  image_url: string | null;
  product_type: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  brand?: string;
  productType?: string;
  locationId?: string;
  lowStockOnly?: boolean;
  limit?: number;
}

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`
        );
      }

      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters.locationId && filters.locationId !== 'all') {
        query = query.eq('location_id', filters.locationId);
      }

      if (filters.brand && filters.brand !== 'all') {
        query = query.eq('brand', filters.brand);
      }

      if (filters.productType && filters.productType !== 'all') {
        query = query.eq('product_type', filters.productType);
      }

      if (filters.lowStockOnly) {
        query = query.not('reorder_level', 'is', null)
          .filter('quantity_on_hand', 'lt', 'reorder_level');
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useProductCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .eq('is_active', true)
        .not('category', 'is', null);

      if (error) throw error;
      
      const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
      return categories.sort() as string[];
    },
  });
}

export function useProductBrandsList() {
  return useQuery({
    queryKey: ['product-brands-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('brand')
        .eq('is_active', true)
        .not('brand', 'is', null);

      if (error) throw error;

      const brands = [...new Set(data.map(p => p.brand).filter(Boolean))];
      return brands.sort() as string[];
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Product> }) => {
      const { data, error } = await supabase
        .from('products')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated');
    },
    onError: (error) => {
      toast.error('Failed to update product: ' + error.message);
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: Partial<Product>) => {
      // Ensure required fields exist for insert
      const insertData = {
        name: product.name || 'Unnamed Product',
        sku: product.sku,
        barcode: product.barcode,
        category: product.category,
        brand: product.brand,
        description: product.description,
        retail_price: product.retail_price,
        cost_price: product.cost_price,
        quantity_on_hand: product.quantity_on_hand,
        reorder_level: product.reorder_level,
        is_active: product.is_active ?? true,
        organization_id: product.organization_id,
        location_id: product.location_id,
        image_url: product.image_url,
      };
      
      const { data, error } = await supabase
        .from('products')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created');
    },
    onError: (error) => {
      toast.error('Failed to create product: ' + error.message);
    },
  });
}
