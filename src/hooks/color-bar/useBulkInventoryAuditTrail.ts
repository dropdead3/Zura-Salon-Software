/**
 * useBulkInventoryAuditTrail — Fetches audit trail across ALL products
 * for an organization. Supports filters, search, and pagination.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBackroomOrgId } from './useBackroomOrgId';

export interface BulkAuditEntry {
  id: string;
  type: 'stock' | 'setting';
  created_at: string;
  changed_by: string | null;
  changed_by_name: string | null;
  quantity_change: number | null;
  quantity_after: number | null;
  field: string;
  old_value: number | null;
  notes: string | null;
  product_id: string;
  product_name: string;
}

export interface BulkAuditFilters {
  typeFilter?: 'stock' | 'setting' | 'all';
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useBulkInventoryAuditTrail(filters?: BulkAuditFilters) {
  const orgId = useBackroomOrgId();
  const typeFilter = filters?.typeFilter ?? 'all';
  const page = filters?.page ?? 0;
  const pageSize = filters?.pageSize ?? 50;
  const search = filters?.search?.toLowerCase().trim() || '';

  return useQuery({
    queryKey: ['bulk-inventory-audit', orgId, typeFilter, filters?.dateFrom?.toISOString(), filters?.dateTo?.toISOString(), search, page, pageSize],
    queryFn: async (): Promise<{ entries: BulkAuditEntry[]; hasMore: boolean }> => {
      const fetchStock = typeFilter === 'all' || typeFilter === 'stock';
      const fetchSettings = typeFilter === 'all' || typeFilter === 'setting';
      // Fetch extra to detect hasMore
      const fetchLimit = pageSize + 1;

      const [movementsRes, settingsRes] = await Promise.all([
        fetchStock
          ? (() => {
              let q = supabase
                .from('stock_movements')
                .select('id, created_at, created_by, quantity_change, quantity_after, event_type, reason, notes, product_id, products:product_id(name)')
                .eq('organization_id', orgId!)
                .order('created_at', { ascending: false })
                .limit(500);
              if (filters?.dateFrom) q = q.gte('created_at', filters.dateFrom.toISOString());
              if (filters?.dateTo) q = q.lte('created_at', filters.dateTo.toISOString());
              return q;
            })()
          : Promise.resolve({ data: [], error: null }),
        fetchSettings
          ? (() => {
              let q = supabase
                .from('inventory_settings_audit' as any)
                .select('id, created_at, changed_by, field_name, old_value, new_value, product_id')
                .eq('organization_id', orgId!)
                .order('created_at', { ascending: false })
                .limit(500);
              if (filters?.dateFrom) q = q.gte('created_at', filters.dateFrom.toISOString());
              if (filters?.dateTo) q = q.lte('created_at', filters.dateTo.toISOString());
              return q;
            })()
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (movementsRes.error) throw movementsRes.error;
      if (settingsRes.error) throw settingsRes.error;

      // Collect user IDs and product IDs for settings (no join)
      const userIds = new Set<string>();
      const settingsProductIds = new Set<string>();
      (movementsRes.data || []).forEach((m: any) => m.created_by && userIds.add(m.created_by));
      (settingsRes.data || []).forEach((s: any) => {
        s.changed_by && userIds.add(s.changed_by);
        s.product_id && settingsProductIds.add(s.product_id);
      });

      // Resolve names and product names in parallel
      const [nameMap, productNameMap] = await Promise.all([
        (async () => {
          const map = new Map<string, string>();
          if (userIds.size > 0) {
            const { data: profiles } = await supabase
              .from('employee_profiles')
              .select('user_id, display_name, full_name')
              .in('user_id', Array.from(userIds));
            (profiles || []).forEach((p: any) => {
              map.set(p.user_id, p.display_name || p.full_name || 'Unknown');
            });
          }
          return map;
        })(),
        (async () => {
          const map = new Map<string, string>();
          if (settingsProductIds.size > 0) {
            const { data: products } = await supabase
              .from('products')
              .select('id, name')
              .in('id', Array.from(settingsProductIds));
            (products || []).forEach((p: any) => map.set(p.id, p.name));
          }
          return map;
        })(),
      ]);

      const stockEntries: BulkAuditEntry[] = (movementsRes.data || []).map((m: any) => ({
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
        product_id: m.product_id,
        product_name: (m.products as any)?.name ?? 'Unknown',
      }));

      const settingEntries: BulkAuditEntry[] = (settingsRes.data || []).map((s: any) => ({
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
        product_id: s.product_id,
        product_name: productNameMap.get(s.product_id) ?? 'Unknown',
      }));

      let merged = [...stockEntries, ...settingEntries]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Apply search filter client-side
      if (search) {
        merged = merged.filter(e =>
          e.product_name.toLowerCase().includes(search) ||
          e.field.toLowerCase().includes(search) ||
          (e.changed_by_name?.toLowerCase().includes(search)) ||
          (e.notes?.toLowerCase().includes(search))
        );
      }

      // Paginate
      const start = page * pageSize;
      const sliced = merged.slice(start, start + fetchLimit);
      const hasMore = sliced.length > pageSize;

      return {
        entries: sliced.slice(0, pageSize),
        hasMore,
      };
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
