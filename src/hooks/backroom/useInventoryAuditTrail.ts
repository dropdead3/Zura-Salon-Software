/**
 * useInventoryAuditTrail — Fetches unified audit trail for a product
 * combining stock_movements (stock changes) and inventory_settings_audit (min/max changes).
 * Supports type and date range filters.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from './useBackroomOrgId';

export interface AuditEntry {
  id: string;
  type: 'stock' | 'setting';
  created_at: string;
  changed_by: string | null;
  changed_by_name: string | null;
  /** For stock: quantity_change; for setting: null */
  quantity_change: number | null;
  /** For stock: quantity_after; for setting: new_value */
  quantity_after: number | null;
  /** For stock: event_type/reason; for setting: field_name */
  field: string;
  /** For setting: old_value */
  old_value: number | null;
  notes: string | null;
}

export interface AuditFilters {
  typeFilter?: 'stock' | 'setting' | 'all';
  dateFrom?: Date;
  dateTo?: Date;
}

export function useInventoryAuditTrail(productId: string | null, limit = 50, filters?: AuditFilters) {
  const orgId = useBackroomOrgId();
  const typeFilter = filters?.typeFilter ?? 'all';

  return useQuery({
    queryKey: ['inventory-audit-trail', orgId, productId, limit, typeFilter, filters?.dateFrom?.toISOString(), filters?.dateTo?.toISOString()],
    queryFn: async (): Promise<AuditEntry[]> => {
      const fetchStock = typeFilter === 'all' || typeFilter === 'stock';
      const fetchSettings = typeFilter === 'all' || typeFilter === 'setting';

      const promises: [Promise<any>, Promise<any>] = [
        fetchStock
          ? (() => {
              let q = supabase
                .from('stock_movements')
                .select('id, created_at, created_by, quantity_change, quantity_after, event_type, reason, notes')
                .eq('organization_id', orgId!)
                .eq('product_id', productId!)
                .order('created_at', { ascending: false })
                .limit(limit);
              if (filters?.dateFrom) q = q.gte('created_at', filters.dateFrom.toISOString());
              if (filters?.dateTo) q = q.lte('created_at', filters.dateTo.toISOString());
              return q;
            })()
          : Promise.resolve({ data: [], error: null }),
        fetchSettings
          ? (() => {
              let q = supabase
                .from('inventory_settings_audit' as any)
                .select('id, created_at, changed_by, field_name, old_value, new_value')
                .eq('organization_id', orgId!)
                .eq('product_id', productId!)
                .order('created_at', { ascending: false })
                .limit(limit);
              if (filters?.dateFrom) q = q.gte('created_at', filters.dateFrom.toISOString());
              if (filters?.dateTo) q = q.lte('created_at', filters.dateTo.toISOString());
              return q;
            })()
          : Promise.resolve({ data: [], error: null }),
      ];

      const [movementsRes, settingsRes] = await Promise.all(promises);

      if (movementsRes.error) throw movementsRes.error;
      if (settingsRes.error) throw settingsRes.error;

      // Collect user IDs for name resolution
      const userIds = new Set<string>();
      (movementsRes.data || []).forEach((m: any) => m.created_by && userIds.add(m.created_by));
      (settingsRes.data || []).forEach((s: any) => s.changed_by && userIds.add(s.changed_by));

      const nameMap = new Map<string, string>();
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('user_id, display_name, full_name')
          .in('user_id', Array.from(userIds));
        (profiles || []).forEach((p: any) => {
          nameMap.set(p.user_id, p.display_name || p.full_name || 'Unknown');
        });
      }

      const stockEntries: AuditEntry[] = (movementsRes.data || []).map((m: any) => ({
        id: m.id,
        type: 'stock' as const,
        created_at: m.created_at,
        changed_by: m.created_by,
        changed_by_name: m.created_by ? nameMap.get(m.created_by) ?? null : null,
        quantity_change: m.quantity_change,
        quantity_after: m.quantity_after,
        field: m.event_type || m.reason || 'adjustment',
        old_value: null,
        notes: m.notes,
      }));

      const settingEntries: AuditEntry[] = (settingsRes.data || []).map((s: any) => ({
        id: s.id,
        type: 'setting' as const,
        created_at: s.created_at,
        changed_by: s.changed_by,
        changed_by_name: s.changed_by ? nameMap.get(s.changed_by) ?? null : null,
        quantity_change: null,
        quantity_after: s.new_value,
        field: s.field_name,
        old_value: s.old_value,
        notes: null,
      }));

      return [...stockEntries, ...settingEntries]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
    },
    enabled: !!orgId && !!productId,
    staleTime: 30_000,
  });
}
