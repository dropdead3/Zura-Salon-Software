import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const DEFAULT_LANDING_PAGE = '/dashboard';

export interface LandingPageOption {
  path: string;
  label: string;
  permission?: string;
  roles?: string[];
}

// Available landing pages - filtered by user permissions
export const LANDING_PAGE_OPTIONS: LandingPageOption[] = [
  { path: '/dashboard', label: 'Command Center', permission: 'view_command_center' },
  { path: '/dashboard/schedule', label: 'Schedule', permission: 'view_booking_calendar' },
];

export function useLandingPagePreference() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['landing-page-preference', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('custom_landing_page')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.custom_landing_page || null;
    },
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (landingPage: string | null) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Upsert the user preference
      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          { 
            user_id: user.id, 
            custom_landing_page: landingPage,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;
      return landingPage;
    },
    onSuccess: (landingPage) => {
      queryClient.invalidateQueries({ queryKey: ['landing-page-preference', user?.id] });
      if (landingPage) {
        const option = LANDING_PAGE_OPTIONS.find(o => o.path === landingPage);
        toast.success(`Landing page set to "${option?.label || landingPage}"`);
      } else {
        toast.success('Reset to default landing page (Command Center)');
      }
    },
    onError: (error) => {
      toast.error('Failed to update landing page: ' + error.message);
    },
  });

  return {
    customLandingPage: data,
    isLoading,
    hasCustomLandingPage: !!data && data !== DEFAULT_LANDING_PAGE,
    setLandingPage: updateMutation.mutateAsync,
    resetToDefault: () => updateMutation.mutateAsync(null),
    isUpdating: updateMutation.isPending,
    defaultLandingPage: DEFAULT_LANDING_PAGE,
  };
}

/**
 * Get available landing page options filtered by user permissions
 */
export function useAvailableLandingPages() {
  const { permissions, roles } = useAuth();

  const availableOptions = LANDING_PAGE_OPTIONS.filter(option => {
    // Check permission if specified
    if (option.permission && !permissions.includes(option.permission)) {
      return false;
    }
    // Check roles if specified
    if (option.roles && !option.roles.some(r => roles.includes(r as any))) {
      return false;
    }
    return true;
  });

  return availableOptions;
}
