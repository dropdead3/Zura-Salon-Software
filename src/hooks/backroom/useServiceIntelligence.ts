/**
 * useServiceIntelligence — React hooks for Adaptive Service Intelligence.
 * Returns service profiles and optimization insights.
 */

import { useQuery } from '@tanstack/react-query';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import {
  fetchServiceProfiles,
  generateOptimizationInsights,
} from '@/lib/backroom/services/service-intelligence-service';
import type { ServiceProfile, OptimizationInsight } from '@/lib/backroom/service-intelligence-engine';

export type { ServiceProfile, OptimizationInsight };

export function useServiceProfiles(
  startDate: string,
  endDate: string,
  locationId?: string
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['service-profiles', orgId, startDate, endDate, locationId],
    queryFn: () => fetchServiceProfiles(orgId!, startDate, endDate, locationId),
    enabled: !!orgId && !!startDate && !!endDate,
    staleTime: 5 * 60_000,
  });
}

export function useOptimizationInsights(
  startDate: string,
  endDate: string,
  locationId?: string
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['optimization-insights', orgId, startDate, endDate, locationId],
    queryFn: () => generateOptimizationInsights(orgId!, startDate, endDate, locationId),
    enabled: !!orgId && !!startDate && !!endDate,
    staleTime: 5 * 60_000,
  });
}
