import { supabase } from '@/integrations/supabase/client';

export interface PointsRule {
  id: string;
  action_type: string;
  points_awarded: number;
  description: string | null;
  is_active: boolean;
  max_daily: number | null;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  points: number;
  action_type: string;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  category: string | null;
  quantity_available: number | null;
  image_url: string | null;
  is_active: boolean;
  icon?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  organization_id?: string | null;
  sort_order?: number | null;
  is_featured?: boolean | null;
}

export interface RewardRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  status: string;
  notes: string | null;
  manager_id: string | null;
  created_at: string;
  fulfilled_at: string | null;
  reward?: Reward;
}

/**
 * Award points to a user for a specific action.
 * Uses the database function which handles daily caps automatically.
 */
export async function awardPoints(
  userId: string,
  actionType: string,
  referenceId?: string,
  description?: string
): Promise<{ success: boolean; pointsAwarded: number }> {
  const { data, error } = await supabase.rpc('award_points', {
    _user_id: userId,
    _action_type: actionType,
    _reference_id: referenceId || null,
    _description: description || null,
  });

  if (error) {
    console.error('Error awarding points:', error);
    return { success: false, pointsAwarded: 0 };
  }

  return { success: true, pointsAwarded: data || 0 };
}

/**
 * Get a user's current points balance.
 */
export async function getUserPointsBalance(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_user_points_balance', {
    _user_id: userId,
  });

  if (error) {
    console.error('Error getting points balance:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Get a user's points transaction history.
 */
export async function getPointsHistory(
  userId: string,
  limit = 50
): Promise<PointsTransaction[]> {
  const { data, error } = await supabase
    .from('points_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching points history:', error);
    return [];
  }

  return data as unknown as PointsTransaction[];
}

/**
 * Get all active point rules.
 */
export async function getPointsRules(): Promise<PointsRule[]> {
  const { data, error } = await supabase
    .from('points_rules')
    .select('*')
    .eq('is_active', true)
    .order('points_awarded', { ascending: false });

  if (error) {
    console.error('Error fetching points rules:', error);
    return [];
  }

  return data as unknown as PointsRule[];
}

/**
 * Update a points rule (admin only).
 */
export async function updatePointsRule(
  ruleId: string,
  updates: Partial<PointsRule>
): Promise<boolean> {
  const { error } = await supabase
    .from('points_rules')
    .update(updates)
    .eq('id', ruleId);

  if (error) {
    console.error('Error updating points rule:', error);
    return false;
  }

  return true;
}

/**
 * Get all rewards from the catalog.
 */
export async function getRewardsCatalog(activeOnly = true): Promise<Reward[]> {
  let query = supabase
    .from('rewards_catalog')
    .select('*')
    .order('points_cost', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching rewards:', error);
    return [];
  }

  return data as unknown as Reward[];
}

/**
 * Create a new reward (admin only).
 */
export async function createReward(reward: Omit<Reward, 'id'>): Promise<Reward | null> {
  const { data, error } = await supabase
    .from('rewards_catalog')
    .insert(reward)
    .select()
    .single();

  if (error) {
    console.error('Error creating reward:', error);
    return null;
  }

  return data as unknown as Reward;
}

/**
 * Update a reward (admin only).
 */
export async function updateReward(
  rewardId: string,
  updates: Partial<Reward>
): Promise<boolean> {
  const { error } = await supabase
    .from('rewards_catalog')
    .update(updates)
    .eq('id', rewardId);

  if (error) {
    console.error('Error updating reward:', error);
    return false;
  }

  return true;
}

/**
 * Redeem a reward for a user.
 */
export async function redeemReward(
  userId: string,
  rewardId: string
): Promise<{ success: boolean; error?: string }> {
  // Get user's balance
  const balance = await getUserPointsBalance(userId);

  // Get reward details
  const { data: reward, error: rewardError } = await supabase
    .from('rewards_catalog')
    .select('*')
    .eq('id', rewardId)
    .eq('is_active', true)
    .single();

  if (rewardError || !reward) {
    return { success: false, error: 'Reward not found or inactive' };
  }

  // Check balance
  if (balance < reward.points_cost) {
    return { success: false, error: 'Insufficient points' };
  }

  // Check availability
  if (reward.quantity_available !== null && reward.quantity_available <= 0) {
    return { success: false, error: 'Reward is out of stock' };
  }

  // Create redemption record
  const { error: redemptionError } = await supabase
    .from('reward_redemptions')
    .insert({
      user_id: userId,
      reward_id: rewardId,
      points_spent: reward.points_cost,
      status: 'pending',
    });

  if (redemptionError) {
    return { success: false, error: 'Failed to create redemption' };
  }

  // Deduct points
  const { error: pointsError } = await supabase.from('points_ledger').insert({
    user_id: userId,
    points: -reward.points_cost,
    action_type: 'reward_redeem',
    reference_id: rewardId,
    description: `Redeemed: ${reward.name}`,
  });

  if (pointsError) {
    return { success: false, error: 'Failed to deduct points' };
  }

  // Decrement quantity if applicable
  if (reward.quantity_available !== null) {
    await supabase
      .from('rewards_catalog')
      .update({ quantity_available: reward.quantity_available - 1 })
      .eq('id', rewardId);
  }

  return { success: true };
}

/**
 * Get user's redemption history.
 */
export async function getUserRedemptions(userId: string): Promise<RewardRedemption[]> {
  const { data, error } = await supabase
    .from('reward_redemptions')
    .select('*, reward:rewards_catalog(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching redemptions:', error);
    return [];
  }

  return data as unknown as RewardRedemption[];
}

/**
 * Get all pending redemptions (admin).
 */
export async function getPendingRedemptions(): Promise<RewardRedemption[]> {
  const { data, error } = await supabase
    .from('reward_redemptions')
    .select('*, reward:rewards_catalog(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching pending redemptions:', error);
    return [];
  }

  return data as unknown as RewardRedemption[];
}

/**
 * Update redemption status (admin).
 */
export async function updateRedemptionStatus(
  redemptionId: string,
  status: 'approved' | 'fulfilled' | 'denied',
  managerId: string,
  notes?: string
): Promise<boolean> {
  const updates: Record<string, unknown> = {
    status,
    manager_id: managerId,
    notes: notes || null,
  };

  if (status === 'fulfilled') {
    updates.fulfilled_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('reward_redemptions')
    .update(updates)
    .eq('id', redemptionId);

  if (error) {
    console.error('Error updating redemption:', error);
    return false;
  }

  return true;
}
