import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SupplyLibraryRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  submitted_by: string;
  organization_id: string | null;
  submitter_name: string | null;
  org_name: string | null;
}

export function useSupplyLibraryRequests() {
  return useQuery({
    queryKey: ['supply-library-requests'],
    queryFn: async () => {
      // Fetch platform_feedback for supply_library category that aren't completed
      const { data, error } = await supabase
        .from('platform_feedback' as any)
        .select('id, title, description, status, created_at, submitted_by, organization_id')
        .eq('category', 'supply_library')
        .or('status.is.null,status.neq.completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data || []) as any[];
      if (!rows.length) return [] as SupplyLibraryRequest[];

      // Batch-fetch submitter names
      const userIds = [...new Set(rows.map((r: any) => r.submitted_by).filter(Boolean))];
      const orgIds = [...new Set(rows.map((r: any) => r.organization_id).filter(Boolean))];

      const [profilesRes, orgsRes] = await Promise.all([
        userIds.length
          ? supabase.from('employee_profiles').select('user_id, display_name, full_name').in('user_id', userIds)
          : { data: [] },
        orgIds.length
          ? supabase.from('organizations').select('id, name').in('id', orgIds)
          : { data: [] },
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p.display_name || p.full_name]));
      const orgMap = new Map((orgsRes.data || []).map((o: any) => [o.id, o.name]));

      return rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        status: r.status || 'pending',
        created_at: r.created_at,
        submitted_by: r.submitted_by,
        organization_id: r.organization_id,
        submitter_name: profileMap.get(r.submitted_by) || null,
        org_name: r.organization_id ? orgMap.get(r.organization_id) || null : null,
      })) as SupplyLibraryRequest[];
    },
    staleTime: 30_000,
  });
}

export function useResolveSupplyRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'completed' | 'dismissed' }) => {
      const { error } = await supabase
        .from('platform_feedback' as any)
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['supply-library-requests'] });
      toast.success(status === 'completed' ? 'Request marked complete' : 'Request dismissed');
    },
    onError: (err: Error) => {
      toast.error('Failed to update request: ' + err.message);
    },
  });
}
