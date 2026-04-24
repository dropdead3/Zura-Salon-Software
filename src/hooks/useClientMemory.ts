/**
 * useClientMemory — Unified hook for the Client Memory Panel.
 * Composes existing hooks to surface last formula, notes, retail, and processing time.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useInstantFormulaMemory } from '@/hooks/color-bar/useInstantFormulaMemory';
import { useClientVisitHistory } from '@/hooks/useClientVisitHistory';
import { groupClientVisits } from '@/lib/client-visit-grouping';

export interface ClientMemoryData {
  lastFormula: {
    lines: { product_name: string; weight_g: number }[];
    serviceName: string | null;
    date: string | null;
  } | null;
  lastNotes: string | null;
  lastRetailPurchase: string | null;
  lastProcessingTimeMinutes: number | null;
  visitCount: number;
  isFirstVisit: boolean;
}

export function useClientMemory(
  clientId: string | null | undefined,
  serviceName: string | null | undefined,
  orgId: string | null | undefined,
) {
  const { data: formulaMemory, isLoading: formulaLoading } = useInstantFormulaMemory(clientId, serviceName);
  const { data: visits = [], isLoading: visitsLoading } = useClientVisitHistory(clientId);

  // Last notes from most recent completed visit
  const lastVisit = visits.find(v => v.status === 'completed');
  const lastNotes = lastVisit?.notes || null;

  // Processing time from most recent visit
  const lastProcessingTimeMinutes = (() => {
    if (!lastVisit) return null;
    try {
      const [sh, sm] = lastVisit.start_time.split(':').map(Number);
      const [eh, em] = lastVisit.end_time.split(':').map(Number);
      const mins = (eh * 60 + em) - (sh * 60 + sm);
      return mins > 0 ? mins : null;
    } catch {
      return null;
    }
  })();

  // Last formula
  const lastFormula = formulaMemory ? {
    lines: (formulaMemory as any).lines || [],
    serviceName: (formulaMemory as any).serviceName || null,
    date: (formulaMemory as any).date || null,
  } : null;

  // Retail purchase query (from checkout_usage_charges or product usage)
  const { data: lastRetail, isLoading: retailLoading } = useQuery({
    queryKey: ['client-last-retail', clientId],
    queryFn: async () => {
      // Try to get last retail from appointments with retail notes
      const completedVisits = visits.filter(v => v.status === 'completed');
      // Look for retail mentions in notes (simplified — real implementation would query retail transactions)
      for (const v of completedVisits) {
        if (v.notes && /retail|purchase|product|shampoo|conditioner|mask|treatment/i.test(v.notes)) {
          return v.notes;
        }
      }
      return null;
    },
    enabled: !!clientId && visits.length > 0,
    staleTime: Infinity,
  });

  const isLoading = formulaLoading || visitsLoading;

  // Visit-level (not service-row-level) counts so contiguous services rendered
  // as one Phorest "appointment" only count once. Mirrors the schedule grouping
  // doctrine so frequency metrics stay truthful across surfaces.
  const completedVisitCount = groupClientVisits(
    visits.filter((v) => v.status === 'completed'),
  ).length;

  const data: ClientMemoryData = {
    lastFormula,
    lastNotes,
    lastRetailPurchase: lastRetail || null,
    lastProcessingTimeMinutes,
    visitCount: completedVisitCount,
    isFirstVisit: completedVisitCount === 0,
  };

  return { data, isLoading };
}
