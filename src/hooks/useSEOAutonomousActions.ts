/**
 * Hook for querying SEO autonomous actions and growth reports.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AutonomousAction {
  id: string;
  organization_id: string;
  task_id: string | null;
  template_key: string;
  action_type: string;
  confidence_score: number | null;
  predicted_lift: number | null;
  content_applied: any;
  rollback_data: any;
  measured_impact: any;
  status: string;
  error_message: string | null;
  executed_at: string;
  rolled_back_at: string | null;
  created_at: string;
}

export interface GrowthReport {
  id: string;
  organization_id: string;
  report_date: string;
  actions_taken: Array<{ template_key: string; count: number }>;
  impact_summary: {
    auto_executed: number;
    assisted_queued: number;
    total_actions: number;
  };
  remaining_opportunity: number | null;
  next_best_action: { task_id: string; template_key: string; title: string } | null;
  created_at: string;
}

export function useSEOAutonomousActions(organizationId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ['seo-autonomous-actions', organizationId, limit],
    queryFn: async (): Promise<AutonomousAction[]> => {
      const { data, error } = await supabase
        .from('seo_autonomous_actions' as any)
        .select('*')
        .eq('organization_id', organizationId!)
        .order('executed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!organizationId,
  });
}

export function useSEOGrowthReports(organizationId: string | undefined, limit = 7) {
  return useQuery({
    queryKey: ['seo-growth-reports', organizationId, limit],
    queryFn: async (): Promise<GrowthReport[]> => {
      const { data, error } = await supabase
        .from('seo_growth_reports' as any)
        .select('*')
        .eq('organization_id', organizationId!)
        .order('report_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!organizationId,
  });
}

export function useSEOLatestGrowthReport(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['seo-growth-report-latest', organizationId],
    queryFn: async (): Promise<GrowthReport | null> => {
      const { data, error } = await supabase
        .from('seo_growth_reports' as any)
        .select('*')
        .eq('organization_id', organizationId!)
        .order('report_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as any;
    },
    enabled: !!organizationId,
  });
}
