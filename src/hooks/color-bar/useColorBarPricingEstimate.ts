/**
 * useColorBarPricingEstimate — Pulls the salon's real color service
 * appointment data and product spend to generate personalized ROI projections
 * for the Color Bar paywall / sales page.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useColorBarOrgId } from './useColorBarOrgId';
import { isColorOrChemicalService } from '@/utils/serviceCategorization';

/** Industry baseline: ~12 % of color product spend is wasted */
const BASELINE_WASTE_RATE = 0.12;

/** Fallback industry averages when data is insufficient */
const INDUSTRY_AVG_SERVICES_PER_STYLIST = 40; // per month
const INDUSTRY_AVG_PRODUCT_COST_PER_SERVICE = 12; // USD

export interface PricingEstimate {
  /** Average monthly color/chemical appointments */
  monthlyColorServices: number;
  /** Average product cost per color service */
  avgProductCostPerService: number;
  /** Total monthly product spend on color services */
  monthlyProductSpend: number;
  /** Estimated monthly waste savings (baseline waste × product spend) */
  estimatedWasteSavings: number;
  /** Estimated monthly supply fee recovery (if salon charges clients) */
  estimatedSupplyRecovery: number;
  /** Whether estimates are based on real appointment data */
  hasRealData: boolean;
  /** Total color appointments found in the query window */
  totalColorAppointments: number;
  /** Days of data available */
  dataWindowDays: number;
}

import { fetchAllBatched } from '@/utils/fetchAllBatched';

export function useColorBarPricingEstimate(stylistCountFallback = 2) {
  const orgId = useColorBarOrgId();

  return useQuery<PricingEstimate>({
    queryKey: ['color-bar-pricing-estimate', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('No org');

      const now = new Date();
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(now.getDate() - 90);
      const dateFrom = ninetyDaysAgo.toISOString().split('T')[0];
      const dateTo = now.toISOString().split('T')[0];

      // 1) Fetch appointments in last 90 days
      const appointments = await fetchAllBatched<{
        id: string;
        service_name: string | null;
        service_category: string | null;
        appointment_date: string;
      }>((from, to) =>
        supabase
          .from('phorest_appointments')
          .select('id, service_name, service_category, appointment_date')
          .gte('appointment_date', dateFrom)
          .lte('appointment_date', dateTo)
          .in('status', ['completed', 'confirmed', 'checked_in', 'in_progress'])
          .range(from, to),
      );

      // Filter to color/chemical services
      const colorAppts = appointments.filter((a) =>
        isColorOrChemicalService(a.service_name, a.service_category),
      );

      const totalColor = colorAppts.length;

      // Determine data window span
      if (totalColor === 0) {
        // No data — use industry averages
        const monthly = stylistCountFallback * INDUSTRY_AVG_SERVICES_PER_STYLIST;
        const spend = monthly * INDUSTRY_AVG_PRODUCT_COST_PER_SERVICE;
        return {
          monthlyColorServices: monthly,
          avgProductCostPerService: INDUSTRY_AVG_PRODUCT_COST_PER_SERVICE,
          monthlyProductSpend: spend,
          estimatedWasteSavings: Math.round(spend * BASELINE_WASTE_RATE),
          estimatedSupplyRecovery: spend,
          hasRealData: false,
          totalColorAppointments: 0,
          dataWindowDays: 0,
        };
      }

      // Determine actual data window in days
      const dates = colorAppts.map((a) => new Date(a.appointment_date).getTime());
      const minDate = Math.min(...dates);
      const maxDate = Math.max(...dates);
      const windowDays = Math.max(1, Math.round((maxDate - minDate) / 86400000) + 1);
      const hasEnough = windowDays >= 30;

      const monthlyColor = hasEnough
        ? Math.round((totalColor / windowDays) * 30)
        : stylistCountFallback * INDUSTRY_AVG_SERVICES_PER_STYLIST;

      // 2) Fetch product transaction items for the same window to estimate avg product cost
      const colorApptIds = colorAppts.map((a) => a.id);

      // We'll batch appointment IDs into chunks for the IN filter
      let productItems: { total_amount: number; tax_amount: number | null }[] = [];
      const ID_CHUNK = 200;
      for (let i = 0; i < colorApptIds.length; i += ID_CHUNK) {
        const chunk = colorApptIds.slice(i, i + ID_CHUNK);
        const items = await fetchAllBatched<{
          total_amount: number;
          tax_amount: number | null;
        }>((from, to) =>
          supabase
            .from('phorest_transaction_items')
            .select('total_amount, tax_amount')
            .in('appointment_id', chunk)
            .eq('item_type', 'Product')
            .range(from, to),
        );
        productItems = productItems.concat(items);
      }

      let avgCost: number;
      if (productItems.length > 0) {
        const totalProductSpend = productItems.reduce(
          (s, it) => s + (it.total_amount ?? 0) + (it.tax_amount ?? 0),
          0,
        );
        avgCost = Math.round((totalProductSpend / totalColor) * 100) / 100;
      } else {
        avgCost = INDUSTRY_AVG_PRODUCT_COST_PER_SERVICE;
      }

      const monthlySpend = Math.round(monthlyColor * avgCost);
      const wasteSavings = Math.round(monthlySpend * BASELINE_WASTE_RATE);

      return {
        monthlyColorServices: monthlyColor,
        avgProductCostPerService: avgCost,
        monthlyProductSpend: monthlySpend,
        estimatedWasteSavings: wasteSavings,
        estimatedSupplyRecovery: monthlySpend,
        hasRealData: hasEnough,
        totalColorAppointments: totalColor,
        dataWindowDays: windowDays,
      };
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 30, // 30 min
  });
}
