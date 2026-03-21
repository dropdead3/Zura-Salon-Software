import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export interface StylistBreakdown {
  staffId: string;
  staffName: string;
  bookings: number;
  totalRevenue: number;
  totalDurationMin: number;
  revPerHour: number;
  revShare: number; // % of this service's revenue from this stylist
}

export interface ServiceEfficiencyRow {
  serviceName: string;
  category: string;
  avgDuration: number; // minutes
  avgRevenue: number;
  revPerHour: number;
  bookings: number;
  totalRevenue: number;
  menuPrice: number | null;
  realizationRate: number | null; // actual / menu * 100
  newClientPct: number;
  rebookRate: number;
  avgTipPct: number;
  stylistBreakdown: StylistBreakdown[];
  concentrationRisk: boolean; // true if top stylist > 70% of service revenue
  dayDistribution: number[]; // 7 values, index 0=Mon..6=Sun
  peakHour: string; // e.g. "Tue & Thu afternoons"
}

export interface ServiceEfficiencyData {
  services: ServiceEfficiencyRow[];
  avgRevPerHour: number;
  totalServiceRevenue: number;
  activeServiceCount: number;
  avgServiceTicket: number;
  totalBookedHours: number;
  overallRevPerHour: number;
}

export function useServiceEfficiency(
  dateFrom: string,
  dateTo: string,
  locationId?: string
) {
  // Fetch staff name mapping
  const staffQuery = useQuery({
    queryKey: ['staff-name-mapping'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_staff_mapping')
        .select('phorest_staff_id, user_id, employee_profiles(display_name, full_name)');
      if (error) throw error;
      const map = new Map<string, string>();
      for (const s of data || []) {
        const ep = s.employee_profiles as any;
        const name = ep?.display_name || ep?.full_name || s.phorest_staff_id;
        map.set(s.phorest_staff_id, name);
      }
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch appointment aggregates with pagination to avoid 1000-row limit
  const appointmentsQuery = useQuery({
    queryKey: ['service-efficiency-appointments', dateFrom, dateTo, locationId],
    queryFn: async () => {
      const allData: any[] = [];
      const PAGE_SIZE = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('phorest_appointments')
          .select('service_name, total_price, start_time, end_time, appointment_date, is_new_client, rebooked_at_checkout, tip_amount, phorest_staff_id')
          .neq('status', 'cancelled')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .range(offset, offset + PAGE_SIZE - 1);

        if (locationId) {
          query = query.eq('location_id', locationId);
        }

        const { data, error } = await query;
        if (error) throw error;
        allData.push(...(data || []));
        hasMore = (data?.length || 0) === PAGE_SIZE;
        offset += PAGE_SIZE;
      }

      return allData;
    },
  });

  // Fetch phorest_services for menu price and duration
  const servicesQuery = useQuery({
    queryKey: ['service-efficiency-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_services')
        .select('name, category, duration_minutes, price')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  const result = useMemo<ServiceEfficiencyData | undefined>(() => {
    if (!appointmentsQuery.data) return undefined;
    const staffNames = staffQuery.data || new Map<string, string>();

    const appointments = appointmentsQuery.data;
    const catalog = servicesQuery.data || [];

    // Build catalog lookup by name
    const catalogMap = new Map<string, { category: string; duration: number; price: number | null }>();
    for (const s of catalog) {
      if (s.name && !catalogMap.has(s.name)) {
        catalogMap.set(s.name, {
          category: s.category || 'Other',
          duration: s.duration_minutes || 0,
          price: s.price,
        });
      }
    }

    // Aggregate by service_name
    const agg = new Map<string, {
      totalRevenue: number; count: number; totalDurationMin: number;
      newClients: number; rebooked: number; totalTips: number;
      stylistMap: Map<string, { rev: number; dur: number; count: number }>;
      dayMap: Map<number, number>; // 0=Mon..6=Sun
      slotMap: Map<string, number>; // 'morning'|'afternoon'|'evening'
    }>();
    let overallRevenue = 0;
    let overallDurationMin = 0;

    for (const a of appointments) {
      if (!a.service_name) continue;
      const rev = Number(a.total_price) || 0;
      
      // Calculate duration from start/end time or catalog
      let durationMin = 0;
      if (a.start_time && a.end_time) {
        const [sh, sm] = a.start_time.split(':').map(Number);
        const [eh, em] = a.end_time.split(':').map(Number);
        durationMin = (eh * 60 + em) - (sh * 60 + sm);
        if (durationMin <= 0) durationMin = 0;
      }
      if (durationMin === 0) {
        durationMin = catalogMap.get(a.service_name)?.duration || 0;
      }

      const existing = agg.get(a.service_name) || {
        totalRevenue: 0, count: 0, totalDurationMin: 0,
        newClients: 0, rebooked: 0, totalTips: 0,
        stylistMap: new Map(),
        dayMap: new Map(),
        slotMap: new Map(),
      };
      existing.totalRevenue += rev;
      existing.count += 1;
      existing.totalDurationMin += durationMin;
      if (a.is_new_client) existing.newClients += 1;
      if (a.rebooked_at_checkout) existing.rebooked += 1;
      existing.totalTips += Number(a.tip_amount) || 0;

      // Day-of-week tracking (0=Mon..6=Sun)
      if (a.appointment_date) {
        const d = new Date(a.appointment_date);
        const jsDay = d.getUTCDay(); // 0=Sun
        const monDay = jsDay === 0 ? 6 : jsDay - 1; // convert to 0=Mon
        existing.dayMap.set(monDay, (existing.dayMap.get(monDay) || 0) + 1);
      }

      // Time slot tracking
      if (a.start_time) {
        const hour = parseInt(a.start_time.split(':')[0], 10);
        const slot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
        existing.slotMap.set(slot, (existing.slotMap.get(slot) || 0) + 1);
      }

      // Stylist tracking
      const staffId = a.phorest_staff_id || 'unknown';
      const stylistEntry = existing.stylistMap.get(staffId) || { rev: 0, dur: 0, count: 0 };
      stylistEntry.rev += rev;
      stylistEntry.dur += durationMin;
      stylistEntry.count += 1;
      existing.stylistMap.set(staffId, stylistEntry);

      agg.set(a.service_name, existing);

      overallRevenue += rev;
      overallDurationMin += durationMin;
    }

    const services: ServiceEfficiencyRow[] = [];
    for (const [name, data] of agg) {
      const catInfo = catalogMap.get(name);
      const avgRev = data.count > 0 ? data.totalRevenue / data.count : 0;
      const avgDur = data.count > 0 ? data.totalDurationMin / data.count : 0;
      const revPerHour = avgDur > 0 ? (avgRev / avgDur) * 60 : 0;
      const menuPrice = catInfo?.price ?? null;
      const realizationRate = menuPrice && menuPrice > 0 ? (avgRev / menuPrice) * 100 : null;

      const stylistBreakdown: StylistBreakdown[] = [...data.stylistMap.entries()]
        .map(([staffId, s]) => ({
          staffId,
          staffName: staffNames.get(staffId) || staffId,
          bookings: s.count,
          totalRevenue: s.rev,
          totalDurationMin: s.dur,
          revPerHour: s.dur > 0 ? (s.rev / s.dur) * 60 : 0,
          revShare: data.totalRevenue > 0 ? (s.rev / data.totalRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      const topShare = stylistBreakdown.length > 0 ? stylistBreakdown[0].revShare : 0;

      // Day distribution (Mon-Sun)
      const dayDistribution = Array.from({ length: 7 }, (_, i) => data.dayMap.get(i) || 0);

      // Peak hour summary
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const maxDayCount = Math.max(...dayDistribution);
      const peakDays = dayDistribution
        .map((count, i) => ({ name: dayNames[i], count }))
        .filter(d => d.count >= maxDayCount * 0.8 && d.count > 0)
        .map(d => d.name);
      const slotEntries = [...data.slotMap.entries()].sort((a, b) => b[1] - a[1]);
      const peakSlot = slotEntries.length > 0 ? slotEntries[0][0] : '';
      const peakHour = peakDays.length > 0 && peakSlot
        ? `${peakDays.join(' & ')} ${peakSlot}s`
        : peakDays.length > 0 ? peakDays.join(' & ') : '—';

      services.push({
        serviceName: name,
        category: catInfo?.category || 'Other',
        avgDuration: Math.round(avgDur),
        avgRevenue: avgRev,
        revPerHour,
        bookings: data.count,
        totalRevenue: data.totalRevenue,
        menuPrice,
        realizationRate,
        newClientPct: data.count > 0 ? (data.newClients / data.count) * 100 : 0,
        rebookRate: data.count > 0 ? (data.rebooked / data.count) * 100 : 0,
        avgTipPct: data.totalRevenue > 0 ? (data.totalTips / data.totalRevenue) * 100 : 0,
        stylistBreakdown,
        concentrationRisk: topShare > 70 && stylistBreakdown.length > 1,
        dayDistribution,
        peakHour,
      });
    }

    // Sort by rev/hour descending
    services.sort((a, b) => b.revPerHour - a.revPerHour);

    const totalBookedHours = overallDurationMin / 60;
    const overallRevPerHour = totalBookedHours > 0 ? overallRevenue / totalBookedHours : 0;
    const totalBookings = appointments.filter(a => a.service_name).length;

    return {
      services,
      avgRevPerHour: overallRevPerHour,
      totalServiceRevenue: overallRevenue,
      activeServiceCount: agg.size,
      avgServiceTicket: totalBookings > 0 ? overallRevenue / totalBookings : 0,
      totalBookedHours,
      overallRevPerHour,
    };
  }, [appointmentsQuery.data, servicesQuery.data, staffQuery.data]);

  return {
    data: result,
    isLoading: appointmentsQuery.isLoading || servicesQuery.isLoading || staffQuery.isLoading,
  };
}
