import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, addDays, format } from 'date-fns';

export interface HealthClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  last_visit: string | null;
  first_visit: string | null;
  total_spend: number;
  visit_count: number;
  preferred_stylist_id: string | null;
  days_inactive: number;
  phorest_client_id: string;
}

export type SegmentKey = 
  | 'needs-rebooking' 
  | 'at-risk' 
  | 'win-back' 
  | 'new-no-return' 
  | 'birthday' 
  | 'high-value-quiet';

export interface SegmentConfig {
  key: SegmentKey;
  label: string;
  description: string;
  icon: string;
}

export const SEGMENTS: SegmentConfig[] = [
  { key: 'needs-rebooking', label: 'Needs Rebooking', description: 'Last appointment with no future booking', icon: 'CalendarX' },
  { key: 'at-risk', label: 'At-Risk / Lapsing', description: 'Inactive for 60+ days', icon: 'AlertTriangle' },
  { key: 'win-back', label: 'Win-Back Candidates', description: 'Inactive for 90+ days', icon: 'UserX' },
  { key: 'new-no-return', label: 'New Clients (No Return)', description: 'First-time visitors who never rebooked', icon: 'UserPlus' },
  { key: 'birthday', label: 'Birthday Outreach', description: 'Upcoming birthdays in next 30 days', icon: 'Cake' },
  { key: 'high-value-quiet', label: 'High-Value Quiet', description: 'Top spenders who have gone quiet', icon: 'TrendingDown' },
];

export function useClientHealthSegments() {
  return useQuery({
    queryKey: ['client-health-segments'],
    queryFn: async () => {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      // Fetch all clients
      const { data: clients, error: clientsError } = await supabase
        .from('phorest_clients')
        .select('id, name, email, phone, last_visit, first_visit, total_spend, visit_count, preferred_stylist_id, phorest_client_id')
        .eq('is_duplicate', false)
        .order('name');

      if (clientsError) throw clientsError;
      if (!clients) return emptyResult();

      // Fetch recent appointments to check for future bookings
      const { data: futureAppts } = await supabase
        .from('phorest_appointments')
        .select('phorest_client_id')
        .gte('appointment_date', todayStr)
        .neq('status', 'cancelled');

      const clientsWithFutureBooking = new Set(
        (futureAppts || []).map(a => a.phorest_client_id).filter(Boolean)
      );

      // Enrich clients with days_inactive
      const enriched: HealthClient[] = clients.map(c => ({
        ...c,
        days_inactive: c.last_visit ? differenceInDays(today, new Date(c.last_visit)) : 999,
      }));

      // Segment: Needs Rebooking - last visit 14-59 days ago, no future booking
      const needsRebooking = enriched.filter(c =>
        c.days_inactive >= 14 && c.days_inactive < 60 &&
        !clientsWithFutureBooking.has(c.phorest_client_id)
      );

      // Segment: At-Risk - inactive 60-89 days
      const atRisk = enriched.filter(c =>
        c.days_inactive >= 60 && c.days_inactive < 90
      );

      // Segment: Win-Back - inactive 90+ days
      const winBack = enriched.filter(c =>
        c.days_inactive >= 90 && c.last_visit !== null
      );

      // Segment: New No Return - visit_count === 1 and 14+ days since visit, no future booking
      const newNoReturn = enriched.filter(c =>
        c.visit_count === 1 &&
        c.days_inactive >= 14 &&
        !clientsWithFutureBooking.has(c.phorest_client_id)
      );

      // Segment: Birthday - upcoming birthdays
      // We don't have birthday on phorest_clients, so this will be empty for now
      // Could be extended if birthday column is added
      const birthday: HealthClient[] = [];

      // Segment: High-Value Quiet - top 20% spenders who are 30+ days inactive
      const sortedBySpend = [...enriched].sort((a, b) => b.total_spend - a.total_spend);
      const top20Threshold = sortedBySpend[Math.floor(sortedBySpend.length * 0.2)]?.total_spend || 0;
      const highValueQuiet = enriched.filter(c =>
        c.total_spend >= top20Threshold &&
        c.total_spend > 0 &&
        c.days_inactive >= 30 &&
        !clientsWithFutureBooking.has(c.phorest_client_id)
      );

      return {
        'needs-rebooking': needsRebooking,
        'at-risk': atRisk,
        'win-back': winBack,
        'new-no-return': newNoReturn,
        'birthday': birthday,
        'high-value-quiet': highValueQuiet,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}

function emptyResult(): Record<SegmentKey, HealthClient[]> {
  return {
    'needs-rebooking': [],
    'at-risk': [],
    'win-back': [],
    'new-no-return': [],
    'birthday': [],
    'high-value-quiet': [],
  };
}
