import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PlatformNotification {
  id: string;
  recipient_id: string | null;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  slack_enabled: boolean;
}

export const NOTIFICATION_TYPES = {
  sync_failure: {
    label: 'Sync Failures',
    description: 'When data syncs fail',
    defaultChannels: ['in_app', 'email'],
  },
  new_account: {
    label: 'New Accounts',
    description: 'When new organizations are created',
    defaultChannels: ['in_app'],
  },
  critical_error: {
    label: 'Critical Errors',
    description: 'System errors requiring attention',
    defaultChannels: ['in_app', 'email'],
  },
  sla_breach: {
    label: 'SLA Breaches',
    description: 'When response SLAs are exceeded',
    defaultChannels: ['in_app', 'email'],
  },
  migration_complete: {
    label: 'Migration Complete',
    description: 'When data imports finish',
    defaultChannels: ['in_app'],
  },
  job_failure: {
    label: 'Job Failures',
    description: 'When scheduled jobs fail',
    defaultChannels: ['in_app', 'email'],
  },
  payment_failed: {
    label: 'Payment Failures',
    description: 'When subscription payments fail',
    defaultChannels: ['in_app', 'email'],
  },
  payment_recovered: {
    label: 'Payment Recovery',
    description: 'When failed payments are recovered',
    defaultChannels: ['in_app'],
  },
  low_stock_alert: {
    label: 'Low Stock Alerts',
    description: 'When products fall below minimum stock levels',
    defaultChannels: ['in_app', 'email'],
  },
  dead_stock_alert: {
    label: 'Dead Stock Alerts',
    description: 'When products have no sales activity for an extended period',
    defaultChannels: ['in_app'],
  },
};

export function usePlatformNotifications(limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['platform-notifications', user?.id, limit],
    queryFn: async (): Promise<PlatformNotification[]> => {
      const { data, error } = await supabase
        .from('platform_notifications')
        .select('*')
        .or(`recipient_id.is.null,recipient_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(n => ({
        ...n,
        severity: n.severity as PlatformNotification['severity'],
        metadata: (n.metadata as Record<string, unknown>) || {},
      }));
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  });
}

export function useUnreadNotificationCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['platform-notifications-unread-count', user?.id],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('platform_notifications')
        .select('id', { count: 'exact', head: true })
        .or(`recipient_id.is.null,recipient_id.eq.${user?.id}`)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('platform_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['platform-notifications-unread-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('platform_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .or(`recipient_id.is.null,recipient_id.eq.${user?.id}`)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['platform-notifications-unread-count'] });
    },
  });
}

export function useNotificationPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['platform-notification-preferences', user?.id],
    queryFn: async (): Promise<Record<string, NotificationPreference>> => {
      const { data, error } = await supabase
        .from('platform_notification_preferences')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;

      const prefs: Record<string, NotificationPreference> = {};
      for (const pref of data || []) {
        prefs[pref.notification_type] = pref as NotificationPreference;
      }
      return prefs;
    },
    enabled: !!user?.id,
  });
}

export function useUpdateNotificationPreference() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      notificationType: string;
      inAppEnabled?: boolean;
      emailEnabled?: boolean;
      slackEnabled?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('platform_notification_preferences')
        .upsert({
          user_id: user?.id,
          notification_type: params.notificationType,
          in_app_enabled: params.inAppEnabled ?? true,
          email_enabled: params.emailEnabled ?? true,
          slack_enabled: params.slackEnabled ?? false,
        }, {
          onConflict: 'user_id,notification_type',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-notification-preferences'] });
    },
  });
}
