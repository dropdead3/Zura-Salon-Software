/**
 * Hook to read/write SEO Engine settings for an organization.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SEO_SETTINGS_SCHEMA } from '@/config/seo-engine/seo-settings-schema';
import { useAuth } from '@/contexts/AuthContext';

export function useSEOEngineSettings(organizationId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ['seo-engine-settings', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_engine_settings' as any)
        .select('setting_key, setting_value')
        .eq('organization_id', organizationId!);

      if (error) throw error;

      const map: Record<string, any> = {};
      for (const row of (data || []) as any[]) {
        map[row.setting_key] = row.setting_value;
      }
      return map;
    },
    enabled: !!organizationId,
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('seo_engine_settings' as any)
        .upsert(
          {
            organization_id: organizationId!,
            setting_key: key,
            setting_value: value,
            updated_by: user?.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id,setting_key' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seo-engine-settings', organizationId] });
    },
  });

  /** Get a setting value, falling back to schema default. */
  function getSetting(key: string): any {
    if (settings[key] !== undefined) return settings[key];
    const def = SEO_SETTINGS_SCHEMA.find((s) => s.key === key);
    return def?.defaultValue;
  }

  return { settings, isLoading, getSetting, updateSetting };
}
