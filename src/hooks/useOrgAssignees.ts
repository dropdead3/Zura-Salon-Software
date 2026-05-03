import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface Assignee {
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  photo_url: string | null;
}

/**
 * Lightweight active employee list for assignee pickers (recovery tasks,
 * coaching notes, etc.). No role filter — leadership decides who handles what.
 */
export function useOrgAssignees() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['org-assignees', orgId],
    enabled: !!orgId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Assignee[]> => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('is_approved', true)
        .order('display_name', { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Assignee[];
    },
  });
}

export function assigneeLabel(a: Pick<Assignee, 'display_name' | 'full_name'>): string {
  return a.display_name?.trim() || a.full_name?.trim() || 'Teammate';
}
