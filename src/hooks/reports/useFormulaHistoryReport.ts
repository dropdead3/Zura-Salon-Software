import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface FormulaHistoryEntry {
  staffName: string;
  clientId: string;
  serviceName: string | null;
  formulaType: string | null;
  createdAt: string;
  notes: string | null;
}

export interface FormulaHistorySummary {
  totalFormulas: number;
  byType: Record<string, number>;
  byStaff: Record<string, number>;
}

interface Filters { dateFrom: string; dateTo: string; locationId?: string; }

export function useFormulaHistoryReport(filters: Filters) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['formula-history-report', orgId, filters],
    queryFn: async () => {
      const data = await fetchAllBatched<{
        staff_name: string | null;
        staff_id: string | null;
        client_id: string;
        service_name: string | null;
        formula_type: string | null;
        created_at: string;
        notes: string | null;
      }>((from, to) => {
        return supabase
          .from('client_formula_history')
          .select('staff_name, staff_id, client_id, service_name, formula_type, created_at, notes')
          .eq('organization_id', orgId!)
          .gte('created_at', filters.dateFrom)
          .lte('created_at', filters.dateTo + 'T23:59:59')
          .range(from, to);
      });

      const entries: FormulaHistoryEntry[] = (data || []).map(r => ({
        staffName: r.staff_name || 'Unknown',
        clientId: r.client_id,
        serviceName: r.service_name,
        formulaType: r.formula_type,
        createdAt: r.created_at?.split('T')[0] || '',
        notes: r.notes,
      }));

      const byType: Record<string, number> = {};
      const byStaff: Record<string, number> = {};
      for (const e of entries) {
        const t = e.formulaType || 'Other';
        byType[t] = (byType[t] || 0) + 1;
        byStaff[e.staffName] = (byStaff[e.staffName] || 0) + 1;
      }

      const summary: FormulaHistorySummary = {
        totalFormulas: entries.length,
        byType,
        byStaff,
      };

      return { entries, summary };
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
