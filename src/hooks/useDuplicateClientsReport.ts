import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DuplicateGroup {
  matchType: string;
  matchValue: string;
  clients: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    totalSpend: number;
    visitCount: number;
    lastVisit: string | null;
  }[];
}

interface Filters {
  locationId?: string;
}

export function useDuplicateClientsReport(filters: Filters) {
  return useQuery({
    queryKey: ['duplicate-clients-report', filters],
    queryFn: async (): Promise<DuplicateGroup[]> => {
      let q = supabase
        .from('phorest_clients')
        .select('id, phorest_client_id, name, first_name, last_name, email, email_normalized, phone, phone_normalized, total_spend, visit_count, last_visit, is_duplicate, canonical_client_id')
        .eq('is_archived', false);
      if (filters.locationId) q = q.eq('location_id', filters.locationId);

      const { data, error } = await q.limit(5000);
      if (error) throw error;

      // Group by normalized email
      const emailGroups = new Map<string, typeof data>();
      const phoneGroups = new Map<string, typeof data>();

      for (const c of data || []) {
        if (c.email_normalized) {
          const group = emailGroups.get(c.email_normalized) || [];
          group.push(c);
          emailGroups.set(c.email_normalized, group);
        }
        if (c.phone_normalized) {
          const group = phoneGroups.get(c.phone_normalized) || [];
          group.push(c);
          phoneGroups.set(c.phone_normalized, group);
        }
      }

      const results: DuplicateGroup[] = [];
      const seen = new Set<string>();

      for (const [email, clients] of emailGroups) {
        if (clients.length < 2) continue;
        const key = `email:${email}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({
          matchType: 'Email',
          matchValue: email,
          clients: clients.map(c => ({
            id: c.id,
            name: c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
            email: c.email,
            phone: c.phone,
            totalSpend: Number(c.total_spend) || 0,
            visitCount: Number(c.visit_count) || 0,
            lastVisit: c.last_visit,
          })),
        });
      }

      for (const [phone, clients] of phoneGroups) {
        if (clients.length < 2) continue;
        const key = `phone:${phone}`;
        if (seen.has(key)) continue;
        seen.add(key);
        // Skip if all same clients already in an email group
        const ids = clients.map(c => c.id).sort().join(',');
        const alreadyCovered = results.some(g => g.clients.map(c => c.id).sort().join(',') === ids);
        if (alreadyCovered) continue;
        results.push({
          matchType: 'Phone',
          matchValue: phone,
          clients: clients.map(c => ({
            id: c.id,
            name: c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
            email: c.email,
            phone: c.phone,
            totalSpend: Number(c.total_spend) || 0,
            visitCount: Number(c.visit_count) || 0,
            lastVisit: c.last_visit,
          })),
        });
      }

      return results.sort((a, b) => b.clients.length - a.clients.length);
    },
    staleTime: 5 * 60_000,
  });
}
