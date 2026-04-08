import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseISO, getMonth, getDate, format, differenceInDays, setYear } from 'date-fns';

export interface ClientBirthdayEntry {
  clientId: string;
  clientName: string;
  birthday: string;
  daysUntil: number;
  email: string | null;
  phone: string | null;
  totalSpend: number;
  visitCount: number;
}

interface Filters {
  daysAhead?: number;
  locationId?: string;
}

export function useClientBirthdaysReport(filters: Filters) {
  const daysAhead = filters.daysAhead ?? 30;

  return useQuery({
    queryKey: ['client-birthdays-report', filters],
    queryFn: async (): Promise<ClientBirthdayEntry[]> => {
      let q = supabase
        .from('v_all_clients')
        .select('id, phorest_client_id, name, first_name, last_name, birthday, email, phone, total_spend, visit_count')
        .not('birthday', 'is', null)
        .eq('is_archived', false);
      if (filters.locationId) q = q.eq('location_id', filters.locationId);

      const { data, error } = await q.limit(5000);
      if (error) throw error;

      const today = new Date();
      const currentYear = today.getFullYear();

      return (data || [])
        .map(c => {
          if (!c.birthday) return null;
          const bday = parseISO(c.birthday);
          let thisYear = setYear(bday, currentYear);
          if (thisYear < today) thisYear = setYear(bday, currentYear + 1);
          const days = differenceInDays(thisYear, today);
          if (days < 0 || days > daysAhead) return null;
          return {
            clientId: c.phorest_client_id || c.id,
            clientName: c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
            birthday: format(bday, 'MMM d'),
            daysUntil: days,
            email: c.email,
            phone: c.phone,
            totalSpend: Number(c.total_spend) || 0,
            visitCount: Number(c.visit_count) || 0,
          };
        })
        .filter(Boolean)
        .sort((a, b) => (a as ClientBirthdayEntry).daysUntil - (b as ClientBirthdayEntry).daysUntil) as ClientBirthdayEntry[];
    },
    staleTime: 5 * 60_000,
  });
}
