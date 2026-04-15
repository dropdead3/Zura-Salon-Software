import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

export interface IncidentReport {
  id: string;
  organization_id: string;
  reported_by: string;
  involved_user_id: string | null;
  incident_type: string;
  incident_date: string;
  location_id: string | null;
  description: string;
  severity: string;
  witnesses: string | null;
  corrective_action: string | null;
  status: string;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useIncidentReports() {
  const { user } = useAuth();
  const { effectiveOrganization: organization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const incidents = useQuery({
    queryKey: ['incident-reports', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*')
        .eq('organization_id', orgId!)
        .order('incident_date', { ascending: false });
      if (error) throw error;
      return data as unknown as IncidentReport[];
    },
    enabled: !!orgId,
  });

  const createIncident = useMutation({
    mutationFn: async (incident: Partial<IncidentReport>) => {
      const { data, error } = await supabase
        .from('incident_reports')
        .insert({
          ...incident,
          organization_id: orgId!,
          reported_by: user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-reports'] });
      toast({ title: 'Incident reported successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to report incident', description: error.message, variant: 'destructive' });
    },
  });

  const updateIncident = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<IncidentReport> & { id: string }) => {
      const { data, error } = await supabase
        .from('incident_reports')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-reports'] });
      toast({ title: 'Incident updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update incident', description: error.message, variant: 'destructive' });
    },
  });

  const deleteIncident = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('incident_reports').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-reports'] });
      toast({ title: 'Incident deleted' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to delete incident', description: error.message, variant: 'destructive' });
    },
  });

  return { incidents, createIncident, updateIncident, deleteIncident };
}
