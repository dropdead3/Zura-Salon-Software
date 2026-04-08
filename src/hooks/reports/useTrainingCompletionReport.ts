import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface TrainingCompletionEntry {
  staffName: string;
  userId: string;
  videosCompleted: number;
  totalRequired: number;
  completionPct: number;
  lastCompletedDate: string | null;
}

export function useTrainingCompletionReport() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['training-completion-report', orgId],
    queryFn: async (): Promise<TrainingCompletionEntry[]> => {
      const { data: videos } = await supabase.from('training_videos').select('id, is_active').eq('is_active', true);
      const totalRequired = videos?.length || 0;

      const { data: progress } = await supabase.from('training_progress').select('user_id, video_id, completed_at');
      const { data: profiles } = await supabase.from('employee_profiles').select('user_id, full_name, display_name, is_active').eq('is_active', true);

      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.display_name || p.full_name || 'Unknown']));
      const activeVideoIds = new Set((videos || []).map(v => v.id));

      const userProgress = new Map<string, { completed: Set<string>; lastDate: string | null }>();
      for (const p of progress || []) {
        if (!activeVideoIds.has(p.video_id)) continue;
        if (!p.completed_at) continue;
        if (!userProgress.has(p.user_id)) userProgress.set(p.user_id, { completed: new Set(), lastDate: null });
        const up = userProgress.get(p.user_id)!;
        up.completed.add(p.video_id);
        if (!up.lastDate || p.completed_at > up.lastDate) up.lastDate = p.completed_at;
      }

      const results: TrainingCompletionEntry[] = [];
      for (const p of profiles || []) {
        const up = userProgress.get(p.user_id);
        const completed = up?.completed.size || 0;
        results.push({
          staffName: nameMap.get(p.user_id) || 'Unknown',
          userId: p.user_id,
          videosCompleted: completed,
          totalRequired,
          completionPct: totalRequired > 0 ? Math.round((completed / totalRequired) * 100) : 0,
          lastCompletedDate: up?.lastDate?.split('T')[0] || null,
        });
      }

      return results.sort((a, b) => b.completionPct - a.completionPct);
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
