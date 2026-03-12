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
  supplier_id: string | null;
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
  page?: number;
  pageSize?: number;
}

export interface PaginatedProducts {
  data: Product[];
  count: number;
}

export function useProducts(filters: ProductFilters = {}) {
  const result = useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
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
      } else if (filters.page != null && filters.pageSize) {
        const from = filters.page * filters.pageSize;
        const to = from + filters.pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return { data: (data || []) as Product[], totalCount: count ?? 0 };
    },
  });

  return {
    ...result,
    data: result.data?.data,
    totalCount: result.data?.totalCount ?? 0,
  };
}

export function useProductCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const [productsResult, categoriesResult] = await Promise.all([
        supabase
          .from('products')
          .select('category')
          .eq('is_active', true)
          .not('category', 'is', null),
        supabase
          .from('product_categories')
          .select('name'),
      ]);

      if (productsResult.error) throw productsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      const fromProducts = (productsResult.data || []).map(p => p.category).filter(Boolean) as string[];
      const fromTable = (categoriesResult.data || []).map(c => c.name).filter(Boolean);

      const merged = [...new Set([...fromProducts, ...fromTable])];
      return merged.sort();
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
        product_type: product.product_type || 'Products',
        available_online: product.available_online,
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
