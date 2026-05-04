import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FeedbackSurvey {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: string;
  delay_hours: number;
  created_at: string;
  updated_at: string;
}

export interface FeedbackResponse {
  id: string;
  organization_id: string;
  survey_id: string | null;
  client_id: string | null;
  appointment_id: string | null;
  staff_user_id: string | null;
  nps_score: number | null;
  overall_rating: number | null;
  service_quality: number | null;
  staff_friendliness: number | null;
  cleanliness: number | null;
  would_recommend: boolean | null;
  comments: string | null;
  is_public: boolean;
  responded_at: string | null;
  token: string;
  expires_at: string | null;
  created_at: string;
}

export function useFeedbackSurveys(organizationId?: string) {
  return useQuery({
    queryKey: ['feedback-surveys', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_feedback_surveys' as any)
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as FeedbackSurvey[];
    },
    enabled: !!organizationId,
  });
}

export function useFeedbackResponses(organizationId?: string, limit = 50, locationId?: string) {
  const locFilter = locationId && locationId !== 'all' ? locationId : undefined;
  return useQuery({
    queryKey: ['feedback-responses', organizationId, limit, locFilter ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('client_feedback_responses' as any)
        .select('*')
        .eq('organization_id', organizationId)
        .not('responded_at', 'is', null)
        .order('responded_at', { ascending: false })
        .limit(limit);
      if (locFilter) q = q.eq('location_id', locFilter);
      const { data, error } = await q;

      if (error) throw error;
      return (data || []) as unknown as FeedbackResponse[];
    },
    enabled: !!organizationId,
  });
}

export function useFeedbackByToken(token?: string) {
  return useQuery({
    queryKey: ['feedback-by-token', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_feedback_responses' as any)
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as FeedbackResponse | null;
    },
    enabled: !!token,
  });
}

export function useCreateFeedbackSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (survey: Partial<FeedbackSurvey> & { organization_id: string }) => {
      const { data, error } = await supabase
        .from('client_feedback_surveys' as any)
        .insert(survey as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feedback-surveys', variables.organization_id] });
      toast.success('Survey created');
    },
    onError: (error) => {
      toast.error('Failed to create survey: ' + error.message);
    },
  });
}

export function useCreateFeedbackRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      clientId,
      appointmentId,
      staffUserId,
      surveyId,
    }: {
      organizationId: string;
      clientId?: string;
      appointmentId?: string;
      staffUserId?: string;
      surveyId?: string;
    }) => {
      // Generate token using UUID combination
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      const { data, error } = await supabase
        .from('client_feedback_responses' as any)
        .insert({
          organization_id: organizationId,
          client_id: clientId,
          appointment_id: appointmentId,
          staff_user_id: staffUserId,
          survey_id: surveyId,
          token,
          expires_at: expiresAt.toISOString(),
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as FeedbackResponse;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feedback-responses', variables.organizationId] });
    },
    onError: (error) => {
      toast.error('Failed to create feedback request: ' + error.message);
    },
  });
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      token,
      npsScore,
      overallRating,
      serviceQuality,
      staffFriendliness,
      cleanliness,
      wouldRecommend,
      comments,
      isPublic,
    }: {
      token: string;
      npsScore?: number;
      overallRating?: number;
      serviceQuality?: number;
      staffFriendliness?: number;
      cleanliness?: number;
      wouldRecommend?: boolean;
      comments?: string;
      isPublic?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('client_feedback_responses' as any)
        .update({
          nps_score: npsScore,
          overall_rating: overallRating,
          service_quality: serviceQuality,
          staff_friendliness: staffFriendliness,
          cleanliness: cleanliness,
          would_recommend: wouldRecommend,
          comments,
          is_public: isPublic,
          responded_at: new Date().toISOString(),
        } as any)
        .eq('token', token)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-by-token'] });
      toast.success('Thank you for your feedback!');
    },
    onError: (error) => {
      toast.error('Failed to submit feedback: ' + error.message);
    },
  });
}
