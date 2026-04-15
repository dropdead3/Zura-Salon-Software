import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type EmployeeProfile = Database['public']['Tables']['employee_profiles']['Row'];
type EmployeeProfileUpdate = Database['public']['Tables']['employee_profiles']['Update'];

// Fetch any user's profile by user_id (for super admins)
export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as EmployeeProfile | null;
    },
    enabled: !!userId,
  });
}

// Fetch user roles for a specific user
export function useUserRoles(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-roles', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;
      return data?.map(r => r.role) || [];
    },
    enabled: !!userId,
  });
}

// Fetch location schedules for a specific user
export function useUserLocationSchedules(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-location-schedules', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      
      const { data, error } = await supabase
        .from('employee_location_schedules')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

// Update any user's profile (for super admins)
export function useUpdateUserProfile(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: EmployeeProfileUpdate) => {
      if (!userId) throw new Error('User ID required');
      
      const { data, error } = await supabase
        .from('employee_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
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

// Upsert location schedule for a specific user (for super admins)
export function useUpsertUserLocationSchedule(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ locationId, workDays }: { locationId: string; workDays: string[] }) => {
      if (!userId) throw new Error('User ID required');

      const { data, error } = await supabase
        .from('employee_location_schedules')
        .upsert(
          {
            user_id: userId,
            location_id: locationId,
            work_days: workDays,
          },
          {
            onConflict: 'user_id,location_id',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-location-schedules', userId] });
      queryClient.invalidateQueries({ queryKey: ['team-directory'] });
    },
    onError: (error) => {
      console.error('Error updating schedule:', error);
      toast.error('Failed to update schedule');
    },
  });
}

// Upload photo for any user (for super admins)
export function useUploadUserProfilePhoto(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, focalX, focalY, cardFocalX, cardFocalY }: { file: File; focalX?: number; focalY?: number; cardFocalX?: number; cardFocalY?: number }) => {
      if (!userId) throw new Error('User ID required');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-photos')
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '31536000',
          contentType: 'image/webp',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(filePath);

      // Update profile with new photo URL and focal points
      const updatePayload: Record<string, any> = { photo_url: publicUrl };
      if (focalX !== undefined) updatePayload.photo_focal_x = focalX;
      if (focalY !== undefined) updatePayload.photo_focal_y = focalY;
      if (cardFocalX !== undefined) updatePayload.card_focal_x = cardFocalX;
      if (cardFocalY !== undefined) updatePayload.card_focal_y = cardFocalY;

      const { error: updateError } = await supabase
        .from('employee_profiles')
        .update(updatePayload)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['team-directory'] });
      toast.success('Photo uploaded successfully');
    },
    onError: (error) => {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    },
  });
}
