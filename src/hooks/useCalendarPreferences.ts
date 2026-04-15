import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CalendarPreferences {
  id: string;
  user_id: string;
  default_view: 'day' | 'week' | 'month' | 'agenda';
  default_location_id: string | null;
  show_cancelled: boolean;
  color_by: 'status' | 'service' | 'stylist';
  hours_start: number;
  hours_end: number;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PREFERENCES: Omit<CalendarPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  default_view: 'week',
  default_location_id: null,
  show_cancelled: false,
  color_by: 'service',
  hours_start: 8,
  hours_end: 20,
};

export function useCalendarPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['calendar-preferences', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Try to get existing preferences
      const { data, error } = await supabase
        .from('calendar_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      // If no preferences exist, create defaults
      if (!data) {
        const { data: newPrefs, error: insertError } = await supabase
          .from('calendar_preferences')
          .insert({ user_id: user!.id, ...DEFAULT_PREFERENCES })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return newPrefs as CalendarPreferences;
      }
      
      return data as unknown as CalendarPreferences;
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<Omit<CalendarPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      const { data, error } = await supabase
        .from('calendar_preferences')
        .update(updates)
        .eq('user_id', user!.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as CalendarPreferences;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['calendar-preferences', user?.id], data);
    },
    onError: (error: Error) => {
      toast.error('Failed to save preferences', { description: error.message });
    },
  });

  return {
    preferences: preferences ?? { ...DEFAULT_PREFERENCES, id: '', user_id: user?.id ?? '' } as CalendarPreferences,
    isLoading,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
}
