import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, differenceInMinutes, parseISO } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────

export interface EligibleStylist {
  id: string;
  name: string;
  photoUrl: string | null;
  bio: string | null;
  level: string | null;
  nextAvailableDate: string | null;
}

export interface AvailableSlot {
  time: string; // "9:00 AM"
  startMinutes: number; // minutes from midnight, for sorting
}

export interface ResolvedServiceInfo {
  duration: number; // total minutes
  price: number | null;
  requiresConsultation: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

// ─── Eligible Stylists Hook ──────────────────────────────────────

export function useEligibleStylists(
  orgId: string | undefined,
  locationId: string | null,
  serviceName: string | null,
) {
  return useQuery({
    queryKey: ['booking-eligible-stylists', orgId, locationId, serviceName],
    queryFn: async () => {
      // 1. Get all online-bookable stylists for this org
      let stylistQuery = supabase
        .from('employee_profiles')
        .select('user_id, full_name, photo_url, bio, stylist_level, location_id, location_ids')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('is_booking', true);

      const { data: allStylists, error: sErr } = await stylistQuery;
      if (sErr) throw sErr;
      if (!allStylists?.length) return [];

      // 2. Filter by location
      let filtered = allStylists;
      if (locationId) {
        filtered = filtered.filter((s) => {
          if (s.location_id === locationId) return true;
          if (Array.isArray(s.location_ids) && s.location_ids.includes(locationId)) return true;
          return false;
        });
      }

      // 3. Filter by service qualification if service is selected
      if (serviceName) {
        // Get service ID from name
        const { data: svc } = await supabase
          .from('services')
          .select('id')
          .eq('organization_id', orgId!)
          .eq('name', serviceName)
          .eq('is_active', true)
          .maybeSingle();

        if (svc) {
          // Get all qualifications for this service
          const { data: quals } = await supabase
            .from('staff_service_qualifications')
            .select('user_id')
            .eq('service_id', svc.id)
            .eq('is_active', true);

          // Also check phorest staff services via mapping
          const userIds = filtered.map((s) => s.user_id);
          const { data: mappings } = await supabase
            .from('phorest_staff_mapping')
            .select('user_id, phorest_staff_id')
            .in('user_id', userIds)
            .eq('is_active', true);

          let phorestQualifiedUserIds: string[] = [];
          if (mappings?.length) {
            const phorestStaffIds = mappings.map((m) => m.phorest_staff_id);
            // Get phorest service ID
            const { data: phorestSvc } = await supabase
              .from('phorest_services')
              .select('phorest_id')
              .eq('name', serviceName)
              .maybeSingle();

            if (phorestSvc) {
              const { data: phorestQuals } = await supabase
                .from('phorest_staff_services')
                .select('phorest_staff_id')
                .in('phorest_staff_id', phorestStaffIds)
                .eq('phorest_service_id', phorestSvc.phorest_id)
                .eq('is_qualified', true);

              if (phorestQuals?.length) {
                const qualifiedPhorestIds = new Set(phorestQuals.map((q) => q.phorest_staff_id));
                phorestQualifiedUserIds = mappings
                  .filter((m) => qualifiedPhorestIds.has(m.phorest_staff_id))
                  .map((m) => m.user_id);
              }
            }
          }

          const qualifiedUserIds = new Set([
            ...(quals?.map((q) => q.user_id) ?? []),
            ...phorestQualifiedUserIds,
          ]);

          // If we have qualification data, filter by it. If no quals exist at all,
          // assume the service doesn't require specific qualifications and show all.
          if (qualifiedUserIds.size > 0) {
            filtered = filtered.filter((s) => qualifiedUserIds.has(s.user_id));
          }
        }
      }

      // 4. Check for next available shift (next 14 days)
      const today = format(new Date(), 'yyyy-MM-dd');
      const twoWeeks = format(addDays(new Date(), 14), 'yyyy-MM-dd');
      const filteredIds = filtered.map((s) => s.user_id);

      const { data: shifts } = await supabase
        .from('staff_shifts')
        .select('user_id, shift_date')
        .in('user_id', filteredIds)
        .gte('shift_date', today)
        .lte('shift_date', twoWeeks)
        .eq('status', 'confirmed')
        .order('shift_date', { ascending: true });

      const nextAvailMap: Record<string, string> = {};
      shifts?.forEach((sh) => {
        if (!nextAvailMap[sh.user_id]) {
          nextAvailMap[sh.user_id] = sh.shift_date;
        }
      });

      return filtered.map((s): EligibleStylist => ({
        id: s.user_id,
        name: s.full_name || 'Stylist',
        photoUrl: s.photo_url,
        bio: s.bio,
        level: s.stylist_level,
        nextAvailableDate: nextAvailMap[s.user_id] || null,
      }));
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

// ─── Available Slots Hook ────────────────────────────────────────

export function useAvailableSlots(
  orgId: string | undefined,
  stylistId: string | null, // 'any' or a specific user_id
  locationId: string | null,
  serviceName: string | null,
  selectedDate: string | null, // 'yyyy-MM-dd'
) {
  return useQuery({
    queryKey: ['booking-available-slots', orgId, stylistId, locationId, serviceName, selectedDate],
    queryFn: async () => {
      if (!selectedDate) return { slots: [] as AvailableSlot[], duration: 60 };

      // 1. Resolve service duration
      let serviceDuration = 60; // default
      if (serviceName) {
        const { data: svc } = await supabase
          .from('services')
          .select('id, duration_minutes, processing_time_minutes, finishing_time_minutes')
          .eq('organization_id', orgId!)
          .eq('name', serviceName)
          .eq('is_active', true)
          .maybeSingle();

        if (svc) {
          serviceDuration = (svc.duration_minutes || 60)
            + (svc.processing_time_minutes || 0)
            + (svc.finishing_time_minutes || 0);
        }
      }

      // 2. Get stylists to check
      let stylistIds: string[] = [];
      if (stylistId && stylistId !== 'any') {
        stylistIds = [stylistId];
      } else {
        // "Any" — get all eligible stylists at this location
        let q = supabase
          .from('employee_profiles')
          .select('user_id, location_id, location_ids')
          .eq('organization_id', orgId!)
          .eq('is_active', true)
          .eq('is_booking', true);
        const { data: allStylists } = await q;
        if (allStylists) {
          stylistIds = allStylists
            .filter((s) => {
              if (!locationId) return true;
              return s.location_id === locationId || (Array.isArray(s.location_ids) && s.location_ids.includes(locationId));
            })
            .map((s) => s.user_id);
        }
      }

      if (!stylistIds.length) return { slots: [], duration: serviceDuration };

      // 3. Get shifts for these stylists on this date
      let shiftQuery = supabase
        .from('staff_shifts')
        .select('user_id, start_time, end_time')
        .in('user_id', stylistIds)
        .eq('shift_date', selectedDate)
        .eq('status', 'confirmed');

      if (locationId) {
        shiftQuery = shiftQuery.eq('location_id', locationId);
      }

      const { data: shifts } = await shiftQuery;
      if (!shifts?.length) return { slots: [], duration: serviceDuration };

      // 4. Check time off
      const { data: timeOff } = await supabase
        .from('time_off_requests')
        .select('user_id, start_date, end_date, is_full_day')
        .in('user_id', stylistIds)
        .eq('status', 'approved')
        .lte('start_date', selectedDate)
        .gte('end_date', selectedDate);

      const offUserIds = new Set(
        timeOff?.filter((t) => t.is_full_day).map((t) => t.user_id) ?? []
      );

      // 5. Get existing appointments for these stylists on this date
      const { data: appointments } = await supabase
        .from('phorest_appointments')
        .select('stylist_user_id, start_time, end_time, status')
        .in('stylist_user_id', stylistIds)
        .eq('appointment_date', selectedDate)
        .not('status', 'in', '("cancelled","no_show")');

      // Also check internal appointments
      const { data: internalAppts } = await supabase
        .from('appointments')
        .select('staff_user_id, start_time, end_time, status')
        .in('staff_user_id', stylistIds)
        .eq('appointment_date', selectedDate)
        .not('status', 'in', '("cancelled","no_show")');

      // 6. Build booked blocks per stylist
      type Block = { start: number; end: number };
      const bookedBlocks: Record<string, Block[]> = {};

      const addBlock = (userId: string, startTime: string, endTime: string) => {
        if (!bookedBlocks[userId]) bookedBlocks[userId] = [];
        bookedBlocks[userId].push({
          start: timeToMinutes(startTime),
          end: timeToMinutes(endTime),
        });
      };

      appointments?.forEach((a) => {
        if (a.stylist_user_id) addBlock(a.stylist_user_id, a.start_time, a.end_time);
      });
      internalAppts?.forEach((a) => {
        if (a.staff_user_id) addBlock(a.staff_user_id, a.start_time, a.end_time);
      });

      // 7. Generate available slots
      const slotSet = new Set<number>();
      const SLOT_INTERVAL = 30; // 30-minute intervals

      for (const shift of shifts) {
        if (offUserIds.has(shift.user_id)) continue;

        const shiftStart = timeToMinutes(shift.start_time);
        const shiftEnd = timeToMinutes(shift.end_time);
        const blocks = bookedBlocks[shift.user_id] || [];

        for (let t = shiftStart; t + serviceDuration <= shiftEnd; t += SLOT_INTERVAL) {
          // Check if this slot overlaps any booked block
          const slotEnd = t + serviceDuration;
          const isBlocked = blocks.some(
            (b) => t < b.end && slotEnd > b.start
          );
          if (!isBlocked) {
            slotSet.add(t);
          }
        }
      }

      const slots: AvailableSlot[] = Array.from(slotSet)
        .sort((a, b) => a - b)
        .map((mins) => ({
          time: minutesToLabel(mins),
          startMinutes: mins,
        }));

      return { slots, duration: serviceDuration };
    },
    enabled: !!orgId && !!selectedDate && !!stylistId,
    staleTime: 60_000,
  });
}

// ─── Service Price/Duration Resolution ───────────────────────────

export function useResolvedServiceInfo(
  orgId: string | undefined,
  serviceName: string | null,
  stylistId: string | null,
) {
  return useQuery({
    queryKey: ['booking-resolved-service', orgId, serviceName, stylistId],
    queryFn: async (): Promise<ResolvedServiceInfo> => {
      // Get base service info
      const { data: svc } = await supabase
        .from('services')
        .select('id, duration_minutes, processing_time_minutes, finishing_time_minutes, price, requires_new_client_consultation')
        .eq('organization_id', orgId!)
        .eq('name', serviceName!)
        .eq('is_active', true)
        .maybeSingle();

      if (!svc) {
        return { duration: 60, price: null, requiresConsultation: false };
      }

      let duration = (svc.duration_minutes || 60)
        + (svc.processing_time_minutes || 0)
        + (svc.finishing_time_minutes || 0);
      let price = svc.price;

      // Check stylist-specific overrides
      if (stylistId && stylistId !== 'any') {
        // Check staff_service_qualifications first
        const { data: qual } = await supabase
          .from('staff_service_qualifications')
          .select('custom_price, custom_duration_minutes')
          .eq('user_id', stylistId)
          .eq('service_id', svc.id)
          .eq('is_active', true)
          .maybeSingle();

        if (qual) {
          if (qual.custom_duration_minutes) duration = qual.custom_duration_minutes;
          if (qual.custom_price != null) price = qual.custom_price;
        } else {
          // Check phorest staff services
          const { data: mapping } = await supabase
            .from('phorest_staff_mapping')
            .select('phorest_staff_id')
            .eq('user_id', stylistId)
            .eq('is_active', true)
            .maybeSingle();

          if (mapping) {
            const { data: phorestSvc } = await supabase
              .from('phorest_services')
              .select('phorest_id')
              .eq('name', serviceName!)
              .maybeSingle();

            if (phorestSvc) {
              const { data: phorestQual } = await supabase
                .from('phorest_staff_services')
                .select('custom_price, custom_duration_minutes')
                .eq('phorest_staff_id', mapping.phorest_staff_id)
                .eq('phorest_service_id', phorestSvc.phorest_id)
                .eq('is_qualified', true)
                .maybeSingle();

              if (phorestQual) {
                if (phorestQual.custom_duration_minutes) duration = phorestQual.custom_duration_minutes;
                if (phorestQual.custom_price != null) price = phorestQual.custom_price;
              }
            }
          }
        }

        // Also check level-based pricing
        if (price === svc.price) {
          const { data: ep } = await supabase
            .from('employee_profiles')
            .select('stylist_level')
            .eq('user_id', stylistId)
            .maybeSingle();

          if (ep?.stylist_level) {
            const { data: levelPrice } = await supabase
              .from('service_level_prices')
              .select('price')
              .eq('service_id', svc.id)
              .eq('stylist_level_id', ep.stylist_level)
              .maybeSingle();

            if (levelPrice?.price != null) price = levelPrice.price;
          }
        }
      }

      return {
        duration,
        price,
        requiresConsultation: svc.requires_new_client_consultation ?? false,
      };
    },
    enabled: !!orgId && !!serviceName,
    staleTime: 2 * 60_000,
  });
}
