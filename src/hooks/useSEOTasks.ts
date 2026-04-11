import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSEOTasks(organizationId: string | undefined, filters?: {
  status?: string[];
  templateKey?: string;
  assignedTo?: string;
  campaignId?: string;
  locationId?: string;
}) {
  return useQuery({
    queryKey: ['seo-tasks', organizationId, filters],
    queryFn: async () => {
      let query = supabase
        .from('seo_tasks' as any)
        .select('*, seo_objects!primary_seo_object_id(id, label, object_type, object_key)')
        .eq('organization_id', organizationId!)
        .order('priority_score', { ascending: false });

      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters?.templateKey) {
        query = query.eq('template_key', filters.templateKey);
      }
      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }
      if (filters?.campaignId) {
        query = query.eq('campaign_id', filters.campaignId);
      }
      if (filters?.locationId) {
        query = query.eq('location_id', filters.locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!organizationId,
  });
}

export function useSEOTaskById(taskId: string | undefined) {
  return useQuery({
    queryKey: ['seo-task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_tasks' as any)
        .select('*')
        .eq('id', taskId!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!taskId,
  });
}
