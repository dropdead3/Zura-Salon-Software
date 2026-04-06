import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface GraduationRequirement {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  category: string;
  display_order: number;
  is_active: boolean;
  applies_to_level_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface GraduationSubmission {
  id: string;
  organization_id: string;
  requirement_id: string;
  assistant_id: string;
  status: 'pending' | 'approved' | 'needs_revision' | 'rejected';
  proof_url: string | null;
  assistant_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  requirement?: GraduationRequirement;
  assistant?: {
    full_name: string;
    email: string;
    photo_url: string | null;
  };
  reviewer?: {
    full_name: string;
  };
}

export interface GraduationFeedback {
  id: string;
  submission_id: string;
  coach_id: string;
  feedback: string;
  created_at: string;
  coach?: {
    full_name: string;
    photo_url: string | null;
  };
}

export interface AssistantProgress {
  assistant_id: string;
  full_name: string;
  email: string;
  photo_url: string | null;
  total_requirements: number;
  completed_requirements: number;
  pending_submissions: number;
  needs_revision: number;
  submissions: GraduationSubmission[];
}

/**
 * Fetch active graduation requirements for the current org.
 * When levelId is provided, filters to requirements that apply to that level
 * (or have no level restriction — null/empty applies_to_level_ids).
 */
export function useGraduationRequirements(levelId?: string | null) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['graduation-requirements', orgId, levelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('graduation_requirements')
        .select('*')
        .eq('organization_id', orgId!)
        .order('display_order', { ascending: true });

      if (error) throw error;

      let results = data as unknown as GraduationRequirement[];

      // Filter by level if provided
      if (levelId) {
        results = results.filter(r => {
          if (!r.applies_to_level_ids || r.applies_to_level_ids.length === 0) {
            return true; // no restriction = applies to all
          }
          return r.applies_to_level_ids.includes(levelId);
        });
      }

      return results;
    },
    enabled: !!orgId,
  });
}

/** All requirements (active + inactive) for admin management */
export function useAllGraduationRequirements() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['graduation-requirements-all', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('graduation_requirements')
        .select('*')
        .eq('organization_id', orgId!)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as unknown as GraduationRequirement[];
    },
    enabled: !!orgId,
  });
}

export function useGraduationSubmissions(assistantId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['graduation-submissions', orgId, assistantId],
    queryFn: async () => {
      let query = supabase
        .from('graduation_submissions')
        .select('*')
        .eq('organization_id', orgId!)
        .order('submitted_at', { ascending: false });

      if (assistantId) {
        query = query.eq('assistant_id', assistantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as GraduationSubmission[];
    },
    enabled: !!orgId,
  });
}

export function useAllAssistantProgress() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['all-assistant-progress', orgId],
    queryFn: async () => {
      const { data: assistants, error: assistantsError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'stylist_assistant');

      if (assistantsError) throw assistantsError;
      if (!assistants || assistants.length === 0) return [];

      const assistantIds = assistants.map(a => a.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, email, photo_url')
        .in('user_id', assistantIds)
        .eq('is_active', true);

      if (profilesError) throw profilesError;

      const { data: requirements, error: reqError } = await supabase
        .from('graduation_requirements')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('is_active', true);

      if (reqError) throw reqError;

      const { data: submissions, error: subError } = await supabase
        .from('graduation_submissions')
        .select('*')
        .eq('organization_id', orgId!)
        .in('assistant_id', assistantIds);

      if (subError) throw subError;

      const progressList: AssistantProgress[] = (profiles || []).map(profile => {
        const assistantSubmissions = (submissions || []).filter(
          s => s.assistant_id === profile.user_id
        ) as unknown as GraduationSubmission[];

        const completed = assistantSubmissions.filter(s => s.status === 'approved').length;
        const pending = assistantSubmissions.filter(s => s.status === 'pending').length;
        const needsRevision = assistantSubmissions.filter(s => s.status === 'needs_revision').length;

        return {
          assistant_id: profile.user_id,
          full_name: profile.full_name || 'Unknown',
          email: profile.email || '',
          photo_url: profile.photo_url,
          total_requirements: requirements?.length || 0,
          completed_requirements: completed,
          pending_submissions: pending,
          needs_revision: needsRevision,
          submissions: assistantSubmissions,
        };
      });

      return progressList;
    },
    enabled: !!orgId,
  });
}

export function useSubmissionFeedback(submissionId: string) {
  return useQuery({
    queryKey: ['graduation-feedback', submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('graduation_feedback')
        .select('*')
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const coachIds = [...new Set(data?.map(f => f.coach_id) || [])];
      const { data: coaches } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, photo_url')
        .in('user_id', coachIds);

      const coachMap = new Map(coaches?.map(c => [c.user_id, c]) || []);

      return (data || []).map(feedback => ({
        ...feedback,
        coach: coachMap.get(feedback.coach_id),
      })) as GraduationFeedback[];
    },
    enabled: !!submissionId,
  });
}

