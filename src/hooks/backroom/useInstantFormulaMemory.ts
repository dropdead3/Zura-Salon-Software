/**
 * useInstantFormulaMemory — Surfaces the most relevant previous formula
 * when an appointment is opened. Client-centric resolution.
 */

import { useQuery } from '@tanstack/react-query';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { resolveFormulaMemory, type ResolvedFormulaMemory } from '@/lib/backroom/services/formula-resolver';

export function useInstantFormulaMemory(
  clientId: string | null | undefined,
  serviceName: string | null | undefined,
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery<ResolvedFormulaMemory | null>({
    queryKey: ['instant-formula-memory', orgId, clientId, serviceName],
    queryFn: () => resolveFormulaMemory(orgId!, clientId!, serviceName),
    enabled: !!orgId && !!clientId,
    staleTime: Infinity,
  });
}
