import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useEffectiveUserId } from '@/hooks/useEffectiveUser';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { isTestAccount } from '@/utils/testAccounts';

type EmployeeProfile = Database['public']['Tables']['employee_profiles']['Row'];
type EmployeeProfileUpdate = Database['public']['Tables']['employee_profiles']['Update'];

/**
 * Fetches the employee profile for the effective user.
 * When a super admin is impersonating a user, this returns that user's profile.
 */
export function useEmployeeProfile() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ['employee-profile', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('user_id', effectiveUserId!)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as EmployeeProfile | null;
    },
    enabled: !!effectiveUserId,
  });
}

export function useUpdateEmployeeProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: EmployeeProfileUpdate) => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .update(updates)
        .eq('user_id', user!.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-profile'] });
      queryClient.invalidateQueries({ queryKey: ['team-directory'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-stylists'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-requests'] });
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    },
  });
}

export function useTeamDirectory(locationFilter?: string, options?: { includeTestAccounts?: boolean; organizationId?: string }) {
  const { roles, loading: authLoading } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const isAdminOrSuperAdmin = roles.includes('admin') || roles.includes('super_admin');
  
  // Only admins/super admins can see test accounts, and only when explicitly requested
  const shouldIncludeTestAccounts = options?.includeTestAccounts && isAdminOrSuperAdmin;

  // Use passed org or effective org from context
  const orgId = options?.organizationId || effectiveOrganization?.id;

  // When requesting test accounts, wait for roles to be loaded before running query
  // This prevents the query from running with shouldIncludeTestAccounts=false before roles load
  const shouldWaitForRoles = options?.includeTestAccounts && roles.length === 0 && !authLoading === false;

  return useQuery({
    queryKey: ['team-directory', locationFilter, shouldIncludeTestAccounts, roles.join(','), orgId],
    // Don't run query until auth is loaded AND roles are available (when needed for test accounts)
    enabled: !authLoading && !(options?.includeTestAccounts && roles.length === 0),
    queryFn: async () => {
      let query = supabase
        .from('employee_profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      // Apply organization filter
      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      if (locationFilter && locationFilter !== 'all') {
        query = query.eq('location_id', locationFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter out test accounts for non-admin users
      const filteredData = shouldIncludeTestAccounts 
        ? data 
        : (data || []).filter(profile => !isTestAccount(profile));

      // Fetch roles for each user
      const userIds = filteredData?.map(p => p.user_id) || [];
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const rolesMap = new Map<string, string[]>();
      rolesData?.forEach(r => {
        const existing = rolesMap.get(r.user_id) || [];
        rolesMap.set(r.user_id, [...existing, r.role]);
      });

      // Fetch location schedules for all users
      const { data: schedulesData } = await supabase
        .from('employee_location_schedules')
        .select('*')
        .in('user_id', userIds);

      const schedulesMap = new Map<string, Record<string, string[]>>();
      schedulesData?.forEach(s => {
        const existing = schedulesMap.get(s.user_id) || {};
        existing[s.location_id] = s.work_days || [];
        schedulesMap.set(s.user_id, existing);
      });

      return (filteredData || []).map(profile => ({
        ...profile,
        roles: rolesMap.get(profile.user_id) || [],
        location_schedules: schedulesMap.get(profile.user_id) || {},
      }));
    },
  });
}

export function useUploadProfilePhoto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ input, focalX, focalY, cardFocalX, cardFocalY, avatarZoom, avatarRotation, cardZoom, cardRotation }: { input: File | Blob; focalX?: number; focalY?: number; cardFocalX?: number; cardFocalY?: number; avatarZoom?: number; avatarRotation?: number; cardZoom?: number; cardRotation?: number }) => {
      const isFile = input instanceof File && 'name' in input && input.name;
      const fileExt = isFile ? (input as File).name.split('.').pop() : 'webp';
      const fileName = `${user!.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user!.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-photos')
        .upload(filePath, input, {
          upsert: true,
          cacheControl: '31536000',
          contentType: 'image/webp',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(filePath);

      // Update profile with new photo URL, focal points, zoom, and rotation
      const updatePayload: Record<string, any> = { photo_url: publicUrl };
      if (focalX !== undefined) updatePayload.photo_focal_x = focalX;
      if (focalY !== undefined) updatePayload.photo_focal_y = focalY;
      if (cardFocalX !== undefined) updatePayload.card_focal_x = cardFocalX;
      if (cardFocalY !== undefined) updatePayload.card_focal_y = cardFocalY;
      if (avatarZoom !== undefined) updatePayload.avatar_zoom = avatarZoom;
      if (avatarRotation !== undefined) updatePayload.avatar_rotation = avatarRotation;
      if (cardZoom !== undefined) updatePayload.card_zoom = cardZoom;
      if (cardRotation !== undefined) updatePayload.card_rotation = cardRotation;

      const { error: updateError } = await supabase
        .from('employee_profiles')
        .update(updatePayload)
        .eq('user_id', user!.id);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['employee-profile'] });
      await queryClient.refetchQueries({ queryKey: ['team-directory'] });
      await queryClient.refetchQueries({ queryKey: ['homepage-stylists'] });
      toast.success('Photo uploaded successfully');
    },
    onError: (error) => {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    },
  });
}
