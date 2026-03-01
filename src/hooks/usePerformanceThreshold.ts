import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from './useSettingsOrgId';

export interface PerformanceThreshold {
  minimumRevenue: number;
  evaluationPeriodDays: 30 | 60 | 90;
  alertsEnabled: boolean;
}

const DEFAULT_THRESHOLD: PerformanceThreshold = {
  minimumRevenue: 3000,
  evaluationPeriodDays: 30,
  alertsEnabled: true,
};

export function usePerformanceThreshold(explicitOrgId?: string) {
  const orgId = useSettingsOrgId(explicitOrgId);

  return useQuery({
    queryKey: ['site-settings', orgId, 'staff_performance_threshold'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'staff_performance_threshold')
        .eq('organization_id', orgId!)
        .maybeSingle();

      if (error) throw error;
      
      if (!data?.value) return DEFAULT_THRESHOLD;
      
      const value = data.value as unknown as PerformanceThreshold;
      return {
        minimumRevenue: value.minimumRevenue ?? DEFAULT_THRESHOLD.minimumRevenue,
        evaluationPeriodDays: value.evaluationPeriodDays ?? DEFAULT_THRESHOLD.evaluationPeriodDays,
        alertsEnabled: value.alertsEnabled ?? DEFAULT_THRESHOLD.alertsEnabled,
      };
    },
    enabled: !!orgId,
  });
}

export function useUpdatePerformanceThreshold(explicitOrgId?: string) {
  const queryClient = useQueryClient();
  const orgId = useSettingsOrgId(explicitOrgId);

  return useMutation({
    mutationFn: async (threshold: PerformanceThreshold) => {
      if (!orgId) throw new Error('No organization context');
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('site_settings')
        .upsert({ 
          id: 'staff_performance_threshold',
          organization_id: orgId,
          value: threshold as never,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings', orgId, 'staff_performance_threshold'] });
      queryClient.invalidateQueries({ queryKey: ['staff-revenue-performance'] });
    },
  });
}
