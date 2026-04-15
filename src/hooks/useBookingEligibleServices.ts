import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInCalendarDays } from 'date-fns';

export interface EligibleService {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number | null;
  durationMinutes: number;
  isPopular: boolean;
  requiresConsultation: boolean;
  requiresQualification: boolean;
  requiresDeposit: boolean;
  depositType: string | null;
  depositAmount: number | null;
  requireCardOnFile: boolean;
}

export function useBookingEligibleServices(
  orgId: string | undefined,
  locationId: string | null,
  stylistId: string | null, // user_id or null
) {
  return useQuery({
    queryKey: ['booking-eligible-services', orgId, locationId, stylistId],
    queryFn: async () => {
      // 1. Get all online-bookable active services
      let q = supabase
        .from('services')
        .select('id, name, description, category, price, duration_minutes, is_popular, requires_new_client_consultation, requires_qualification, lead_time_days, allow_same_day_booking, bookable_online, location_id, requires_deposit, deposit_type, deposit_amount, require_card_on_file')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('bookable_online', true)
        .or('is_archived.is.null,is_archived.eq.false');

      const { data: services, error } = await q;
      if (error) throw error;
      if (!services?.length) return [];

      // 2. Filter by location if selected
      let filtered = services;
      if (locationId) {
        filtered = filtered.filter(
          (s) => !s.location_id || s.location_id === locationId
        );
      }

      // 3. Filter by lead time constraints
      const today = new Date();
      filtered = filtered.filter((s) => {
        if (s.lead_time_days && s.lead_time_days > 0) {
          // Service with lead time — still show it, but it won't be bookable today
          return true;
        }
        if (s.allow_same_day_booking === false) {
          // Still show, booking will just start from tomorrow
          return true;
        }
        return true;
      });

      // 4. Filter by stylist qualifications if stylist selected
      if (stylistId && stylistId !== 'any') {
        const serviceIds = filtered.map((s) => s.id);

        // Check staff_service_qualifications
        const { data: quals } = await supabase
          .from('staff_service_qualifications')
          .select('service_id')
          .eq('user_id', stylistId)
          .in('service_id', serviceIds)
          .eq('is_active', true);

        const qualifiedServiceIds = new Set(quals?.map((q) => q.service_id) ?? []);

        // Check phorest qualifications
        const { data: mapping } = await supabase
          .from('v_all_staff' as any)
          .select('phorest_staff_id')
          .eq('user_id', stylistId)
          .eq('is_active', true)
          .maybeSingle();

        if (mapping) {
          // Get phorest service IDs for these services by name match
          const serviceNames = filtered.map((s) => s.name);
          const { data: phorestSvcs } = await supabase
            .from('v_all_services' as any)
            .select('phorest_service_id, name')
            .in('name', serviceNames);

          if (phorestSvcs?.length) {
            const phorestServiceIds = phorestSvcs.map((ps) => ps.phorest_service_id);
            const { data: phorestQuals } = await supabase
              .from('phorest_staff_services' as any)
              .select('phorest_service_id')
              .eq('phorest_staff_id', mapping.phorest_staff_id)
              .in('phorest_service_id', phorestServiceIds)
              .eq('is_qualified', true);

            if (phorestQuals?.length) {
              const qualPhorestIds = new Set(phorestQuals.map((q) => q.phorest_service_id));
              const nameToService = new Map(phorestSvcs.map((ps) => [ps.name, ps.phorest_service_id]));
              filtered.forEach((s) => {
                const pid = nameToService.get(s.name);
                if (pid && qualPhorestIds.has(pid)) {
                  qualifiedServiceIds.add(s.id);
                }
              });
            }
          }
        }

        // Only filter if we found any qualification data (if zero quals, assume all allowed)
        if (qualifiedServiceIds.size > 0) {
          filtered = filtered.filter((s) => qualifiedServiceIds.has(s.id));
        }
      }

      return filtered.map((s): EligibleService => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category || 'General',
        price: s.price,
        durationMinutes: s.duration_minutes || 60,
        isPopular: s.is_popular ?? false,
        requiresConsultation: s.requires_new_client_consultation ?? false,
        requiresQualification: s.requires_qualification ?? false,
        requiresDeposit: s.requires_deposit ?? false,
        depositType: s.deposit_type ?? null,
        depositAmount: s.deposit_amount ?? null,
        requireCardOnFile: s.require_card_on_file ?? false,
      }));
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}
