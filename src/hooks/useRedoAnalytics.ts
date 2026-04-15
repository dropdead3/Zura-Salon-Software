import { useQuery } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { subDays, format } from 'date-fns';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

export interface RedoByStylists {
  staffUserId: string;
  staffName: string;
  redoCount: number;
  totalCount: number;
  redoRate: number;
}

export interface RedoByReason {
  reason: string;
  count: number;
}

export interface RedoAnalytics {
  totalRedos: number;
  totalAppointments: number;
  redoRate: number;
  financialImpact: number;
  commissionImpact: number;
  byStylist: RedoByStylists[];
  byReason: RedoByReason[];
  weeklyTrend: number[];
  repeatRedoClients: number;
}

export function useRedoAnalytics(days: number = 30) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const dateFrom = format(subDays(new Date(), days), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['redo-analytics', orgId, days],
    queryFn: async (): Promise<RedoAnalytics> => {
      if (!orgId) return { totalRedos: 0, totalAppointments: 0, redoRate: 0, financialImpact: 0, commissionImpact: 0, byStylist: [], byReason: [], weeklyTrend: [], repeatRedoClients: 0 };

      // Get location IDs belonging to this org for filtering phorest_appointments
      const { data: orgLocations } = await supabase
        .from('locations')
        .select('id')
        .eq('organization_id', orgId);

      const locationIds = ((orgLocations || []) as any[]).map((l: any) => l.id) || [];
      if (locationIds.length === 0) {
        return { totalRedos: 0, totalAppointments: 0, redoRate: 0, financialImpact: 0, commissionImpact: 0, byStylist: [], byReason: [], weeklyTrend: [], repeatRedoClients: 0 };
      }

      // Fetch all phorest_appointments in the period, filtered by org locations
      const appointments = await fetchAllBatched<any>((from, to) =>
        supabase
          .from('v_all_appointments' as any)
          .select('id, stylist_user_id, is_redo, redo_reason, original_appointment_id, total_price, original_price, phorest_client_id, appointment_date')
          .in('location_id', locationIds)
          .gte('appointment_date', dateFrom)
          .not('status', 'in', '("cancelled")')
          .range(from, to)
      );

      // Resolve stylist names
      const stylistIds = [...new Set(appointments.map(a => a.stylist_user_id).filter(Boolean))] as string[];
      let stylistNameMap: Record<string, string> = {};
      if (stylistIds.length > 0) {
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('user_id, display_name, full_name')
          .in('user_id', stylistIds);
        for (const p of (profiles || []) as any[]) {
          stylistNameMap[p.user_id] = formatDisplayName(p.full_name || '', p.display_name);
        }
      }

      const totalAppointments = appointments.length;
      const redos = appointments.filter(a => a.is_redo);
      const totalRedos = redos.length;
      const redoRate = totalAppointments > 0 ? (totalRedos / totalAppointments) * 100 : 0;

      // Financial impact: sum of (original_price - redo_price) for redos
      let financialImpact = 0;
      for (const redo of redos) {
        const redoPrice = redo.total_price ?? 0;
        const origPrice = redo.original_price ?? redoPrice;
        financialImpact += Math.max(0, origPrice - redoPrice);
      }

      // Commission impact: estimate at ~40% avg commission rate on lost revenue
      const avgCommissionRate = 0.40;
      const commissionImpact = financialImpact * avgCommissionRate;

      // By stylist — attribute redo to the original stylist if linked, otherwise to the redo appointment's stylist
      const stylistMap = new Map<string, { name: string; redoCount: number; totalCount: number }>();
      
      // Count all appointments per stylist
      for (const a of appointments) {
        const sid = a.stylist_user_id;
        if (!sid) continue;
        if (!stylistMap.has(sid)) {
          stylistMap.set(sid, { name: stylistNameMap[sid] || 'Unknown', redoCount: 0, totalCount: 0 });
        }
        stylistMap.get(sid)!.totalCount++;
      }

      // For redos, try to attribute to original stylist
      for (const redo of redos) {
        let targetStaffId = redo.stylist_user_id;
        if (redo.original_appointment_id) {
          const original = appointments.find(a => a.id === redo.original_appointment_id);
          if (original?.stylist_user_id) {
            targetStaffId = original.stylist_user_id;
          }
        }
        if (targetStaffId && stylistMap.has(targetStaffId)) {
          stylistMap.get(targetStaffId)!.redoCount++;
        }
      }

      const byStylist: RedoByStylists[] = Array.from(stylistMap.entries())
        .filter(([, v]) => v.redoCount > 0)
        .map(([id, v]) => ({
          staffUserId: id,
          staffName: v.name,
          redoCount: v.redoCount,
          totalCount: v.totalCount,
          redoRate: v.totalCount > 0 ? (v.redoCount / v.totalCount) * 100 : 0,
        }))
        .sort((a, b) => b.redoCount - a.redoCount);

      // By reason
      const reasonMap = new Map<string, number>();
      for (const redo of redos) {
        const reason = redo.redo_reason || 'Unspecified';
        reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
      }
      const byReason: RedoByReason[] = Array.from(reasonMap.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);

      // Weekly trend (last 12 weeks)
      const weeklyTrend: number[] = [];
      const now = new Date();
      for (let w = 11; w >= 0; w--) {
        const weekStart = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
        const weekRedos = redos.filter(r => r.appointment_date >= weekStartStr && r.appointment_date < weekEndStr).length;
        weeklyTrend.push(weekRedos);
      }

      // Repeat redo clients (clients with 2+ redos)
      const clientRedoCount = new Map<string, number>();
      for (const redo of redos) {
        const cid = redo.phorest_client_id;
        if (cid) clientRedoCount.set(cid, (clientRedoCount.get(cid) || 0) + 1);
      }
      const repeatRedoClients = Array.from(clientRedoCount.values()).filter(c => c >= 2).length;

      return { totalRedos, totalAppointments, redoRate, financialImpact, commissionImpact, byStylist, byReason, weeklyTrend, repeatRedoClients };
    },
    enabled: !!orgId,
  });
}
