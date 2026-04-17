import { useMemo } from 'react';
import { useEmployeeProfile } from './useEmployeeProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveUserId } from './useEffectiveUser';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useProfileCompletion() {
  const { roles: actualRoles } = useAuth();
  const { isViewingAsUser, viewAsRole } = useViewAs();
  const effectiveUserId = useEffectiveUserId();
  const { data: profile, isLoading: profileLoading } = useEmployeeProfile();
  
  // Fetch the impersonated user's roles when viewing as a specific user
  const { data: impersonatedRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['effective-user-roles', effectiveUserId, isViewingAsUser],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', effectiveUserId);

      if (error) throw error;
      return data?.map(r => r.role) || [];
    },
    enabled: isViewingAsUser && !!effectiveUserId,
    // Wave 17: roles change rarely; cache 5m to avoid refire on every route.
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  // Determine effective roles: impersonated user's roles, viewAs role, or actual roles
  const effectiveRoles = useMemo(() => {
    if (isViewingAsUser && impersonatedRoles && impersonatedRoles.length > 0) {
      return impersonatedRoles;
    }
    if (viewAsRole) {
      return [viewAsRole];
    }
    return actualRoles;
  }, [isViewingAsUser, impersonatedRoles, viewAsRole, actualRoles]);

  const { percentage, missingCount } = useMemo(() => {
    if (!profile) return { percentage: 0, missingCount: 0 };

    const isStylist = effectiveRoles.includes('stylist');
    const isOnsiteStaff = (profile as any).is_onsite_staff !== false;
    
    const fields = [
      { filled: !!profile.photo_url },
      { filled: !!profile.full_name },
      { filled: !!profile.display_name },
      { filled: !!profile.email },
      { filled: !!profile.phone },
      { filled: !!profile.instagram },
      { filled: (profile.location_ids?.length || 0) > 0 || !!profile.location_id },
      { filled: !!profile.emergency_contact },
      { filled: !!profile.emergency_phone },
    ];

    if (isStylist) {
      fields.push(
        { filled: !!profile.stylist_level },
        { filled: (profile.specialties?.length || 0) > 0 }
      );
    }

    // Work days only required for on-site staff
    if (isOnsiteStaff) {
      // Insert work_days check - we check location_schedules indirectly via work_days
      fields.push({ filled: (profile.work_days?.length || 0) > 0 });
    }

    const filledCount = fields.filter(f => f.filled).length;
    const percentage = Math.round((filledCount / fields.length) * 100);
    const missingCount = fields.length - filledCount;

    return { percentage, missingCount };
  }, [profile, effectiveRoles]);

  return { percentage, missingCount, isLoading: profileLoading || (isViewingAsUser && rolesLoading) };
}
