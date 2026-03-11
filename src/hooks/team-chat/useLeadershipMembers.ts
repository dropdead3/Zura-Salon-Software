import { useQuery } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface LeadershipMember {
  user_id: string;
  display_name: string;
  full_name: string | null;
  photo_url: string | null;
  role: string;
  isCurrentUser?: boolean;
}

export function useLeadershipMembers() {
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();

  const { data: members, isLoading } = useQuery({
    queryKey: ['leadership-members', effectiveOrganization?.id],
    queryFn: async (): Promise<LeadershipMember[]> => {
      if (!effectiveOrganization?.id) return [];

      // Get users with leadership roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['manager', 'admin', 'super_admin']);

      if (roleError) throw roleError;
      if (!roleData?.length) return [];

      const leadershipUserIds = roleData.map((r) => r.user_id);

      // Get their profiles from the same organization
      const { data: profiles, error: profileError } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url')
        .eq('organization_id', effectiveOrganization.id)
        .eq('is_approved', true)
        .in('user_id', leadershipUserIds);

      if (profileError) throw profileError;

      // Map profiles with their highest role
      const roleMap = new Map<string, string>();
      roleData.forEach((r) => {
        const current = roleMap.get(r.user_id);
        // Priority: super_admin > admin > manager
        if (!current || 
            (r.role === 'super_admin') ||
            (r.role === 'admin' && current === 'manager')) {
          roleMap.set(r.user_id, r.role);
        }
      });

      const mappedMembers = (profiles || []).map((p) => ({
        user_id: p.user_id,
        display_name: p.display_name || p.full_name || 'Unknown',
        full_name: p.full_name,
        photo_url: p.photo_url,
        role: roleMap.get(p.user_id) || 'manager',
        isCurrentUser: p.user_id === user?.id,
      }));

      // Sort current user first
      return mappedMembers.sort((a, b) => {
        if (a.isCurrentUser) return -1;
        if (b.isCurrentUser) return 1;
        return 0;
      });
    },
    enabled: !!effectiveOrganization?.id && !!user,
  });

  return {
    members: members || [],
    isLoading,
  };
}
