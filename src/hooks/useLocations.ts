import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface DayHours {
  open?: string;
  close?: string;
  closed?: boolean;
}

export interface HoursJson {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface HolidayClosure {
  date: string;
  name: string;
}

export type StripeStatus = 'not_connected' | 'pending' | 'active' | 'issues' | 'suspended';

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  store_number: string | null;
  booking_url: string | null;
  google_maps_url: string | null;
  hours: string | null;
  hours_json: HoursJson | null;
  holiday_closures: HolidayClosure[] | null;
  major_crossroads: string | null;
  phorest_branch_id: string | null;
  is_active: boolean;
  show_on_website: boolean;
  display_order: number;
  tax_rate: number | null;
  stylist_capacity: number | null;
  assistant_ratio: number | null;
  day_rate_enabled: boolean | null;
  day_rate_default_price: number | null;
  day_rate_blackout_dates: string[] | null;
  break_minutes_per_day: number | null;
  lunch_minutes: number | null;
  appointment_padding_minutes: number | null;
  state_province: string | null;
  country: string | null;
  stripe_account_id: string | null;
  stripe_payments_enabled: boolean;
  stripe_status: StripeStatus;
  created_at: string;
  updated_at: string;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_ABBREV: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

// Format hours for display (e.g., "Tue–Sat: 10am–6pm")
export function formatHoursForDisplay(hoursJson: HoursJson | null): string {
  if (!hoursJson) return '';
  
  // Group consecutive days with same hours
  const groups: { days: string[]; hours: string }[] = [];
  
  for (const day of DAYS) {
    const dayHours = hoursJson[day];
    const hoursStr = dayHours?.closed 
      ? 'Closed' 
      : dayHours?.open && dayHours?.close 
        ? `${formatTime(dayHours.open)}–${formatTime(dayHours.close)}`
        : 'Closed';
    
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.hours === hoursStr) {
      lastGroup.days.push(day);
    } else {
      groups.push({ days: [day], hours: hoursStr });
    }
  }
  
  // Format as string
  return groups
    .filter(g => g.hours !== 'Closed')
    .map(g => {
      const first = g.days[0];
      const last = g.days[g.days.length - 1];
      const dayRange = g.days.length > 1 
        ? `${DAY_ABBREV[first]}–${DAY_ABBREV[last]}`
        : DAY_ABBREV[first];
      return `${dayRange}: ${g.hours}`;
    })
    .join(' · ') || 'Closed';
}

// Get closed days summary
export function getClosedDays(hoursJson: HoursJson | null): string {
  if (!hoursJson) return '';
  
  const closedDays = DAYS.filter(day => hoursJson[day]?.closed);
  if (closedDays.length === 0) return '';
  if (closedDays.length === 7) return 'Closed';
  
  return `Closed ${closedDays.map(d => DAY_ABBREV[d]).join(' & ')}`;
}

// Get closed days as abbreviation array (Mon, Tue, etc.)
export function getClosedDaysArray(hoursJson: HoursJson | null): string[] {
  if (!hoursJson) return [];
  
  return DAYS
    .filter(day => hoursJson[day]?.closed)
    .map(day => DAY_ABBREV[day]);
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  return minutes === 0 ? `${displayHours}${period}` : `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
}

// Check if a location is closed on a specific date (holiday or regular hours)
export function isClosedOnDate(
  hoursJson: HoursJson | null,
  holidayClosures: HolidayClosure[] | null,
  date: Date
): { isClosed: boolean; reason?: string } {
  // Check holiday first
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const holiday = holidayClosures?.find(h => h.date === dateStr);
  if (holiday) return { isClosed: true, reason: holiday.name };

  // Check regular hours
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayKey = dayNames[date.getDay()];
  if (hoursJson?.[dayKey]?.closed) return { isClosed: true, reason: 'Regular hours' };

  return { isClosed: false };
}

// Check if location is currently closed for holiday
export function isClosedForHoliday(holidayClosures: HolidayClosure[] | null): HolidayClosure | null {
  if (!holidayClosures || holidayClosures.length === 0) return null;
  
  const today = new Date().toISOString().split('T')[0];
  return holidayClosures.find(h => h.date === today) || null;
}

// Check if location is closed today based on regular hours
export function isClosedToday(hoursJson: HoursJson | null): boolean {
  if (!hoursJson) return false;
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const today = dayNames[new Date().getDay()];
  return hoursJson[today]?.closed === true;
}

// Get today's hours
export function getTodayHours(hoursJson: HoursJson | null): { open: string; close: string } | null {
  if (!hoursJson) return null;
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const today = dayNames[new Date().getDay()];
  const dayHours = hoursJson[today];
  
  if (dayHours?.closed || !dayHours?.open || !dayHours?.close) return null;
  return { open: dayHours.open, close: dayHours.close };
}

// Get location hours for a specific date (consolidates closure check + operating hours)
export function getLocationHoursForDate(
  hoursJson: HoursJson | null,
  holidayClosures: HolidayClosure[] | null,
  date: Date
): {
  isClosed: boolean;
  closureReason?: string;
  openTime?: string;
  closeTime?: string;
} {
  const closure = isClosedOnDate(hoursJson, holidayClosures, date);
  if (closure.isClosed) {
    return { isClosed: true, closureReason: closure.reason };
  }

  if (!hoursJson) return { isClosed: false };

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayKey = dayNames[date.getDay()];
  const dayHours = hoursJson[dayKey];

  if (!dayHours?.open || !dayHours?.close) return { isClosed: false };

  return {
    isClosed: false,
    openTime: dayHours.open,
    closeTime: dayHours.close,
  };
}

export function useLocations(organizationId?: string) {
  return useQuery({
    queryKey: ['locations', organizationId],
    queryFn: async () => {
      let query = supabase
        .from('locations')
        .select('*')
        .order('display_order', { ascending: true });

      // If organizationId provided, filter by it
      if (organizationId) {
        query = query.eq('organization_id' as never, organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Location[];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

// For public components - only active locations
export function useActiveLocations(organizationId?: string) {
  return useQuery({
    queryKey: ['locations', 'active', organizationId],
    queryFn: async () => {
      let query = supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      // If organizationId provided, filter by it
      if (organizationId) {
        query = query.eq('organization_id' as never, organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Location[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (location: Omit<Location, 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('locations')
        .insert(location as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location created');
    },
    onError: (error) => {
      toast.error('Failed to create location', { description: error.message });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Location> & { id: string }) => {
      const { data, error } = await supabase
        .from('locations')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location updated');
    },
    onError: (error) => {
      toast.error('Failed to update location', { description: error.message });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete location', { description: error.message });
    },
  });
}
