import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import { useOrgNow } from '@/hooks/useOrgNow';

export interface DailyHuddle {
  id: string;
  huddle_date: string;
  location_id: string | null;
  created_by: string;
  focus_of_the_day: string | null;
  sales_goals: Json;
  announcements: string | null;
  birthdays_celebrations: string | null;
  training_reminders: string | null;
  wins_from_yesterday: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface HuddleTemplate {
  id: string;
  name: string;
  location_id: string | null;
  template_content: Json;
  is_default: boolean;
  created_by: string;
  created_at: string;
}

export interface HuddleAcknowledgment {
  id: string;
  huddle_id: string;
  user_id: string;
  acknowledged_at: string;
}

export function useTodaysHuddle(locationId?: string) {
  const { todayStr: today } = useOrgNow();

  return useQuery({
    queryKey: ['todays-huddle', today, locationId],
    queryFn: async () => {
      let query = supabase
        .from('daily_huddles')
        .select('*')
        .eq('huddle_date', today)
        .eq('is_published', true);

      if (locationId) {
        query = query.eq('location_id', locationId);
      } else {
        query = query.is('location_id', null);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as unknown as DailyHuddle | null;
    },
  });
}

export function useHuddleHistory(limit = 30, locationId?: string) {
  return useQuery({
    queryKey: ['huddle-history', limit, locationId],
    queryFn: async () => {
      let query = supabase
        .from('daily_huddles')
        .select('*')
        .eq('is_published', true)
        .order('huddle_date', { ascending: false })
        .limit(limit);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as DailyHuddle[];
    },
  });
}

export function useHuddleById(huddleId: string | undefined) {
  return useQuery({
    queryKey: ['huddle', huddleId],
    queryFn: async () => {
      if (!huddleId) return null;
      const { data, error } = await supabase
        .from('daily_huddles')
        .select('*')
        .eq('id', huddleId)
        .single();
      if (error) throw error;
      return data as unknown as DailyHuddle;
    },
    enabled: !!huddleId,
  });
}

export function useHuddleTemplates(locationId?: string) {
  return useQuery({
    queryKey: ['huddle-templates', locationId],
    queryFn: async () => {
      let query = supabase
        .from('huddle_templates')
        .select('*')
        .order('name');

      if (locationId) {
        query = query.or(`location_id.eq.${locationId},location_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as HuddleTemplate[];
    },
  });
}

export function useMyHuddleAcknowledgment(huddleId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['huddle-acknowledgment', huddleId, user?.id],
    queryFn: async () => {
      if (!huddleId || !user) return null;
      const { data, error } = await supabase
        .from('huddle_acknowledgments')
        .select('*')
        .eq('huddle_id', huddleId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as HuddleAcknowledgment | null;
    },
    enabled: !!huddleId && !!user,
  });
}

export function useHuddleAcknowledgments(huddleId: string | undefined) {
  return useQuery({
    queryKey: ['huddle-acknowledgments', huddleId],
    queryFn: async () => {
      if (!huddleId) return [];
      const { data, error } = await supabase
        .from('huddle_acknowledgments')
        .select('*')
        .eq('huddle_id', huddleId);
      if (error) throw error;
      return data as unknown as HuddleAcknowledgment[];
    },
    enabled: !!huddleId,
  });
}

export function useCreateHuddle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (huddle: Partial<DailyHuddle>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('daily_huddles')
        .insert({
          ...huddle,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todays-huddle'] });
      queryClient.invalidateQueries({ queryKey: ['huddle-history'] });
      toast.success('Huddle created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create huddle: ${error.message}`);
    },
  });
}

export function useUpdateHuddle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<DailyHuddle>;
    }) => {
      const { data, error } = await supabase
        .from('daily_huddles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['todays-huddle'] });
      queryClient.invalidateQueries({ queryKey: ['huddle-history'] });
      queryClient.invalidateQueries({ queryKey: ['huddle', data.id] });
      toast.success('Huddle updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update huddle: ${error.message}`);
    },
  });
}

export function useDeleteHuddle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('daily_huddles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todays-huddle'] });
      queryClient.invalidateQueries({ queryKey: ['huddle-history'] });
      toast.success('Huddle deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete huddle: ${error.message}`);
    },
  });
}

export function useAcknowledgeHuddle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (huddleId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('huddle_acknowledgments')
        .insert({
          huddle_id: huddleId,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, huddleId) => {
      queryClient.invalidateQueries({ queryKey: ['huddle-acknowledgment', huddleId] });
      queryClient.invalidateQueries({ queryKey: ['huddle-acknowledgments', huddleId] });
      toast.success('Marked as read');
    },
    onError: (error: Error) => {
      toast.error(`Failed to acknowledge: ${error.message}`);
    },
  });
}

export function useCreateHuddleTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (template: Partial<HuddleTemplate>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('huddle_templates')
        .insert({
          name: template.name || 'Untitled Template',
          location_id: template.location_id || null,
          template_content: template.template_content || {},
          is_default: template.is_default || false,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['huddle-templates'] });
      toast.success('Template saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save template: ${error.message}`);
    },
  });
}

export function useDeleteHuddleTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('huddle_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['huddle-templates'] });
      toast.success('Template deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });
}
