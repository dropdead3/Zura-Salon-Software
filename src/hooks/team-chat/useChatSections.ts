import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface ChatSection {
  id: string;
  organization_id: string;
  name: string;
  icon: string;
  sort_order: number;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSectionData {
  name: string;
  icon?: string;
  sort_order?: number;
}

export interface UpdateSectionData {
  name?: string;
  icon?: string;
  sort_order?: number;
}

export function useChatSections() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ['chat-sections', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('chat_sections')
        .select('*')
        .eq('organization_id', orgId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as unknown as ChatSection[];
    },
    enabled: !!orgId,
  });

  const createSection = useMutation({
    mutationFn: async (data: CreateSectionData) => {
      if (!orgId) throw new Error('No organization selected');

      // Get max sort_order
      const maxOrder = Math.max(0, ...sections.map(s => s.sort_order));

      const { data: newSection, error } = await supabase
        .from('chat_sections')
        .insert({
          organization_id: orgId,
          name: data.name,
          icon: data.icon || 'folder',
          sort_order: data.sort_order ?? maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return newSection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sections', orgId] });
      toast.success('Section created');
    },
    onError: (error) => {
      toast.error('Failed to create section');
      console.error(error);
    },
  });

  const updateSection = useMutation({
    mutationFn: async ({ id, ...data }: UpdateSectionData & { id: string }) => {
      const { error } = await supabase
        .from('chat_sections')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sections', orgId] });
      toast.success('Section updated');
    },
    onError: (error) => {
      toast.error('Failed to update section');
      console.error(error);
    },
  });

  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      // First, unassign all channels from this section
      await supabase
        .from('chat_channels')
        .update({ section_id: null })
        .eq('section_id', id);

      const { error } = await supabase
        .from('chat_sections')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sections', orgId] });
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      toast.success('Section deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete section');
      console.error(error);
    },
  });

  const reorderSections = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('chat_sections')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sections', orgId] });
    },
    onError: (error) => {
      toast.error('Failed to reorder sections');
      console.error(error);
    },
  });

  return {
    sections,
    isLoading,
    createSection: createSection.mutate,
    updateSection: updateSection.mutate,
    deleteSection: deleteSection.mutate,
    reorderSections: reorderSections.mutate,
    isCreating: createSection.isPending,
    isUpdating: updateSection.isPending,
    isDeleting: deleteSection.isPending,
  };
}
