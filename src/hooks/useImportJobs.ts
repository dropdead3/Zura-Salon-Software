import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ImportJob {
  id: string;
  template_id: string | null;
  source_type: string;
  entity_type: string;
  file_name: string | null;
  total_rows: number | null;
  status: string;
  processed_rows: number | null;
  success_count: number | null;
  error_count: number | null;
  skip_count: number | null;
  errors: any;
  warnings: any;
  summary: any;
  started_at: string | null;
  completed_at: string | null;
  location_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  rolled_back_at: string | null;
  rolled_back_by: string | null;
  is_dry_run: boolean | null;
}

interface UseImportJobsOptions {
  organizationId?: string;
  limit?: number;
}

export function useImportJobs(options: UseImportJobsOptions = {}) {
  const { organizationId, limit = 20 } = options;

  return useQuery({
    queryKey: ['import-jobs', organizationId],
    queryFn: async () => {
      let query = supabase
        .from('import_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Filter by organization_id if provided
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as ImportJob[];
    },
  });
}

export function useRollbackImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke('rollback-import', {
        body: { job_id: jobId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Import rolled back successfully');
      queryClient.invalidateQueries({ queryKey: ['import-jobs'] });
      // Also invalidate the entity type that was rolled back
      if (data.entity_type) {
        queryClient.invalidateQueries({ queryKey: [data.entity_type] });
      }
    },
    onError: (error: Error) => {
      toast.error(`Rollback failed: ${error.message}`);
    },
  });
}
