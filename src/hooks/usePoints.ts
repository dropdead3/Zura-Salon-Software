import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  getUserPointsBalance,
  getPointsHistory,
  getPointsRules,
  getRewardsCatalog,
  getUserRedemptions,
  getPendingRedemptions,
  redeemReward,
  updateRedemptionStatus,
  awardPoints,
  updatePointsRule,
  createReward,
  updateReward,
  type PointsRule,
  type Reward,
} from '@/services/pointsService';

export function usePointsBalance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['points-balance', user?.id],
    queryFn: () => getUserPointsBalance(user!.id),
    enabled: !!user,
    staleTime: 30000, // 30 seconds
  });
}

export function usePointsHistory(limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['points-history', user?.id, limit],
    queryFn: () => getPointsHistory(user!.id, limit),
    enabled: !!user,
  });
}

export function usePointsRules() {
  return useQuery({
    queryKey: ['points-rules'],
    queryFn: async () => {
      // Get all rules, not just active ones, for the config view
      const { data, error } = await (await import('@/integrations/supabase/client')).supabase
        .from('points_rules')
        .select('*')
        .order('points_awarded', { ascending: false });

      if (error) {
        console.error('Error fetching points rules:', error);
        return [];
      }

      return data as unknown as PointsRule[];
    },
  });
}

export function useRewardsCatalog(activeOnly = true) {
  return useQuery({
    queryKey: ['rewards-catalog', activeOnly],
    queryFn: () => getRewardsCatalog(activeOnly),
  });
}

export function useMyRedemptions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-redemptions', user?.id],
    queryFn: () => getUserRedemptions(user!.id),
    enabled: !!user,
  });
}

export function usePendingRedemptions() {
  return useQuery({
    queryKey: ['pending-redemptions'],
    queryFn: getPendingRedemptions,
  });
}

export function useAwardPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      actionType,
      referenceId,
      description,
    }: {
      userId: string;
      actionType: string;
      referenceId?: string;
      description?: string;
    }) => {
      const result = await awardPoints(userId, actionType, referenceId, description);
      if (!result.success) throw new Error('Failed to award points');
      return result;
    },
    onSuccess: (result, variables) => {
      if (result.pointsAwarded > 0) {
        queryClient.invalidateQueries({ queryKey: ['points-balance', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['points-history', variables.userId] });
      }
    },
  });
}

export function useRedeemReward() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (rewardId: string) => {
      if (!user) throw new Error('Not authenticated');
      const result = await redeemReward(user.id, rewardId);
      if (!result.success) throw new Error(result.error || 'Failed to redeem');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points-balance'] });
      queryClient.invalidateQueries({ queryKey: ['points-history'] });
      queryClient.invalidateQueries({ queryKey: ['my-redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['rewards-catalog'] });
      toast.success('Reward redeemed! Check your redemptions for status.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateRedemptionStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      redemptionId,
      status,
      notes,
    }: {
      redemptionId: string;
      status: 'approved' | 'fulfilled' | 'denied';
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const success = await updateRedemptionStatus(redemptionId, status, user.id, notes);
      if (!success) throw new Error('Failed to update status');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-redemptions'] });
      toast.success('Redemption updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePointsRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ruleId,
      updates,
    }: {
      ruleId: string;
      updates: Partial<PointsRule>;
    }) => {
      const success = await updatePointsRule(ruleId, updates);
      if (!success) throw new Error('Failed to update rule');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points-rules'] });
      toast.success('Points rule updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCreateReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reward: Omit<Reward, 'id'>) => {
      const result = await createReward(reward);
      if (!result) throw new Error('Failed to create reward');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards-catalog'] });
      toast.success('Reward created');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rewardId,
      updates,
    }: {
      rewardId: string;
      updates: Partial<Reward>;
    }) => {
      const success = await updateReward(rewardId, updates);
      if (!success) throw new Error('Failed to update reward');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards-catalog'] });
      toast.success('Reward updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
