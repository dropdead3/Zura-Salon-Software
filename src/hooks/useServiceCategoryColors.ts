import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface ServiceCategoryColor {
  id: string;
  category_name: string;
  color_hex: string;
  text_color_hex: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Calculate contrasting text color based on background luminance
export function getContrastingTextColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate relative luminance using sRGB formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return dark text for light backgrounds, white text for dark backgrounds
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}

// Generate 2-letter abbreviation from category name
export function getCategoryAbbreviation(categoryName: string): string {
  const words = categoryName.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return categoryName.slice(0, 2).toUpperCase();
}

// Fetch all category colors from database (Wave 11: org-scoped)
export function useServiceCategoryColors(organizationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = organizationId || effectiveOrganization?.id;

  return useQuery({
    queryKey: ['service-category-colors', orgId],
    queryFn: async () => {
      let query = supabase
        .from('service_category_colors')
        .select('*')
        .eq('is_archived', false)
        .order('display_order')
        .order('category_name');

      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ServiceCategoryColor[];
    },
    enabled: !!orgId,
  });
}

// Check if color is a gradient marker
export function isGradientMarker(colorHex: string): boolean {
  return colorHex.startsWith('gradient:');
}

// Update a single category color
export function useUpdateCategoryColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      categoryId, 
      colorHex 
    }: { 
      categoryId: string; 
      colorHex: string;
    }) => {
      // For gradient markers, use a default dark text color
      const textColorHex = isGradientMarker(colorHex) 
        ? '#1f2937' 
        : getContrastingTextColor(colorHex);
      
      const { error } = await supabase
        .from('service_category_colors')
        .update({ 
          color_hex: colorHex,
          text_color_hex: textColorHex,
          updated_at: new Date().toISOString(),
        })
        .eq('id', categoryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-category-colors'] });
    },
  });
}

// Reorder categories by updating display_order values.
// Wave 9: writes are sequential (deterministic on race) and explicitly
// scoped to organizationId as defense-in-depth on top of RLS.
export function useReorderCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderedIds,
      organizationId,
    }: {
      orderedIds: string[];
      organizationId?: string | null;
    }) => {
      const nowIso = new Date().toISOString();
      for (let i = 0; i < orderedIds.length; i++) {
        const id = orderedIds[i];
        let q = supabase
          .from('service_category_colors')
          .update({ display_order: i + 1, updated_at: nowIso })
          .eq('id', id);
        if (organizationId) {
          q = q.eq('organization_id', organizationId);
        }
        const { error } = await q;
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-category-colors'] });
    },
  });
}

// Sync new categories from services table (native). Wave 11: org-scoped reads/writes.
export function useSyncServiceCategories() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();

  return useMutation({
    mutationFn: async () => {
      const orgId = effectiveOrganization?.id;
      if (!orgId) throw new Error('No active organization');

      // Get unique categories from native services table (org-scoped)
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('category')
        .eq('is_active', true)
        .eq('organization_id', orgId);

      if (servicesError) throw servicesError;

      // Get existing categories (org-scoped)
      const { data: existingColors, error: colorsError } = await supabase
        .from('service_category_colors')
        .select('category_name')
        .eq('organization_id', orgId);

      if (colorsError) throw colorsError;

      const existingNames = new Set(existingColors?.map(c => c.category_name) || []);
      const uniqueCategories = [...new Set(services?.map(s => s.category).filter(Boolean) || [])];

      // Find new categories that need to be added
      const newCategories = uniqueCategories.filter(cat => cat && !existingNames.has(cat));

      if (newCategories.length > 0) {
        const defaultColors = [
          '#60a5fa', '#f472b6', '#facc15', '#10b981', '#a78bfa',
          '#f97316', '#06b6d4', '#ec4899', '#84cc16', '#8b5cf6',
        ];

        const newRecords = newCategories.map((categoryName, index) => {
          const colorHex = defaultColors[index % defaultColors.length];
          return {
            category_name: categoryName,
            color_hex: colorHex,
            text_color_hex: getContrastingTextColor(colorHex),
            organization_id: orgId,
          };
        });

        const { error: insertError } = await supabase
          .from('service_category_colors')
          .insert(newRecords);

        if (insertError) throw insertError;
      }

      return { added: newCategories.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-category-colors'] });
    },
  });
}

