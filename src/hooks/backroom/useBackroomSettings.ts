/**
 * useBackroomSettings — Generic key-value settings with org→location inheritance.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface BackroomSetting {
  id: string;
  organization_id: string;
  location_id: string | null;
  setting_key: string;
  setting_value: Record<string, unknown>;
  updated_by: string | null;
  updated_at: string;
}

/**
 * Fetches all backroom settings for the org. Returns org-level defaults
 * and any location overrides. Consumer can resolve inheritance.
 */
export function useBackroomSettingsAll() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['backroom-settings', orgId],
    queryFn: async (): Promise<BackroomSetting[]> => {
      const { data, error } = await supabase
        .from('backroom_settings')
        .select('*')
        .eq('organization_id', orgId!)
        .order('setting_key');

      if (error) throw error;
      return (data || []) as unknown as BackroomSetting[];
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

/**
 * Resolve a single setting value with location→org fallback.
 */
export function useBackroomSetting(key: string, locationId?: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['backroom-settings', orgId, key, locationId],
    queryFn: async (): Promise<{ value: Record<string, unknown>; isOverride: boolean }> => {
      // Try location-specific first
      if (locationId) {
        const { data: locData } = await supabase
          .from('backroom_settings')
          .select('setting_value')
          .eq('organization_id', orgId!)
          .eq('location_id', locationId)
          .eq('setting_key', key)
          .maybeSingle();

        if (locData) {
          return { value: locData.setting_value as Record<string, unknown>, isOverride: true };
        }
      }

      // Fall back to org default (location_id IS NULL)
      const { data: orgData } = await supabase
        .from('backroom_settings')
        .select('setting_value')
        .eq('organization_id', orgId!)
        .is('location_id', null)
        .eq('setting_key', key)
        .maybeSingle();

      return { value: (orgData?.setting_value as Record<string, unknown>) || {}, isOverride: false };
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function useUpsertBackroomSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      setting_key: string;
      setting_value: Record<string, unknown>;
      location_id?: string | null;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const locId = params.location_id || null;

      // BUG-19 fix: Use select-then-insert/update instead of upsert
      // since partial unique indexes don't work with onConflict
      let query = supabase
        .from('backroom_settings')
        .select('id')
        .eq('organization_id', params.organization_id)
        .eq('setting_key', params.setting_key);

      if (locId) {
        query = query.eq('location_id', locId);
      } else {
        query = query.is('location_id', null);
      }

      const { data: existing } = await query.maybeSingle();

      let data, error;
      if (existing) {
        ({ data, error } = await supabase
          .from('backroom_settings')
          .update({
            setting_value: params.setting_value as unknown as Record<string, never>,
            updated_by: userId,
          })
          .eq('id', existing.id)
          .select()
          .single());
      } else {
        ({ data, error } = await supabase
          .from('backroom_settings')
          .insert({
            organization_id: params.organization_id,
            location_id: locId,
            setting_key: params.setting_key,
            setting_value: params.setting_value as unknown as Record<string, never>,
            updated_by: userId,
          })
          .select()
          .single());
      }

      if (error) throw error;

      // Audit log
      await supabase.rpc('log_platform_action', {
        _org_id: params.organization_id,
        _action: 'backroom_setting_updated',
        _entity_type: 'backroom_settings',
        _details: { key: params.setting_key, location_id: params.location_id },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backroom-settings'] });
      toast.success('Setting saved');
    },
    onError: (error) => {
      toast.error('Failed to save setting: ' + error.message);
    },
  });
}