export function useCreateSubmission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { effectiveOrganization } = useOrganizationContext();

  return useMutation({
    mutationFn: async (data: {
      requirement_id: string;
      proof_url?: string;
      assistant_notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      if (!effectiveOrganization?.id) throw new Error('No organization');

      const { data: submission, error } = await supabase
        .from('graduation_submissions')
        .upsert({
          requirement_id: data.requirement_id,
          assistant_id: user.user.id,
          organization_id: effectiveOrganization.id,
          proof_url: data.proof_url || null,
          assistant_notes: data.assistant_notes || null,
          status: 'pending',
          submitted_at: new Date().toISOString(),
        }, {
          onConflict: 'requirement_id,assistant_id',
        })
        .select()
        .single();

      if (error) throw error;
      return submission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graduation-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['all-assistant-progress'] });
      toast({
        title: 'Submission Sent',
        description: 'Your check request has been submitted for review.',
      });
    },
    onError: (error) => {
      console.error('Error creating submission:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSubmissionStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { effectiveOrganization } = useOrganizationContext();

  return useMutation({
    mutationFn: async (data: {
      submissionId: string;
      status: 'approved' | 'needs_revision' | 'rejected';
      feedback?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      if (!effectiveOrganization?.id) throw new Error('No organization');

      const { error: updateError } = await supabase
        .from('graduation_submissions')
        .update({
          status: data.status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.user.id,
        })
        .eq('id', data.submissionId);

      if (updateError) throw updateError;

      if (data.feedback) {
        const { error: feedbackError } = await supabase
          .from('graduation_feedback')
          .insert({
            submission_id: data.submissionId,
            coach_id: user.user.id,
            feedback: data.feedback,
            organization_id: effectiveOrganization.id,
          });

        if (feedbackError) throw feedbackError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graduation-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['all-assistant-progress'] });
      queryClient.invalidateQueries({ queryKey: ['graduation-feedback'] });
      toast({
        title: 'Status Updated',
        description: 'The submission has been reviewed.',
      });
    },
    onError: (error) => {
      console.error('Error updating submission:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useAddFeedback() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { effectiveOrganization } = useOrganizationContext();

  return useMutation({
    mutationFn: async (data: { submissionId: string; feedback: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      if (!effectiveOrganization?.id) throw new Error('No organization');

      const { error } = await supabase
        .from('graduation_feedback')
        .insert({
          submission_id: data.submissionId,
          coach_id: user.user.id,
          feedback: data.feedback,
          organization_id: effectiveOrganization.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graduation-feedback'] });
      toast({
        title: 'Feedback Added',
        description: 'Your note has been added to the submission.',
      });
    },
    onError: (error) => {
      console.error('Error adding feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to add feedback. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useCreateRequirement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { effectiveOrganization } = useOrganizationContext();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string | null;
      category: string;
      applies_to_level_ids?: string[] | null;
    }) => {
      if (!effectiveOrganization?.id) throw new Error('No organization');

      const { data: existing } = await supabase
        .from('graduation_requirements')
        .select('display_order')
        .eq('organization_id', effectiveOrganization.id)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.display_order || 0) + 1;

      const { error } = await supabase
        .from('graduation_requirements')
        .insert({
          title: data.title,
          description: data.description || null,
          category: data.category,
          display_order: nextOrder,
          organization_id: effectiveOrganization.id,
          applies_to_level_ids: data.applies_to_level_ids || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graduation-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['graduation-requirements-all'] });
      toast({
        title: 'Requirement Created',
        description: 'The new requirement has been added.',
      });
    },
    onError: (error) => {
      console.error('Error creating requirement:', error);
      toast({
        title: 'Error',
        description: 'Failed to create requirement. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateRequirement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      title?: string;
      description?: string;
      category?: string;
      is_active?: boolean;
      applies_to_level_ids?: string[] | null;
    }) => {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from('graduation_requirements')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graduation-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['graduation-requirements-all'] });
      toast({
        title: 'Requirement Updated',
        description: 'The requirement has been updated.',
      });
    },
    onError: (error) => {
      console.error('Error updating requirement:', error);
      toast({
        title: 'Error',
        description: 'Failed to update requirement. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useUploadProof() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('proof-uploads')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from('proof-uploads')
        .createSignedUrl(fileName, 60 * 60 * 24 * 30);

      return urlData?.signedUrl || '';
    },
    onError: (error) => {
      console.error('Error uploading proof:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
