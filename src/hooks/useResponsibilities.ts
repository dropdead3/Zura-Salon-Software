import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Responsibility {
  id: string;
  organization_id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResponsibilityAsset {
  id: string;
  responsibility_id: string;
  title: string;
  type: string;
  content: Record<string, any>;
  sort_order: number;
  created_at: string;
}

export interface UserResponsibility {
  id: string;
  user_id: string;
  responsibility_id: string;
  assigned_by: string | null;
  assigned_at: string;
  responsibility?: Responsibility;
}

// Fetch all active responsibilities
export function useResponsibilities() {
  return useQuery({
    queryKey: ['responsibilities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('responsibilities')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Responsibility[];
    },
  });
}

// Fetch all responsibilities including inactive (admin)
export function useAllResponsibilities() {
  return useQuery({
    queryKey: ['all-responsibilities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('responsibilities')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Responsibility[];
    },
  });
}

// Create responsibility
export function useCreateResponsibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; display_name: string; description?: string; icon: string; color: string; organization_id: string }) => {
      const { data: maxOrder } = await supabase
        .from('responsibilities')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();
      const { data, error } = await supabase
        .from('responsibilities')
        .insert({ ...input, sort_order: (maxOrder?.sort_order ?? 0) + 1 })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Responsibility;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['responsibilities'] });
      qc.invalidateQueries({ queryKey: ['all-responsibilities'] });
      toast.success('Responsibility created');
    },
    onError: (e: Error) => toast.error('Failed to create responsibility', { description: e.message }),
  });
}

// Update responsibility
export function useUpdateResponsibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Responsibility> }) => {
      const { data: updated, error } = await supabase
        .from('responsibilities')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return updated as Responsibility;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['responsibilities'] });
      qc.invalidateQueries({ queryKey: ['all-responsibilities'] });
      toast.success('Responsibility updated');
    },
    onError: (e: Error) => toast.error('Failed to update', { description: e.message }),
  });
}

// Archive responsibility
export function useArchiveResponsibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('responsibilities')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['responsibilities'] });
      qc.invalidateQueries({ queryKey: ['all-responsibilities'] });
      toast.success('Responsibility archived');
    },
    onError: (e: Error) => toast.error('Failed to archive', { description: e.message }),
  });
}

// Restore responsibility
export function useRestoreResponsibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('responsibilities')
        .update({ is_active: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['responsibilities'] });
      qc.invalidateQueries({ queryKey: ['all-responsibilities'] });
      toast.success('Responsibility restored');
    },
    onError: (e: Error) => toast.error('Failed to restore', { description: e.message }),
  });
}

// Delete responsibility
export function useDeleteResponsibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { count } = await supabase
        .from('user_responsibilities')
        .select('*', { count: 'exact', head: true })
        .eq('responsibility_id', id);
      if (count && count > 0) throw new Error(`Cannot delete: ${count} user(s) assigned`);
      const { error } = await supabase.from('responsibilities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['responsibilities'] });
      qc.invalidateQueries({ queryKey: ['all-responsibilities'] });
      toast.success('Responsibility deleted');
    },
    onError: (e: Error) => toast.error('Failed to delete', { description: e.message }),
  });
}

// Reorder responsibilities
export function useReorderResponsibilities() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await supabase
          .from('responsibilities')
          .update({ sort_order: i + 1 })
          .eq('id', orderedIds[i]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['responsibilities'] });
      qc.invalidateQueries({ queryKey: ['all-responsibilities'] });
      toast.success('Order updated');
    },
    onError: (e: Error) => toast.error('Failed to reorder', { description: e.message }),
  });
}

// Fetch user responsibilities (with responsibility data)
export function useUserResponsibilities(userId?: string) {
  return useQuery({
    queryKey: ['user-responsibilities', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_responsibilities')
        .select('*, responsibility:responsibilities(*)')
        .eq('user_id', userId!);
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        ...d,
        responsibility: d.responsibility as Responsibility,
      })) as UserResponsibility[];
    },
    enabled: !!userId,
  });
}

// Assign responsibility to user
export function useAssignResponsibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, responsibilityId }: { userId: string; responsibilityId: string }) => {
      const { data, error } = await supabase
        .from('user_responsibilities')
        .insert({ user_id: userId, responsibility_id: responsibilityId, assigned_by: (await supabase.auth.getUser()).data.user?.id })
        .select()
        .single();
      if (error) {
        if (error.code === '23505') throw new Error('Already assigned');
        throw error;
      }
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['user-responsibilities', vars.userId] });
      toast.success('Responsibility assigned');
    },
    onError: (e: Error) => toast.error('Failed to assign', { description: e.message }),
  });
}

// Remove responsibility from user
export function useRemoveResponsibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, responsibilityId }: { userId: string; responsibilityId: string }) => {
      const { error } = await supabase
        .from('user_responsibilities')
        .delete()
        .eq('user_id', userId)
        .eq('responsibility_id', responsibilityId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['user-responsibilities', vars.userId] });
      toast.success('Responsibility removed');
    },
    onError: (e: Error) => toast.error('Failed to remove', { description: e.message }),
  });
}

// Fetch responsibility assets
export function useResponsibilityAssets(responsibilityId?: string) {
  return useQuery({
    queryKey: ['responsibility-assets', responsibilityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('responsibility_assets')
        .select('*')
        .eq('responsibility_id', responsibilityId!)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as ResponsibilityAsset[];
    },
    enabled: !!responsibilityId,
  });
}

// Create responsibility asset
export function useCreateResponsibilityAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { responsibility_id: string; title: string; type: string; content: Record<string, any> }) => {
      const { data, error } = await supabase
        .from('responsibility_assets')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ResponsibilityAsset;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['responsibility-assets', data.responsibility_id] });
      toast.success('Asset added');
    },
    onError: (e: Error) => toast.error('Failed to add asset', { description: e.message }),
  });
}

// Delete responsibility asset
export function useDeleteResponsibilityAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, responsibilityId }: { id: string; responsibilityId: string }) => {
      const { error } = await supabase.from('responsibility_assets').delete().eq('id', id);
      if (error) throw error;
      return responsibilityId;
    },
    onSuccess: (responsibilityId) => {
      qc.invalidateQueries({ queryKey: ['responsibility-assets', responsibilityId] });
      toast.success('Asset removed');
    },
    onError: (e: Error) => toast.error('Failed to remove asset', { description: e.message }),
  });
}
