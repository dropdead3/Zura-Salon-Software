import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, format } from 'date-fns';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

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
  | 'high-value-quiet'
  | 'dispute-risk';

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
  { key: 'dispute-risk', label: 'Dispute Risk', description: 'Clients with open or multiple payment disputes', icon: 'AlertTriangle' },
];

export function useClientHealthSegments() {
  return useQuery({
    queryKey: ['client-health-segments'],
    queryFn: async () => {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      // Fetch from Zura-owned clients table (primary)
      const zuraClients: HealthClient[] = [];
      {
        let offset = 0;
        const PAGE_SIZE = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from('clients')
            .select('id, first_name, last_name, email, phone, mobile, last_visit_date, first_visit, client_since, total_spend, visit_count, preferred_stylist_id, phorest_client_id, birthday')
            .eq('status', 'active')
            .eq('is_placeholder', false)
            .range(offset, offset + PAGE_SIZE - 1)
            .order('first_name');
          if (error) break; // Fall through to phorest
          (data || []).forEach((c: any) => {
            zuraClients.push({
              id: c.id,
              name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
              email: c.email,
              phone: c.phone || c.mobile,
              last_visit: c.last_visit_date,
              first_visit: c.first_visit || c.client_since,
              total_spend: Number(c.total_spend) || 0,
              visit_count: c.visit_count || 0,
              preferred_stylist_id: c.preferred_stylist_id,
              days_inactive: c.last_visit_date ? differenceInDays(today, new Date(c.last_visit_date)) : 999,
              phorest_client_id: c.phorest_client_id || c.id,
            });
          });
          hasMore = (data?.length || 0) === PAGE_SIZE;
          offset += PAGE_SIZE;
        }
      }

      // Fetch from phorest_clients (fallback/supplement)
      const phorestClients: HealthClient[] = [];
      {
        let offset = 0;
        const PAGE_SIZE = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from('phorest_clients')
            .select('id, name, email, phone, last_visit, first_visit, total_spend, visit_count, preferred_stylist_id, phorest_client_id')
            .eq('is_duplicate', false)
            .range(offset, offset + PAGE_SIZE - 1)
            .order('name');
          if (error) break;
          (data || []).forEach((c: any) => {
            phorestClients.push({
              ...c,
              total_spend: Number(c.total_spend) || 0,
              visit_count: c.visit_count || 0,
              days_inactive: c.last_visit ? differenceInDays(today, new Date(c.last_visit)) : 999,
            });
          });
          hasMore = (data?.length || 0) === PAGE_SIZE;
          offset += PAGE_SIZE;
        }
      }

      // Merge: use Zura clients as primary, add phorest clients not already present
      const seenPhorestIds = new Set(zuraClients.map(c => c.phorest_client_id).filter(Boolean));
      const mergedClients = [
        ...zuraClients,
        ...phorestClients.filter(c => !seenPhorestIds.has(c.phorest_client_id)),
      ];

      if (mergedClients.length === 0) return emptyResult();

      // Fetch recent appointments to check for future bookings
      const futureAppts = await fetchAllBatched<any>((from, to) =>
        supabase
          .from('phorest_appointments')
          .select('phorest_client_id')
          .gte('appointment_date', todayStr)
          .neq('status', 'cancelled')
          .range(from, to)
      );

      // Also check Zura appointments
      const zuraFutureAppts = await fetchAllBatched<any>((from, to) =>
        supabase
          .from('appointments')
          .select('client_id')
          .gte('appointment_date', todayStr)
          .neq('status', 'cancelled')
          .range(from, to)
      );

      const clientsWithFutureBooking = new Set([
        ...futureAppts.map(a => a.phorest_client_id).filter(Boolean),
        ...zuraFutureAppts.map(a => a.client_id).filter(Boolean),
      ]);

      const enriched = mergedClients;

      // Segment: Needs Rebooking
      const needsRebooking = enriched.filter(c =>
        c.days_inactive >= 14 && c.days_inactive < 60 &&
        !clientsWithFutureBooking.has(c.phorest_client_id) &&
        !clientsWithFutureBooking.has(c.id)
      );

      // Segment: At-Risk
      const atRisk = enriched.filter(c =>
        c.days_inactive >= 60 && c.days_inactive < 90
      );

      // Segment: Win-Back
      const winBack = enriched.filter(c =>
        c.days_inactive >= 90 && c.last_visit !== null
      );

      // Segment: New No Return
      const newNoReturn = enriched.filter(c =>
        c.visit_count === 1 &&
        c.days_inactive >= 14 &&
        !clientsWithFutureBooking.has(c.phorest_client_id) &&
        !clientsWithFutureBooking.has(c.id)
      );

      // Segment: Birthday (available from Zura clients table)
      const birthday: HealthClient[] = [];

      // Segment: High-Value Quiet
      const sortedBySpend = [...enriched].sort((a, b) => b.total_spend - a.total_spend);
      const top20Threshold = sortedBySpend[Math.floor(sortedBySpend.length * 0.2)]?.total_spend || 0;
      const highValueQuiet = enriched.filter(c =>
        c.total_spend >= top20Threshold &&
        c.total_spend > 0 &&
        c.days_inactive >= 30 &&
        !clientsWithFutureBooking.has(c.phorest_client_id) &&
        !clientsWithFutureBooking.has(c.id)
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
