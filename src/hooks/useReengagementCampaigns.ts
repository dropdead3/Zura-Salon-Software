import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReengagementCampaign {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  inactivity_days: number;
  is_active: boolean;
  email_template_id: string | null;
  sms_enabled: boolean;
  offer_type: string | null;
  offer_value: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReengagementOutreach {
  id: string;
  campaign_id: string;
  client_id: string;
  last_visit_date: string | null;
  days_inactive: number | null;
  contacted_at: string;
  channel: string;
  status: string;
  converted_at: string | null;
  converted_appointment_id: string | null;
  created_at: string;
}

export interface CampaignStats {
  totalOutreach: number;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  conversionRate: number;
}

export function useReengagementCampaigns(organizationId?: string) {
  return useQuery({
    queryKey: ['reengagement-campaigns', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reengagement_campaigns' as any)
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ReengagementCampaign[];
    },
    enabled: !!organizationId,
  });
}

export function useCampaignOutreach(campaignId?: string) {
  return useQuery({
    queryKey: ['campaign-outreach', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reengagement_outreach' as any)
        .select('*')
        .eq('campaign_id', campaignId)
        .order('contacted_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ReengagementOutreach[];
    },
    enabled: !!campaignId,
  });
}

export function useCampaignStats(campaignId?: string) {
  return useQuery({
    queryKey: ['campaign-stats', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reengagement_outreach' as any)
        .select('status')
        .eq('campaign_id', campaignId);

      if (error) throw error;

      const outreach = (data || []) as unknown as { status: string }[];
      const totalOutreach = outreach.length;
      const sent = outreach.filter(o => o.status === 'sent').length;
      const opened = outreach.filter(o => o.status === 'opened').length;
      const clicked = outreach.filter(o => o.status === 'clicked').length;
      const converted = outreach.filter(o => o.status === 'converted').length;

      return {
        totalOutreach,
        sent,
        opened,
        clicked,
        converted,
        conversionRate: totalOutreach > 0 ? Math.round((converted / totalOutreach) * 100) : 0,
      } as CampaignStats;
    },
    enabled: !!campaignId,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: Partial<ReengagementCampaign> & { organization_id: string; name: string }) => {
      const { data, error } = await supabase
        .from('reengagement_campaigns' as any)
        .insert(campaign as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ReengagementCampaign;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reengagement-campaigns', variables.organization_id] });
      toast.success('Campaign created');
    },
    onError: (error) => {
      toast.error('Failed to create campaign: ' + error.message);
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ReengagementCampaign> }) => {
      const { data, error } = await supabase
        .from('reengagement_campaigns' as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ReengagementCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reengagement-campaigns'] });
      toast.success('Campaign updated');
    },
    onError: (error) => {
      toast.error('Failed to update campaign: ' + error.message);
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reengagement_campaigns' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reengagement-campaigns'] });
      toast.success('Campaign deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete campaign: ' + error.message);
    },
  });
}

export function useAtRiskClients(organizationId?: string, inactivityDays = 60) {
  return useQuery({
    queryKey: ['at-risk-clients', organizationId, inactivityDays],
    queryFn: async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - inactivityDays);

      const { data, error } = await supabase
        .from('v_all_clients' as any)
        .select('id, name, email, phone, last_visit, visit_count, total_spend')
        .eq('is_duplicate', false)
        .eq('location_id', organizationId)
        .lt('last_visit', cutoffDate.toISOString())
        .order('last_visit', { ascending: true })
        .limit(100);

      if (error) throw error;
      (data || []) as any[];
    },
    enabled: !!organizationId,
  });
}
