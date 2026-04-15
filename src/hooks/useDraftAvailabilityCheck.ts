import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DraftBooking } from './useDraftBookings';

interface AvailabilityResult {
  status: 'available' | 'conflict' | 'no_data';
  nextSlots: string[];
  isLoading: boolean;
}

export function useDraftAvailabilityCheck(draft: DraftBooking): AvailabilityResult {
  const hasData = !!(draft.appointment_date && draft.start_time && draft.staff_user_id);

  const { data, isLoading } = useQuery({
    queryKey: ['draft-availability', draft.id, draft.appointment_date, draft.start_time, draft.staff_user_id],
    queryFn: async () => {
      // Get appointments for that stylist on that day
      const { data: appointments } = await supabase
        .from('v_all_appointments' as any)
        .select('start_time, end_time')
        .eq('stylist_user_id', draft.staff_user_id!)
        .eq('appointment_date', draft.appointment_date!)
        .neq('status', 'cancelled')
        .eq('is_demo', false)
        .order('start_time');

      const existingAppts = (appointments || []) as any[];

      // Check if the draft's time conflicts
      const draftStart = draft.start_time!;
      // Estimate 60-minute duration
      const draftStartMins = timeToMinutes(draftStart);
      const draftEndMins = draftStartMins + 60;
      const draftEnd = minutesToTime(draftEndMins);

      const hasConflict = existingAppts.some(apt => {
        return !(draftEnd <= apt.start_time || draftStart >= apt.end_time);
      });

      if (!hasConflict) {
        return { status: 'available' as const, nextSlots: [] };
      }

      // Find next 3 available slots (15-min intervals from 9am to 7pm)
      const nextSlots: string[] = [];
      for (let mins = 9 * 60; mins < 19 * 60 && nextSlots.length < 3; mins += 15) {
        const slotStart = minutesToTime(mins);
        const slotEnd = minutesToTime(mins + 60);

        const slotConflict = existingAppts.some(apt => {
          return !(slotEnd <= apt.start_time || slotStart >= apt.end_time);
        });

        if (!slotConflict) {
          nextSlots.push(slotStart);
        }
      }

      return { status: 'conflict' as const, nextSlots };
    },
    enabled: hasData,
    staleTime: 60000,
  });

  if (!hasData) return { status: 'no_data', nextSlots: [], isLoading: false };

  return {
    status: data?.status ?? 'no_data',
    nextSlots: data?.nextSlots ?? [],
    isLoading,
  };
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}
