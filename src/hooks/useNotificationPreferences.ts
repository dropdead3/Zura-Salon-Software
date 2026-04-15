import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  high_five_enabled: boolean;
  announcement_enabled: boolean;
  birthday_reminder_enabled: boolean;
  meeting_reminder_enabled: boolean;
  task_reminder_enabled: boolean;
  email_notifications_enabled: boolean;
  insights_email_enabled: boolean;
  insights_email_frequency: string;
  insights_email_last_sent: string | null;
  insights_email_next_at: string | null;
  payroll_deadline_enabled: boolean;
  created_at: string;
  updated_at: string;
}

const defaultPreferences: Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  high_five_enabled: true,
  announcement_enabled: true,
  birthday_reminder_enabled: true,
  meeting_reminder_enabled: true,
  task_reminder_enabled: true,
  email_notifications_enabled: false,
  insights_email_enabled: false,
  insights_email_frequency: 'weekly',
  insights_email_last_sent: null,
  insights_email_next_at: null,
  payroll_deadline_enabled: true,
};

export function useNotificationPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // Return existing preferences or defaults
      if (data) return data as unknown as NotificationPreferences;
      
      // Return default structure if no preferences exist yet
      return {
        ...defaultPreferences,
        user_id: user.id,
      } as Partial<NotificationPreferences>;
    },
    enabled: !!user?.id,
  });
}

export function useUpdateNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Partial<NotificationPreferences>) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast.success('Notification preferences saved');
    },
    onError: (error) => {
      console.error('Failed to update notification preferences:', error);
      toast.error('Failed to save preferences');
    },
  });
}
