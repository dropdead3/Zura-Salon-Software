import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStylistLevels, StylistLevel } from './useStylistLevels';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useUserPlanMap } from './useCompensationPlans';
import {
  resolveCommissionForPlan,
  type ResolveContext,
} from '@/lib/compensation/resolve-plan';

/**
 * Doctrine: This is the canonical commission entrypoint. Resolution priority:
 *  1) per-stylist override
 *  2) assigned compensation plan (delegates to resolveCommissionForPlan)
 *      — except for `level_based` plans which fall through to the legacy
 *        level/location-override path so existing tier UX stays intact.
 *  3) location commission override
 *  4) stylist-level default
 *  5) unassigned (0%)
 */
export type CommissionSource =
  | 'override'
  | 'location_override'
  | 'level'
  | 'plan'
  | 'unassigned';

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
  location_id: string | null;
}

interface LocationCommissionOverride {
  stylist_level_id: string;
  location_id: string | null;
  service_commission_rate: number | null;
  retail_commission_rate: number | null;
}

/**
 * Unified commission resolution hook.
 * Priority: 1) per-stylist override  2) location commission override  3) stylist-level default  4) unassigned (0%)
 */
export function useResolveCommission() {
  const { selectedOrganization } = useOrganizationContext();
  const orgId = selectedOrganization?.id;

  const { data: levels, isLoading: levelsLoading } = useStylistLevels();
  const { map: planMap, isLoading: planMapLoading } = useUserPlanMap();

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

  // Fetch employee → level + location mapping
  const { data: employeeLevels, isLoading: empLoading } = useQuery({
    queryKey: ['employee-level-mapping', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, stylist_level, location_id')
        .eq('organization_id', orgId!)
        .eq('is_active', true);

      if (error) throw error;
      return (data || []) as EmployeeLevelRow[];
    },
  });

  // Fetch location commission overrides
  const { data: locationOverrides, isLoading: locOverridesLoading } = useQuery({
    queryKey: ['level-commission-overrides-resolve', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('level_commission_overrides')
        .select('stylist_level_id, location_id, service_commission_rate, retail_commission_rate')
        .eq('organization_id', orgId!);

      if (error) throw error;
      return (data || []) as LocationCommissionOverride[];
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

  const levelIdMap = useMemo(() => {
    const map = new Map<string, StylistLevel>();
    (levels || []).forEach(l => map.set(l.id, l));
    return map;
  }, [levels]);

  const empLevelMap = useMemo(() => {
    const map = new Map<string, { level: string | null; locationId: string | null }>();
    (employeeLevels || []).forEach(e => map.set(e.user_id, { level: e.stylist_level, locationId: e.location_id }));
    return map;
  }, [employeeLevels]);

  // Location override map: key = `${levelId}:${locationId}`
  const locOverrideMap = useMemo(() => {
    const map = new Map<string, LocationCommissionOverride>();
    (locationOverrides || []).forEach(o => {
      if (o.location_id) {
        map.set(`${o.stylist_level_id}:${o.location_id}`, o);
      }
    });
    return map;
  }, [locationOverrides]);

  /**
   * Resolve commission for a single stylist.
   * Optionally pass locationId to check location-specific overrides.
   */
  const resolveCommission = (
    userId: string,
    serviceRevenue: number,
    productRevenue: number,
    locationId?: string | null,
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

    // 1.5. Compensation plan (non-level types delegate to plan resolver)
    const assignedPlan = planMap.get(userId);
    if (assignedPlan && assignedPlan.plan_type !== 'level_based') {
      const ctx: ResolveContext = {
        serviceRevenue,
        productRevenue,
        periodToDateServiceSales: serviceRevenue,
      };
      const r = resolveCommissionForPlan(assignedPlan, ctx);
      return {
        serviceRate: r.serviceRate,
        retailRate: r.retailRate,
        serviceCommission: r.serviceCommission,
        retailCommission: r.retailCommission,
        totalCommission: r.totalCommission,
        source: 'plan',
        sourceName: r.sourceName,
      };
    }

    const empInfo = empLevelMap.get(userId);
    const levelSlug = empInfo?.level;
    const effectiveLocationId = locationId ?? empInfo?.locationId;

    if (levelSlug) {
      const level = levelMap.get(levelSlug);

      // 2. Check location commission override
      if (level && effectiveLocationId) {
        const locOverride = locOverrideMap.get(`${level.id}:${effectiveLocationId}`);
        if (locOverride && (locOverride.service_commission_rate !== null || locOverride.retail_commission_rate !== null)) {
          const serviceRate = locOverride.service_commission_rate ?? level.service_commission_rate ?? 0;
          const retailRate = locOverride.retail_commission_rate ?? level.retail_commission_rate ?? 0;
          return {
            serviceRate,
            retailRate,
            serviceCommission: serviceRevenue * serviceRate,
            retailCommission: productRevenue * retailRate,
            totalCommission: serviceRevenue * serviceRate + productRevenue * retailRate,
            source: 'location_override',
            sourceName: `Location Override: ${level.label}`,
          };
        }
      }

      // 3. Check stylist level default
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

    // 4. Unassigned — no level, no override → 0% (enforces "define before payout")
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
  const resolveForUser = (userId: string, locationId?: string | null) => (serviceRevenue: number, productRevenue: number) => {
    const resolved = resolveCommission(userId, serviceRevenue, productRevenue, locationId);
    return {
      serviceCommission: resolved.serviceCommission,
      productCommission: resolved.retailCommission,
      totalCommission: resolved.totalCommission,
      tierName: resolved.sourceName,
      source: resolved.source,
      sourceName: resolved.sourceName,
    };
  };

  const isLoading = levelsLoading || overridesLoading || empLoading || locOverridesLoading || planMapLoading;

  return {
    resolveCommission,
    resolveForUser,
    isLoading,
  };
}
