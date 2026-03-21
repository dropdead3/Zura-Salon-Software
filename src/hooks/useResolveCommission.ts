import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStylistLevels, StylistLevel } from './useStylistLevels';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export type CommissionSource = 'override' | 'level' | 'unassigned';

export interface ResolvedCommission {
  serviceRate: number;
  retailRate: number;
  serviceCommission: number;
  retailCommission: number;
  totalCommission: number;
  source: CommissionSource;
  sourceName: string;
}

interface OverrideRow {
  user_id: string;
  service_commission_rate: number | null;
  retail_commission_rate: number | null;
  reason: string;
  is_active: boolean;
}

interface EmployeeLevelRow {
  user_id: string;
  stylist_level: string | null;
}

/**
 * Unified commission resolution hook.
 * Priority: 1) per-stylist override  2) stylist-level default  3) unassigned (0%)
 */
export function useResolveCommission() {
  const { selectedOrganization } = useOrganizationContext();
  const orgId = selectedOrganization?.id;

  const { data: levels, isLoading: levelsLoading } = useStylistLevels();

  // Fetch active, non-expired overrides for the org
  const { data: overrides, isLoading: overridesLoading } = useQuery({
    queryKey: ['commission-overrides-active', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('stylist_commission_overrides')
        .select('user_id, service_commission_rate, retail_commission_rate, reason, is_active')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`);

      if (error) throw error;
      return (data || []) as OverrideRow[];
    },
  });

  // Fetch employee → level mapping
  const { data: employeeLevels, isLoading: empLoading } = useQuery({
    queryKey: ['employee-level-mapping', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, stylist_level')
        .eq('organization_id', orgId!)
        .eq('is_active', true);

      if (error) throw error;
      return (data || []) as EmployeeLevelRow[];
    },
  });

  // Build lookup maps
  const overrideMap = useMemo(() => {
    const map = new Map<string, OverrideRow>();
    (overrides || []).forEach(o => map.set(o.user_id, o));
    return map;
  }, [overrides]);

  const levelMap = useMemo(() => {
    const map = new Map<string, StylistLevel>();
    (levels || []).forEach(l => map.set(l.slug, l));
    return map;
  }, [levels]);

  const empLevelMap = useMemo(() => {
    const map = new Map<string, string | null>();
    (employeeLevels || []).forEach(e => map.set(e.user_id, e.stylist_level));
    return map;
  }, [employeeLevels]);

  /**
   * Resolve commission for a single stylist.
   */
  const resolveCommission = (
    userId: string,
    serviceRevenue: number,
    productRevenue: number,
  ): ResolvedCommission => {
    // 1. Check per-stylist override
    const override = overrideMap.get(userId);
    if (override) {
      const sRate = override.service_commission_rate;
      const rRate = override.retail_commission_rate;
      if (sRate !== null || rRate !== null) {
        const serviceRate = sRate ?? 0;
        const retailRate = rRate ?? 0;
        return {
          serviceRate,
          retailRate,
          serviceCommission: serviceRevenue * serviceRate,
          retailCommission: productRevenue * retailRate,
          totalCommission: serviceRevenue * serviceRate + productRevenue * retailRate,
          source: 'override',
          sourceName: `Override: ${override.reason || 'Custom'}`,
        };
      }
    }

    // 2. Check stylist level default
    const levelSlug = empLevelMap.get(userId);
    if (levelSlug) {
      const level = levelMap.get(levelSlug);
      if (level && (level.service_commission_rate !== null || level.retail_commission_rate !== null)) {
        const serviceRate = level.service_commission_rate ?? 0;
        const retailRate = level.retail_commission_rate ?? 0;
        return {
          serviceRate,
          retailRate,
          serviceCommission: serviceRevenue * serviceRate,
          retailCommission: productRevenue * retailRate,
          totalCommission: serviceRevenue * serviceRate + productRevenue * retailRate,
          source: 'level',
          sourceName: `Level: ${level.label}`,
        };
      }
    }

    // 3. Unassigned — no level, no override → 0% (enforces "define before payout")
    return {
      serviceRate: 0,
      retailRate: 0,
      serviceCommission: 0,
      retailCommission: 0,
      totalCommission: 0,
      source: 'unassigned',
      sourceName: 'Unassigned',
    };
  };

  /**
   * Legacy-compatible wrapper that matches the old calculateCommission signature
   * but resolves per-user. For components that still use flat calculation.
   */
  const resolveForUser = (userId: string) => (serviceRevenue: number, productRevenue: number) => {
    const resolved = resolveCommission(userId, serviceRevenue, productRevenue);
    return {
      serviceCommission: resolved.serviceCommission,
      productCommission: resolved.retailCommission,
      totalCommission: resolved.totalCommission,
      tierName: resolved.sourceName,
      source: resolved.source,
      sourceName: resolved.sourceName,
    };
  };

  const isLoading = levelsLoading || overridesLoading || empLoading;

  return {
    resolveCommission,
    resolveForUser,
    isLoading,
  };
}
