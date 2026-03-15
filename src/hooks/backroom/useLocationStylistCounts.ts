/**
 * useLocationStylistCounts — Fetches the count of active stylists per location
 * for an organization. Used by the Backroom paywall to auto-assign plan tiers.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LocationStylistCount {
  location_id: string;
  count: number;
}

export function useLocationStylistCounts(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['location-stylist-counts', organizationId],
    queryFn: async (): Promise<LocationStylistCount[]> => {
      // Get all active employees with the stylist role in this org
      const { data: employees, error: empError } = await supabase
        .from('employee_profiles')
        .select('user_id, location_id, location_ids')
        .eq('organization_id', organizationId!)
        .eq('is_active', true)
        .eq('is_approved', true);

      if (empError) throw empError;

      // Get user_ids that have the 'stylist' role
      const userIds = (employees ?? []).map((e) => e.user_id);
      if (userIds.length === 0) return [];

      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('user_id', userIds)
        .eq('role', 'stylist');

      if (roleError) throw roleError;

      const stylistUserIds = new Set((roles ?? []).map((r) => r.user_id));

      // Count stylists per location (handle both location_id and location_ids)
      const countMap = new Map<string, number>();

      for (const emp of employees ?? []) {
        if (!stylistUserIds.has(emp.user_id)) continue;

        const locIds: string[] = [];
        if (emp.location_id) locIds.push(emp.location_id);
        if (Array.isArray(emp.location_ids)) {
          for (const lid of emp.location_ids) {
            if (lid && !locIds.includes(lid)) locIds.push(lid);
          }
        }

        for (const lid of locIds) {
          countMap.set(lid, (countMap.get(lid) ?? 0) + 1);
        }
      }

      return Array.from(countMap.entries()).map(([location_id, count]) => ({
        location_id,
        count,
      }));
    },
    enabled: !!organizationId,
    staleTime: 2 * 60_000,
  });
}

/** Determine the recommended plan tier based on stylist count. */
export function getRecommendedTier(stylistCount: number): 'starter' | 'professional' | 'unlimited' {
  if (stylistCount <= 3) return 'starter';
  if (stylistCount <= 10) return 'professional';
  return 'unlimited';
}

/** Tier progression info for a given stylist count. Returns null if already on Unlimited. */
export interface TierProgressInfo {
  currentTier: 'starter' | 'professional' | 'unlimited';
  nextTier: 'professional' | 'unlimited';
  currentCount: number;
  thresholdMax: number;
  remaining: number;
  progressPct: number;
  isAtBoundary: boolean;
}

export function getTierProgressInfo(stylistCount: number): TierProgressInfo | null {
  if (stylistCount >= 11) return null; // Already unlimited
  if (stylistCount <= 3) {
    return {
      currentTier: 'starter',
      nextTier: 'professional',
      currentCount: stylistCount,
      thresholdMax: 3,
      remaining: 4 - stylistCount, // need 4 to hit professional
      progressPct: Math.round((stylistCount / 3) * 100),
      isAtBoundary: stylistCount === 3,
    };
  }
  // 4–10 → professional
  return {
    currentTier: 'professional',
    nextTier: 'unlimited',
    currentCount: stylistCount,
    thresholdMax: 10,
    remaining: 11 - stylistCount,
    progressPct: Math.round(((stylistCount - 3) / 7) * 100),
    isAtBoundary: stylistCount === 10,
  };
}

/** Plan pricing lookup */
export const PLAN_PRICING = {
  starter: { name: 'Starter', price: 39, annualPrice: 33, range: '1–3 stylists' },
  professional: { name: 'Professional', price: 79, annualPrice: 67, range: '4–10 stylists' },
  unlimited: { name: 'Unlimited', price: 129, annualPrice: 110, range: '11+ stylists' },
} as const;
