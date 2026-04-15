import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PlatformSecuritySettings {
  id: string;
  min_password_length: number;
  require_special_chars: boolean;
  require_mixed_case: boolean;
  password_expiry_days: number;
  session_timeout_minutes: number;
  max_concurrent_sessions: number;
  require_2fa_platform_admins: boolean;
  require_2fa_org_admins: boolean;
  updated_at: string;
  updated_by: string | null;
}

export function usePlatformSecuritySettings() {
  return useQuery({
    queryKey: ['platform-security-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_security_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as unknown as PlatformSecuritySettings;
    },
  });
}

export function useUpdatePlatformSecuritySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<PlatformSecuritySettings>) => {
      // Get the existing settings first to get the ID
      const { data: existing, error: fetchError } = await supabase
        .from('platform_security_settings')
        .select('id')
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('platform_security_settings')
        .update({
          min_password_length: settings.min_password_length,
          require_special_chars: settings.require_special_chars,
          require_mixed_case: settings.require_mixed_case,
          password_expiry_days: settings.password_expiry_days,
          session_timeout_minutes: settings.session_timeout_minutes,
          max_concurrent_sessions: settings.max_concurrent_sessions,
          require_2fa_platform_admins: settings.require_2fa_platform_admins,
          require_2fa_org_admins: settings.require_2fa_org_admins,
        })
        .eq('id', existing.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-security-settings'] });
      toast.success('Security settings updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update security settings', { description: error.message });
    },
  });
}
