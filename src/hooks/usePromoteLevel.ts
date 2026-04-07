import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PromoteLevelParams {
  userId: string;
  fromLevelSlug: string;
  toLevelSlug: string;
  notes?: string;
}

export function usePromoteLevel() {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const orgId = effectiveOrganization?.id;

  return useMutation({
    mutationFn: async ({ userId, fromLevelSlug, toLevelSlug, notes }: PromoteLevelParams) => {
      if (!orgId || !user?.id) throw new Error('Missing organization or user context');

      // 1. Update the employee's stylist_level
      const { error: updateError } = await supabase
        .from('employee_profiles')
        .update({ stylist_level: toLevelSlug, stylist_level_since: new Date().toISOString() } as any)
        .eq('user_id', userId)
        .eq('organization_id', orgId);

      if (updateError) throw updateError;

      // 2. Record in level_promotions audit table
      const { error: auditError } = await supabase
        .from('level_promotions')
        .insert({
          user_id: userId,
          organization_id: orgId,
          from_level: fromLevelSlug,
          to_level: toLevelSlug,
          promoted_by: user.id,
          ...(notes ? { notes } : {}),
        });

      if (auditError) throw auditError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-profiles-for-graduation'] });
      queryClient.invalidateQueries({ queryKey: ['employee-profile-level'] });
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
      queryClient.invalidateQueries({ queryKey: ['promotion-history'] });
      toast.success('Promotion approved successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to promote', { description: error.message });
    },
  });
}
