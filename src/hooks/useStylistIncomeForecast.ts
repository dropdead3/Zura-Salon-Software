/**
 * useStylistIncomeForecast — Calculates booked revenue and estimated earnings
 * for the current week, scoped to the authenticated stylist.
 * Uses tip-adjusted pricing (total_price - tip_amount) for forecast accuracy.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export interface IncomeForecastData {
  bookedRevenue: number;
  appointmentCount: number;
  estimatedEarnings: number | null; // null if no commission rate found
  commissionRate: number | null;
  openSlotValue: number | null;
  weekStart: string;
  weekEnd: string;
}

export function useStylistIncomeForecast() {
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const userId = user?.id;

  return useQuery<IncomeForecastData>({
    queryKey: ['stylist-income-forecast', orgId, userId],
    queryFn: async () => {
      if (!userId || !orgId) throw new Error('Missing context');

      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const startStr = format(weekStart, 'yyyy-MM-dd');
      const endStr = format(weekEnd, 'yyyy-MM-dd');

      // Fetch this week's appointments for the stylist (tip-adjusted)
      const { data: appointments, error: aptError } = await supabase
        .from('phorest_appointments')
        .select('total_price, tip_amount, status')
        .eq('stylist_user_id', userId)
        .gte('appointment_date', startStr)
        .lte('appointment_date', endStr)
        .not('status', 'in', '("cancelled","no_show")')
        .eq('is_demo', false);

      if (aptError) throw aptError;

      const bookedRevenue = (appointments || []).reduce(
        (sum, a) => sum + ((Number(a.total_price) || 0) - (Number(a.tip_amount) || 0)),
        0,
      );
      const appointmentCount = appointments?.length || 0;

      // Try to find commission rate from stylist_levels via employee profile
      let commissionRate: number | null = null;
      const { data: profile } = await supabase
        .from('employee_profiles')
        .select('stylist_level')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile?.stylist_level) {
        const { data: level } = await (supabase
          .from('stylist_levels') as any)
          .select('service_commission_rate')
          .eq('organization_id', orgId)
          .eq('slug', profile.stylist_level)
          .maybeSingle();
        commissionRate = level?.service_commission_rate ?? null;
      }

      // Check for individual override
      const { data: override } = await supabase
        .from('stylist_commission_overrides')
        .select('service_commission_rate')
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (override?.service_commission_rate != null) {
        commissionRate = override.service_commission_rate;
      }

      const estimatedEarnings = commissionRate != null
        ? bookedRevenue * commissionRate
        : null;

      return {
        bookedRevenue,
        appointmentCount,
        estimatedEarnings,
        commissionRate,
        openSlotValue: null, // Phase 2: compute from available slots
        weekStart: startStr,
        weekEnd: endStr,
      };
    },
    enabled: !!userId && !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}