// Create a new category
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, organizationId }: { name: string; organizationId?: string }) => {
      const defaultColors = ['#60a5fa', '#f472b6', '#facc15', '#10b981', '#a78bfa'];
      const colorHex = defaultColors[Math.floor(Math.random() * defaultColors.length)];
      
      const { error } = await supabase
        .from('service_category_colors')
        .insert({
          category_name: name,
          color_hex: colorHex,
          text_color_hex: getContrastingTextColor(colorHex),
          organization_id: organizationId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-category-colors'] });
    },
  });
}

// Rename a category
export function useRenameCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, newName }: { categoryId: string; newName: string }) => {
      const { error } = await supabase
        .from('service_category_colors')
        .update({ category_name: newName, updated_at: new Date().toISOString() })
        .eq('id', categoryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-category-colors'] });
    },
  });
}

// Delete a category
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('service_category_colors')
        .delete()
        .eq('id', categoryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-category-colors'] });
    },
  });
}

/**
 * Fetch archived categories (Wave 11: org-scoped)
 */
export function useArchivedCategories(organizationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = organizationId || effectiveOrganization?.id;

  return useQuery({
    queryKey: ['service-category-colors-archived', orgId],
    queryFn: async () => {
      let query = supabase
        .from('service_category_colors')
        .select('*')
        .eq('is_archived', true)
        .order('archived_at', { ascending: false });

      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ServiceCategoryColor[];
    },
    enabled: !!orgId,
  });
}

/**
 * Archive a category and all its services
 */
export function useArchiveCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, categoryName }: { categoryId: string; categoryName: string }) => {
      // Archive the category
      const { error: catError } = await supabase
        .from('service_category_colors')
        .update({ is_archived: true, archived_at: new Date().toISOString() } as any)
        .eq('id', categoryId);
      if (catError) throw catError;

      // Archive all services in this category
      const { error: svcError } = await supabase
        .from('services')
        .update({ is_archived: true, archived_at: new Date().toISOString() } as any)
        .eq('category', categoryName);
      if (svcError) throw svcError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-category-colors'] });
      queryClient.invalidateQueries({ queryKey: ['service-category-colors-archived'] });
      queryClient.invalidateQueries({ queryKey: ['services-data'] });
      queryClient.invalidateQueries({ queryKey: ['services-archived'] });
      toast.success('Category and its services archived');
    },
    onError: (error: Error) => {
      toast.error('Failed to archive category: ' + error.message);
    },
  });
}

/**
 * Restore a category and its services
 */
export function useRestoreCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, categoryName }: { categoryId: string; categoryName: string }) => {
      // Restore the category
      const { error: catError } = await supabase
        .from('service_category_colors')
        .update({ is_archived: false, archived_at: null } as any)
        .eq('id', categoryId);
      if (catError) throw catError;

      // Restore all services in this category
      const { error: svcError } = await supabase
        .from('services')
        .update({ is_archived: false, archived_at: null } as any)
        .eq('category', categoryName);
      if (svcError) throw svcError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-category-colors'] });
      queryClient.invalidateQueries({ queryKey: ['service-category-colors-archived'] });
      queryClient.invalidateQueries({ queryKey: ['services-data'] });
      queryClient.invalidateQueries({ queryKey: ['services-archived'] });
      toast.success('Category and its services restored');
    },
    onError: (error: Error) => {
      toast.error('Failed to restore category: ' + error.message);
    },
  });
}

// Helper hook to get colors as a map for easy lookup
export function useServiceCategoryColorsMap(organizationId?: string) {
  const { data: colors, ...rest } = useServiceCategoryColors(organizationId);
  
  const colorMap = colors?.reduce((acc, color) => {
    acc[color.category_name.toLowerCase()] = {
      bg: color.color_hex,
      text: color.text_color_hex,
      abbr: getCategoryAbbreviation(color.category_name),
    };
    return acc;
  }, {} as Record<string, { bg: string; text: string; abbr: string }>) || {};
  
  return { colorMap, colors, ...rest };
}
