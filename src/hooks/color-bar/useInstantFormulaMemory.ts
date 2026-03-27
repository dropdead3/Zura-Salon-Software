/**
 * useInstantFormulaMemory — Surfaces the most relevant previous formula
 * when an appointment is opened. Client-centric resolution.
 */

import { useQuery } from '@tanstack/react-query';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { resolveFormulaMemory, type ResolvedFormulaMemory } from '@/lib/color-bar/services/formula-resolver';
import { DEMO_FORMULA_MEMORY, DEMO_FORMULA_HISTORY } from '@/hooks/dock/dockDemoData';

export function useInstantFormulaMemory(
  clientId: string | null | undefined,
  serviceName: string | null | undefined,
) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery<ResolvedFormulaMemory | null>({
    queryKey: ['instant-formula-memory', orgId, clientId, serviceName],
    queryFn: () => {
      if (clientId!.startsWith('demo-')) {
        const key = `${clientId}::${serviceName ?? ''}`;
        if (DEMO_FORMULA_MEMORY[key]) return DEMO_FORMULA_MEMORY[key];
        // Fallback: reformat first formula entry as memory
        const first = DEMO_FORMULA_HISTORY[clientId!]?.[0];
        if (first) {
          return {
            lines: first.formula_data,
            source: 'client_last_visit' as const,
            sourceLabel: "Client's Last Visit",
            referenceId: first.id,
            ratio: null,
            serviceName: first.service_name,
            staffName: first.staff_name,
            notes: first.notes,
            createdAt: first.created_at,
          } satisfies ResolvedFormulaMemory;
        }
        return null;
      }
      return resolveFormulaMemory(orgId!, clientId!, serviceName);
    },
    enabled: (!!orgId || !!clientId?.startsWith('demo-')) && !!clientId,
    staleTime: Infinity,
  });
}
