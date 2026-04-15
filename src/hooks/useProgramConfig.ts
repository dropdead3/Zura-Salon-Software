import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProgramConfig {
  id: string;
  program_name: string;
  total_days: number;
  weekly_wins_interval: number;
  require_proof_upload: boolean;
  require_metrics_logging: boolean;
  allow_manual_restart: boolean;
  auto_restart_on_miss: boolean;
  is_active: boolean;
  grace_period_hours: number;
  life_happens_passes_total: number;
  logo_url: string | null;
  logo_size: number;
  logo_color: string | null;
  welcome_headline: string | null;
  welcome_subheadline: string | null;
  welcome_cta_text: string | null;
  welcome_eyebrow: string | null;
}

export interface DailyTask {
  id: string;
  task_key: string;
  label: string;
  description: string | null;
  display_order: number;
  is_required: boolean;
  is_active: boolean;
}

export interface ProgramRule {
  id: string;
  rule_number: number;
  rule_text: string;
  is_emphasized: boolean;
  is_active: boolean;
  display_order: number;
}

export function useProgramConfig() {
  const configQuery = useQuery({
    queryKey: ['program-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_configuration')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as unknown as ProgramConfig;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    config: configQuery.data,
    loading: configQuery.isLoading,
    error: configQuery.error,
    refetch: configQuery.refetch,
  };
}

export function useDailyTasks() {
  const tasksQuery = useQuery({
    queryKey: ['program-daily-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_daily_tasks')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as unknown as DailyTask[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    tasks: tasksQuery.data || [],
    loading: tasksQuery.isLoading,
    error: tasksQuery.error,
    refetch: tasksQuery.refetch,
  };
}

export function useProgramRules() {
  const rulesQuery = useQuery({
    queryKey: ['program-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_rules')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as unknown as ProgramRule[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    rules: rulesQuery.data || [],
    loading: rulesQuery.isLoading,
    error: rulesQuery.error,
  };
}
