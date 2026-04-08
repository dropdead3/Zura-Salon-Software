import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';
import { fetchAllBatched } from '@/utils/fetchAllBatched';

// ── Thresholds ──
const UNDERSTAFFED_THRESHOLD = 85; // utilization > 85% → demand exceeds capacity
const OVERSTAFFED_THRESHOLD = 40;  // utilization < 40% → excess idle capacity

export type StaffingStatus = 'understaffed' | 'balanced' | 'overstaffed';

export interface LocationBalance {
  locationId: string;
  locationName: string;
  utilizationPercent: number;
  bookedHours: number;
  availableHours: number;
  gapHours: number;
  status: StaffingStatus;
}

export interface LocationStaffingBalanceResult {
  locations: LocationBalance[];
  understaffedCount: number;
  overstaffedCount: number;
  balancedCount: number;
  isLoading: boolean;
}

type DateRange = 'tomorrow' | '7days' | '30days' | '90days';

// ── Hours helpers (same logic as useHistoricalCapacityUtilization) ──

function getGrossOperatingHours(hoursJson: Record<string, any> | null, dayOfWeek: number): number {
  if (!hoursJson) return 8;
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayHours = hoursJson[dayNames[dayOfWeek]];
  if (!dayHours || dayHours.closed) return 0;
  try {
    const [openH, openM] = (dayHours.open || '09:00').split(':').map(Number);
    const [closeH, closeM] = (dayHours.close || '18:00').split(':').map(Number);
    return (closeH + closeM / 60) - (openH + openM / 60);
  } catch {
    return 8;
  }
}

function getEffectiveHoursForDay(
  hoursJson: Record<string, any> | null,
  dayOfWeek: number,
  breakMinutes: number,
  lunchMinutes: number,
): number {
  const gross = getGrossOperatingHours(hoursJson, dayOfWeek);
  if (gross === 0) return 0;
  return Math.max(0, gross - (breakMinutes + lunchMinutes) / 60);
}

function classify(utilization: number): StaffingStatus {
  if (utilization > UNDERSTAFFED_THRESHOLD) return 'understaffed';
  if (utilization < OVERSTAFFED_THRESHOLD) return 'overstaffed';
  return 'balanced';
}

// ── Hook ──

export function useLocationStaffingBalance(dateRange: DateRange = '30days'): LocationStaffingBalanceResult {
  const today = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (dateRange) {
    case 'tomorrow':
      startDate = addDays(today, 1);
      endDate = addDays(today, 1);
      break;
    case '7days':
      startDate = addDays(today, 1);
      endDate = addDays(today, 7);
      break;
    case '30days':
      startDate = addDays(today, 1);
      endDate = addDays(today, 30);
      break;
    case '90days':
      startDate = addDays(today, 1);
      endDate = addDays(today, 90);
      break;
  }

  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  // Fetch active locations with capacity config
  const locationsQuery = useQuery({
    queryKey: ['location-staffing-balance-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, stylist_capacity, hours_json, break_minutes_per_day, lunch_minutes')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch appointments grouped by location for the date range
  const appointmentsQuery = useQuery({
    queryKey: ['location-staffing-balance-appointments', startStr, endStr],
    queryFn: async () => {
      return fetchAllBatched<any>((from, to) =>
        supabase
          .from('phorest_appointments')
          .select('location_id, appointment_date, start_time, end_time')
          .gte('appointment_date', startStr)
          .lte('appointment_date', endStr)
          .not('status', 'in', '("cancelled","no_show")')
          .range(from, to)
      );
    },
  });

  // Compute per-location balance
  const result = useMemo<Omit<LocationStaffingBalanceResult, 'isLoading'>>(() => {
    const empty = { locations: [], understaffedCount: 0, overstaffedCount: 0, balancedCount: 0 };
    if (!locationsQuery.data || !appointmentsQuery.data) return empty;

    const locations = locationsQuery.data;
    const appointments = appointmentsQuery.data;

    if (locations.length === 0) return empty;

    // Group appointment hours by location_id
    const bookedByLocation = new Map<string, number>();
    appointments.forEach((apt) => {
      const locId = apt.location_id;
      if (!locId) return;

      let durationHours = 1;
      if (apt.start_time && apt.end_time) {
        const [sH, sM] = apt.start_time.split(':').map(Number);
        const [eH, eM] = apt.end_time.split(':').map(Number);
        durationHours = (eH + eM / 60) - (sH + sM / 60);
        if (durationHours <= 0) durationHours = 1;
      }
      bookedByLocation.set(locId, (bookedByLocation.get(locId) || 0) + durationHours);
    });

    // Calculate available hours per location over the date range
    const balances: LocationBalance[] = locations.map((loc) => {
      const hoursJson = loc.hours_json as Record<string, any> | null;
      const breakMins = loc.break_minutes_per_day ?? 30;
      const lunchMins = loc.lunch_minutes ?? 45;
      const capacity = loc.stylist_capacity || 4;

      let availableHours = 0;
      const current = new Date(startDate);
      while (current <= endDate) {
        const dayOfWeek = current.getDay();
        const effective = getEffectiveHoursForDay(hoursJson, dayOfWeek, breakMins, lunchMins);
        availableHours += effective * capacity;
        current.setDate(current.getDate() + 1);
      }

      const bookedHours = bookedByLocation.get(loc.id) || 0;
      const utilizationPercent = availableHours > 0
        ? Math.round((bookedHours / availableHours) * 100)
        : 0;
      const gapHours = Math.max(0, availableHours - bookedHours);

      return {
        locationId: loc.id,
        locationName: loc.name,
        utilizationPercent,
        bookedHours: Math.round(bookedHours),
        availableHours: Math.round(availableHours),
        gapHours: Math.round(gapHours),
        status: classify(utilizationPercent),
      };
    });

    return {
      locations: balances,
      understaffedCount: balances.filter((b) => b.status === 'understaffed').length,
      overstaffedCount: balances.filter((b) => b.status === 'overstaffed').length,
      balancedCount: balances.filter((b) => b.status === 'balanced').length,
    };
  }, [locationsQuery.data, appointmentsQuery.data]);

  return {
    ...result,
    isLoading: locationsQuery.isLoading || appointmentsQuery.isLoading,
  };
}
