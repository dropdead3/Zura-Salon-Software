import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

export interface PerformanceReview {
  id: string;
  organization_id: string;
  user_id: string;
  reviewer_id: string;
  review_type: string;
  review_period_start: string | null;
  review_period_end: string | null;
  status: string;
  overall_rating: number | null;
  strengths: string | null;
  areas_for_improvement: string | null;
  goals_summary: string | null;
  reviewer_notes: string | null;
  employee_notes: string | null;
  acknowledged_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewGoal {
  id: string;
  review_id: string;
  goal_text: string;
  target_date: string | null;
  status: string;
  progress_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function usePerformanceReviews() {
  const { user } = useAuth();
  const { effectiveOrganization: organization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const reviews = useQuery({
    queryKey: ['performance-reviews', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as PerformanceReview[];
    },
    enabled: !!orgId,
  });

  const createReview = useMutation({
    mutationFn: async (review: Partial<PerformanceReview>) => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .insert({
          ...review,
          organization_id: orgId!,
          reviewer_id: review.reviewer_id || user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast({ title: 'Review created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to create review', description: error.message, variant: 'destructive' });
    },
  });

  const updateReview = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PerformanceReview> & { id: string }) => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast({ title: 'Review updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update review', description: error.message, variant: 'destructive' });
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('performance_reviews').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast({ title: 'Review deleted' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to delete review', description: error.message, variant: 'destructive' });
    },
  });

  // Review Goals
  const useReviewGoals = (reviewId: string) =>
    useQuery({
      queryKey: ['review-goals', reviewId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('review_goals')
          .select('*')
          .eq('review_id', reviewId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        return data as unknown as ReviewGoal[];
      },
      enabled: !!reviewId,
    });

  const createGoal = useMutation({
    mutationFn: async (goal: Partial<ReviewGoal>) => {
      const { data, error } = await supabase
        .from('review_goals')
        .insert(goal as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-goals'] });
      toast({ title: 'Goal added' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to add goal', description: error.message, variant: 'destructive' });
    },
  });

  return { reviews, createReview, updateReview, deleteReview, useReviewGoals, createGoal };
}
