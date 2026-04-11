import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSEOTaskTemplates() {
  return useQuery({
    queryKey: ['seo-task-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_task_templates' as any)
        .select('*')
        .eq('is_active', true)
        .order('template_key');

      if (error) throw error;
      return (data || []) as any[];
    },
    staleTime: 1000 * 60 * 30, // 30 min — templates rarely change
  });
}
