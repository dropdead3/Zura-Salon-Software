import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';

export const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST, no DST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
] as const;

/**
 * Mutation to update timezone at org level or per-location.
 * - No locationId → writes to organizations.settings.defaults.timezone
 * - With locationId → writes to locations.timezone
 */
export function useUpdateTimezone() {
  const { effectiveOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ timezone, locationId }: { timezone: string; locationId?: string | null }) => {
      if (locationId) {
        // Per-location override
        const { error } = await supabase
          .from('locations')
          .update({ timezone } as any)
          .eq('id', locationId);
        if (error) throw error;
      } else {
        // Org-level default
        const orgId = effectiveOrganization?.id;
        if (!orgId) throw new Error('No organization selected');

        const { data: org, error: readError } = await supabase
          .from('organizations')
          .select('settings')
          .eq('id', orgId)
          .single();
        if (readError) throw readError;

        const currentSettings = (org?.settings as Record<string, unknown>) ?? {};
        const currentDefaults = (currentSettings.defaults as Record<string, unknown>) ?? {};

        const newSettings = {
          ...currentSettings,
          defaults: {
            ...currentDefaults,
            timezone,
          },
        };

        const { error: updateError } = await supabase
          .from('organizations')
          .update({ settings: newSettings })
          .eq('id', orgId);
        if (updateError) throw updateError;
      }

      return { timezone, locationId };
    },
    onSuccess: ({ timezone: tz, locationId }) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      if (locationId) {
        queryClient.invalidateQueries({ queryKey: ['location-timezone', locationId] });
        queryClient.invalidateQueries({ queryKey: ['locations'] });
      }
      const label = TIMEZONES.find(t => t.value === tz)?.label ?? tz;
      toast({
        title: 'Timezone updated',
        description: locationId ? `Location set to ${label}` : `Organization default set to ${label}`,
      });
    },
    onError: (error) => {
      toast({ title: 'Failed to update timezone', description: error.message, variant: 'destructive' });
    },
  });
}
