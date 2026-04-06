import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GraduationRequirement {
  id: string;
  title: string;
  description: string | null;
  category: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GraduationSubmission {
  id: string;
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

export function useGraduationRequirements() {
  return useQuery({
    queryKey: ['graduation-requirements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('graduation_requirements')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as GraduationRequirement[];
    },
  });
}

export function useAllGraduationRequirements() {
  return useQuery({
    queryKey: ['graduation-requirements-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('graduation_requirements')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as GraduationRequirement[];
    },
  });
}

export function useGraduationSubmissions(assistantId?: string) {
  return useQuery({
    queryKey: ['graduation-submissions', assistantId],
    queryFn: async () => {
      let query = supabase
        .from('graduation_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (assistantId) {
        query = query.eq('assistant_id', assistantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as GraduationSubmission[];
    },
  });
}

export function useAllAssistantProgress() {
  return useQuery({
    queryKey: ['all-assistant-progress'],
    queryFn: async () => {
      // Get all stylist assistants
      const { data: assistants, error: assistantsError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'stylist_assistant');

      if (assistantsError) throw assistantsError;

      if (!assistants || assistants.length === 0) {
        return [];
      }

      const assistantIds = assistants.map(a => a.user_id);

      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, email, photo_url')
        .in('user_id', assistantIds)
        .eq('is_active', true);

      if (profilesError) throw profilesError;

      // Get all requirements
      const { data: requirements, error: reqError } = await supabase
        .from('graduation_requirements')
        .select('*')
        .eq('is_active', true);

      if (reqError) throw reqError;

      // Get all submissions
      const { data: submissions, error: subError } = await supabase
        .from('graduation_submissions')
        .select('*')
        .in('assistant_id', assistantIds);

      if (subError) throw subError;

      // Build progress for each assistant
      const progressList: AssistantProgress[] = (profiles || []).map(profile => {
        const assistantSubmissions = (submissions || []).filter(
          s => s.assistant_id === profile.user_id
        ) as GraduationSubmission[];

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

      // Get coach profiles
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

  return useMutation({
    mutationFn: async (data: {
      requirement_id: string;
      proof_url?: string;
      assistant_notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: submission, error } = await supabase
        .from('graduation_submissions')
        .upsert({
          requirement_id: data.requirement_id,
          assistant_id: user.user.id,
          proof_url: data.proof_url,
          assistant_notes: data.assistant_notes,
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

  return useMutation({
    mutationFn: async (data: {
      submissionId: string;
      status: 'approved' | 'needs_revision' | 'rejected';
      feedback?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Update submission status
      const { error: updateError } = await supabase
        .from('graduation_submissions')
        .update({
          status: data.status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.user.id,
        })
        .eq('id', data.submissionId);

      if (updateError) throw updateError;

      // Add feedback if provided
      if (data.feedback) {
        const { error: feedbackError } = await supabase
          .from('graduation_feedback')
          .insert({
            submission_id: data.submissionId,
            coach_id: user.user.id,
            feedback: data.feedback,
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

  return useMutation({
    mutationFn: async (data: { submissionId: string; feedback: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('graduation_feedback')
        .insert({
          submission_id: data.submissionId,
          coach_id: user.user.id,
          feedback: data.feedback,
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

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      category: string;
    }) => {
      // Get max display order
      const { data: existing } = await supabase
        .from('graduation_requirements')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.display_order || 0) + 1;

      const { error } = await supabase
        .from('graduation_requirements')
        .insert({
          title: data.title,
          description: data.description,
          category: data.category,
          display_order: nextOrder,
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
        .createSignedUrl(fileName, 60 * 60 * 24 * 30); // 30 day signed URL

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
