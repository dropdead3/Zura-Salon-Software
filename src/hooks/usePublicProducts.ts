import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Product } from './useProducts';

export interface PublicProductFilters {
  search?: string;
  category?: string;
  brand?: string;
  organizationId?: string;
}

export function usePublicProducts(filters: PublicProductFilters = {}) {
  return useQuery({
    queryKey: ['public-products', filters],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('available_online', true)
        .order('name', { ascending: true });

      if (filters.organizationId) {
        query = query.eq('organization_id', filters.organizationId);
      }

      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters.brand && filters.brand !== 'all') {
        query = query.eq('brand', filters.brand);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Product[];
    },
  });
}

export function usePublicProductCategories(organizationId?: string) {
  return useQuery({
    queryKey: ['public-product-categories', organizationId],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('category')
        .eq('is_active', true)
        .eq('available_online', true)
        .not('category', 'is', null);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return [...new Set(data.map(p => p.category).filter(Boolean))].sort() as string[];
    },
  });
}

export function usePublicProductBrands(organizationId?: string) {
  return useQuery({
    queryKey: ['public-product-brands', organizationId],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('brand')
        .eq('is_active', true)
        .eq('available_online', true)
        .not('brand', 'is', null);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return [...new Set(data.map(p => p.brand).filter(Boolean))].sort() as string[];
    },
  });
}
