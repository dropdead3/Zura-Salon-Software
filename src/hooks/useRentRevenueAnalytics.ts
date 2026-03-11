import { useQuery } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, startOfYear } from 'date-fns';

export interface RentRevenueMetrics {
  monthlyRentRevenue: number;
  yearlyRentRevenue: number;
  collectionRate: number;
  overdueBalance: number;
  overdueRenterCount: number;
  activeRenterCount: number;
  monthlyTrend: {
    month: string;
    collected: number;
    due: number;
  }[];
  renterBreakdown: {
    renter_name: string;
    business_name: string | null;
    monthly_rent: number;
    collected_ytd: number;
    outstanding: number;
    status: string;
  }[];
}

export function useRentRevenueAnalytics(organizationId: string | undefined, months: number = 12) {
  return useQuery({
    queryKey: ['rent-revenue-analytics', organizationId, months],
    queryFn: async (): Promise<RentRevenueMetrics> => {
      const now = new Date();
      const currentMonthStart = startOfMonth(now).toISOString().split('T')[0];
      const currentMonthEnd = endOfMonth(now).toISOString().split('T')[0];
      const yearStart = startOfYear(now).toISOString().split('T')[0];
      const trendStart = startOfMonth(subMonths(now, months - 1)).toISOString().split('T')[0];

      // Get all payments for the current month
      const { data: monthlyPayments, error: monthlyError } = await supabase
        .from('rent_payments' as any)
        .select('base_rent, late_fee, credits_applied, adjustments, amount_paid, status')
        .eq('organization_id', organizationId!)
        .gte('due_date', currentMonthStart)
        .lte('due_date', currentMonthEnd);

      if (monthlyError) throw monthlyError;

      // Get all payments for the year
      const { data: yearlyPayments, error: yearlyError } = await supabase
        .from('rent_payments' as any)
        .select('base_rent, late_fee, credits_applied, adjustments, amount_paid, status, due_date')
        .eq('organization_id', organizationId!)
        .gte('due_date', yearStart);

      if (yearlyError) throw yearlyError;

      // Get trend data
      const { data: trendPayments, error: trendError } = await supabase
        .from('rent_payments' as any)
        .select('base_rent, late_fee, credits_applied, adjustments, amount_paid, due_date')
        .eq('organization_id', organizationId!)
        .gte('due_date', trendStart)
        .order('due_date', { ascending: true });

      if (trendError) throw trendError;

      // Get active renters with their contracts and payment status
      const { data: renters, error: rentersError } = await supabase
        .from('booth_renter_profiles' as any)
        .select('id, business_name, status, user_id')
        .eq('organization_id', organizationId!)
        .in('status', ['active', 'pending']);

      if (rentersError) throw rentersError;

      // Fetch employee profiles for names
      const userIds = ((renters as any[]) || []).map((r: any) => r.user_id);
      const { data: employeeProfiles } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name')
        .in('user_id', userIds);

      const empMap = new Map((employeeProfiles || []).map(e => [e.user_id, e]));

      // Get active contracts
      const renterIds = ((renters as any[]) || []).map((r: any) => r.id);
      const { data: contracts } = await supabase
        .from('booth_rental_contracts' as any)
        .select('booth_renter_id, rent_amount')
        .in('booth_renter_id', renterIds)
        .eq('status', 'active');

      const contractMap = new Map(((contracts as any[]) || []).map((c: any) => [c.booth_renter_id, c.rent_amount]));

      // Get YTD payments per renter
      const { data: renterPayments } = await supabase
        .from('rent_payments' as any)
        .select('booth_renter_id, amount_paid, base_rent, late_fee, credits_applied, adjustments, status')
        .in('booth_renter_id', renterIds)
        .gte('due_date', yearStart);

      const renterPaymentMap = new Map<string, { collected: number; outstanding: number }>();
      ((renterPayments as any[]) || []).forEach((p: any) => {
        const existing = renterPaymentMap.get(p.booth_renter_id) || { collected: 0, outstanding: 0 };
        const total_due = p.base_rent + p.late_fee - p.credits_applied + p.adjustments;
        existing.collected += p.amount_paid;
        if (p.status !== 'paid' && p.status !== 'waived') {
          existing.outstanding += total_due - p.amount_paid;
        }
        renterPaymentMap.set(p.booth_renter_id, existing);
      });

      // Calculate metrics
      let monthlyCollected = 0;
      let monthlyDue = 0;
      let overdueBalance = 0;

      ((monthlyPayments as any[]) || []).forEach((p: any) => {
        const total_due = p.base_rent + p.late_fee - p.credits_applied + p.adjustments;
        monthlyDue += total_due;
        monthlyCollected += p.amount_paid;
      });

      let yearlyCollected = 0;
      ((yearlyPayments as any[]) || []).forEach((p: any) => {
        yearlyCollected += p.amount_paid;
        if (p.status === 'overdue') {
          const total_due = p.base_rent + p.late_fee - p.credits_applied + p.adjustments;
          overdueBalance += total_due - p.amount_paid;
        }
      });

      // Build monthly trend
      const trendMap = new Map<string, { collected: number; due: number }>();
      ((trendPayments as any[]) || []).forEach((p: any) => {
        const month = format(new Date(p.due_date), 'MMM yyyy');
        const existing = trendMap.get(month) || { collected: 0, due: 0 };
        const total_due = p.base_rent + p.late_fee - p.credits_applied + p.adjustments;
        existing.due += total_due;
        existing.collected += p.amount_paid;
        trendMap.set(month, existing);
      });

      const monthlyTrend = Array.from(trendMap.entries()).map(([month, data]) => ({
        month,
        ...data,
      }));

      // Build renter breakdown
      const renterBreakdown = ((renters as any[]) || []).map((r: any) => {
        const paymentData = renterPaymentMap.get(r.id) || { collected: 0, outstanding: 0 };
        const emp = empMap.get(r.user_id);
        return {
          renter_name: emp ? formatDisplayName(emp.full_name || '', emp.display_name) : 'Unknown',
          business_name: r.business_name,
          monthly_rent: contractMap.get(r.id) || 0,
          collected_ytd: paymentData.collected,
          outstanding: paymentData.outstanding,
          status: paymentData.outstanding > 0 ? 'overdue' : 'current',
        };
      });

      // Count overdue renters
      const overdueRenterIds = new Set<string>();
      renterBreakdown.forEach(r => {
        if (r.outstanding > 0) {
          overdueRenterIds.add(r.renter_name);
        }
      });

      return {
        monthlyRentRevenue: monthlyCollected,
        yearlyRentRevenue: yearlyCollected,
        collectionRate: monthlyDue > 0 ? (monthlyCollected / monthlyDue) * 100 : 100,
        overdueBalance,
        overdueRenterCount: overdueRenterIds.size,
        activeRenterCount: ((renters as any[]) || []).filter((r: any) => r.status === 'active').length,
        monthlyTrend,
        renterBreakdown,
      };
    },
    enabled: !!organizationId,
  });
}
