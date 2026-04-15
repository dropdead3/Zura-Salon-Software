import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface TeamChallenge {
  id: string;
  title: string;
  description: string | null;
  challenge_type: 'individual' | 'team' | 'location';
  metric_type: 'bells' | 'retail' | 'new_clients' | 'retention' | 'training' | 'tips';
  goal_value: number | null;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  prize_description: string | null;
  created_by: string;
  organization_id: string | null;
  created_at: string;
  rules: Json;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string | null;
  location_id: string | null;
  team_name: string | null;
  current_value: number;
  rank: number | null;
  joined_at: string;
  // Joined data
  profile?: {
    display_name: string | null;
    full_name: string | null;
    photo_url: string | null;
  };
}

export function useChallenges(status?: string) {
  return useQuery({
    queryKey: ['challenges', status],
    queryFn: async () => {
      let query = supabase
        .from('team_challenges')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TeamChallenge[];
    },
  });
}

export function useChallenge(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['challenge', challengeId],
    queryFn: async () => {
      if (!challengeId) return null;
      const { data, error } = await supabase
        .from('team_challenges')
        .select('*')
        .eq('id', challengeId)
        .single();
      if (error) throw error;
      return data as unknown as TeamChallenge;
    },
    enabled: !!challengeId,
  });
}

export function useChallengeParticipants(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['challenge-participants', challengeId],
    queryFn: async () => {
      if (!challengeId) return [];
      
      const { data: participants, error } = await supabase
        .from('challenge_participants')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('rank', { ascending: true, nullsFirst: false });

      if (error) throw error;

      // Fetch profiles for participants
      const userIds = participants
        .filter(p => p.user_id)
        .map(p => p.user_id) as string[];

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('user_id, display_name, full_name, photo_url')
          .in('user_id', userIds);

        const profileMap = new Map(
          (profiles || []).map(p => [p.user_id, p])
        );

        return participants.map(p => ({
          ...p,
          profile: p.user_id ? profileMap.get(p.user_id) : undefined,
        })) as ChallengeParticipant[];
      }

      return participants as ChallengeParticipant[];
    },
    enabled: !!challengeId,
  });
}

export function useMyActiveChallenges() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-active-challenges', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get challenges user is participating in
      const { data: participations, error: partError } = await supabase
        .from('challenge_participants')
        .select('challenge_id, current_value, rank')
        .eq('user_id', user.id);

      if (partError) throw partError;

      if (!participations || participations.length === 0) return [];

      const challengeIds = participations.map(p => p.challenge_id);

      const { data: challenges, error: chalError } = await supabase
        .from('team_challenges')
        .select('*')
        .in('id', challengeIds)
        .eq('status', 'active');

      if (chalError) throw chalError;

      // Merge participation data
      return (challenges || []).map(c => ({
        ...c,
        myValue: participations.find(p => p.challenge_id === c.id)?.current_value || 0,
        myRank: participations.find(p => p.challenge_id === c.id)?.rank,
      }));
    },
    enabled: !!user,
  });
}

export function useCreateChallenge() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (challenge: {
      title: string;
      description?: string;
      challenge_type: string;
      metric_type: string;
      goal_value?: number;
      start_date: string;
      end_date: string;
      prize_description?: string;
      status?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('team_challenges')
        .insert({
          title: challenge.title,
          description: challenge.description || null,
          challenge_type: challenge.challenge_type,
          metric_type: challenge.metric_type,
          goal_value: challenge.goal_value || null,
          start_date: challenge.start_date,
          end_date: challenge.end_date,
          prize_description: challenge.prize_description || null,
          status: challenge.status || 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      toast.success('Challenge created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create challenge: ${error.message}`);
    },
  });
}

export function useUpdateChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<TeamChallenge>;
    }) => {
      const { data, error } = await supabase
        .from('team_challenges')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['challenge', data.id] });
      toast.success('Challenge updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update challenge: ${error.message}`);
    },
  });
}

export function useJoinChallenge() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (challengeId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, challengeId) => {
      queryClient.invalidateQueries({ queryKey: ['challenge-participants', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['my-active-challenges'] });
      toast.success('Joined challenge!');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('You have already joined this challenge');
      } else {
        toast.error(`Failed to join: ${error.message}`);
      }
    },
  });
}

export function useDeleteChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('team_challenges')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      toast.success('Challenge deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}
