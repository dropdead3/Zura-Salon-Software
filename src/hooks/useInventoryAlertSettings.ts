import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface InventoryAlertSettings {
  id: string;
  organization_id: string;
  enabled: boolean;
  default_threshold_pct: number;
  alert_channels: string[];
  recipient_user_ids: string[];
  recipient_roles: string[];
  auto_create_draft_po: boolean;
  auto_reorder_enabled: boolean;
  auto_reorder_mode: string;
  max_auto_reorder_value: number | null;
  require_po_approval: boolean;
  dead_stock_enabled: boolean;
  dead_stock_days: number;
  audit_frequency: string;
  audit_reminder_enabled: boolean;
  audit_reminder_days_before: number;
  audit_notify_roles: string[];
  created_at: string;
  updated_at: string;
}

export function useInventoryAlertSettings() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['inventory-alert-settings', orgId],
    queryFn: async (): Promise<InventoryAlertSettings | null> => {
      const { data, error } = await supabase
        .from('inventory_alert_settings')
        .select('*')
        .eq('organization_id', orgId!)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as InventoryAlertSettings | null;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpsertInventoryAlertSettings() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<Omit<InventoryAlertSettings, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>) => {
      const { data, error } = await supabase
        .from('inventory_alert_settings')
        .upsert({
          organization_id: orgId!,
          ...settings,
        }, { onConflict: 'organization_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-alert-settings'] });
      toast.success('Alert settings updated');
    },
    onError: (error) => {
      toast.error('Failed to update alert settings: ' + error.message);
    },
  });
}
