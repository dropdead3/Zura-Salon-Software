import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface StylistLevel {
  id: string;
  slug: string;
  label: string;
  client_label: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  service_commission_rate: number | null;
  retail_commission_rate: number | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

// Simplified type for components that don't need all fields
export interface StylistLevelSimple {
  id: string;
  label: string;
  clientLabel: string;
}

// Hook to set up realtime subscription for stylist levels
export function useStylistLevelsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('stylist-levels-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stylist_levels',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['stylist-levels'] });
          queryClient.invalidateQueries({ queryKey: ['stylist-levels-all'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useStylistLevels() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  useStylistLevelsRealtime();
  
  return useQuery({
    queryKey: ['stylist-levels', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stylist_levels')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as StylistLevel[];
    },
  });
}

export function useAllStylistLevels() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['stylist-levels-all', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stylist_levels')
        .select('*')
        .eq('organization_id', orgId!)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as StylistLevel[];
    },
  });
}

// Convert database levels to simple format for backward compatibility
export function useStylistLevelsSimple() {
  const { data: levels, ...rest } = useStylistLevels();
  
  const simpleLevels: StylistLevelSimple[] | undefined = levels?.map(l => ({
    id: l.slug,
    label: l.label,
    clientLabel: l.client_label,
  }));

  return { data: simpleLevels, levels, ...rest };
}

export function useUpdateStylistLevel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<StylistLevel> & { id: string }) => {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from('stylist_levels')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stylist-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stylist-levels-all'] });
    },
    onError: (error) => {
      console.error('Error updating level:', error);
      toast({
        title: 'Error',
        description: 'Failed to update level. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useCreateStylistLevel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      organization_id: string;
      slug: string;
      label: string;
      client_label: string;
      description?: string;
      display_order: number;
    }) => {
      const { error } = await supabase
        .from('stylist_levels')
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stylist-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stylist-levels-all'] });
      toast({
        title: 'Level Created',
        description: 'The new stylist level has been added.',
      });
    },
    onError: (error) => {
      console.error('Error creating level:', error);
      toast({
        title: 'Error',
        description: 'Failed to create level. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteStylistLevel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stylist_levels')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stylist-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stylist-levels-all'] });
      toast({
        title: 'Level Deleted',
        description: 'The stylist level has been removed.',
      });
    },
    onError: (error) => {
      console.error('Error deleting level:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete level. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useReorderStylistLevels() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (levels: { id: string; display_order: number; client_label: string }[]) => {
      for (const level of levels) {
        const { error } = await supabase
          .from('stylist_levels')
          .update({ 
            display_order: level.display_order,
            client_label: level.client_label,
          })
          .eq('id', level.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stylist-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stylist-levels-all'] });
    },
    onError: (error) => {
      console.error('Error reordering levels:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder levels. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Batch save all levels (for modal editors)
export function useSaveStylistLevels() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { effectiveOrganization } = useOrganizationContext();

  return useMutation({
    mutationFn: async (levels: {
      id?: string;
      slug: string;
      label: string;
      client_label: string;
      description?: string;
      display_order: number;
      service_commission_rate?: number | null;
      retail_commission_rate?: number | null;
    }[]) => {
      const orgId = effectiveOrganization?.id;
      if (!orgId) throw new Error('No organization selected');

      // Get current levels from DB for this org
      const { data: existingLevels, error: fetchError } = await supabase
        .from('stylist_levels')
        .select('id, slug')
        .eq('organization_id', orgId);
      
      if (fetchError) throw fetchError;

      const existingSlugs = new Set(existingLevels?.map(l => l.slug) || []);
      const newSlugs = new Set(levels.map(l => l.slug));

      // Delete removed levels
      const toDelete = existingLevels?.filter(l => !newSlugs.has(l.slug)) || [];
      for (const level of toDelete) {
        const { error } = await supabase
          .from('stylist_levels')
          .delete()
          .eq('id', level.id);
        if (error) throw error;
      }

      // Update or insert levels
      for (const level of levels) {
        if (existingSlugs.has(level.slug)) {
          // Update existing
          const { error } = await supabase
            .from('stylist_levels')
            .update({
              label: level.label,
              client_label: level.client_label,
              description: level.description,
              display_order: level.display_order,
              service_commission_rate: level.service_commission_rate ?? null,
              retail_commission_rate: level.retail_commission_rate ?? null,
            })
            .eq('slug', level.slug)
            .eq('organization_id', orgId);
          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('stylist_levels')
            .insert({
              organization_id: orgId,
              slug: level.slug,
              label: level.label,
              client_label: level.client_label,
              description: level.description,
              display_order: level.display_order,
              service_commission_rate: level.service_commission_rate ?? null,
              retail_commission_rate: level.retail_commission_rate ?? null,
            });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stylist-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stylist-levels-all'] });
      toast({
        title: 'Levels Saved',
        description: 'Stylist levels have been updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Error saving levels:', error);
      toast({
        title: 'Error',
        description: 'Failed to save levels. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
