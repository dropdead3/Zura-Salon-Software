import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useEmployeePayrollSettings } from './useEmployeePayrollSettings';
import { usePayroll } from './usePayroll';
import { usePaySchedule, getCurrentPayPeriod } from './usePaySchedule';
import { useStylistLevels } from './useStylistLevels';
import { format, startOfYear, differenceInDays } from 'date-fns';

export interface PayrollKPIs {
  nextPayrollForecast: number;
  forecastChange: number;
  ytdPayrollTotal: number;
  laborCostRatio: number;
  commissionRatio: number;
  employerTaxBurden: number;
  activeEmployeeCount: number;
  overtimeHours: number;
  tipsCollected: number;
  baseVsCommissionPct: number; // % of forecast that is base (hourly+salary) vs commission
}

export interface CompensationBreakdown {
  basePay: number;
  serviceCommissions: number;
  productCommissions: number;
  bonuses: number;
  tips: number;
}

export interface PayrollAnalyticsData {
  kpis: PayrollKPIs;
  compensationBreakdown: CompensationBreakdown;
  isLoading: boolean;
  error: Error | null;
}

export function usePayrollAnalytics(): PayrollAnalyticsData {
  const { selectedOrganization } = useOrganizationContext();
  const organizationId = selectedOrganization?.id;
  const { employeeSettings, isLoading: isLoadingSettings } = useEmployeePayrollSettings();
  const { payrollRuns, isLoadingRuns } = usePayroll();
  const { settings: paySchedule, isLoading: isLoadingSchedule } = usePaySchedule();
  const { data: levels } = useStylistLevels();

  const currentPeriod = paySchedule ? getCurrentPayPeriod(paySchedule) : null;
  const periodStart = currentPeriod ? format(currentPeriod.periodStart, 'yyyy-MM-dd') : null;
  const periodEnd = currentPeriod ? format(currentPeriod.periodEnd, 'yyyy-MM-dd') : null;

  // Fetch employee level slugs for hourly wage fallback
  const { data: employeeLevels } = useQuery({
    queryKey: ['payroll-analytics-employee-levels', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, stylist_level')
        .eq('organization_id', organizationId!)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: salesData, isLoading: isLoadingSales } = useQuery({
    queryKey: ['payroll-analytics-sales', periodStart, periodEnd, organizationId],
    queryFn: async () => {
      if (!periodStart || !periodEnd) return null;

      const allData: any[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('v_all_transaction_items' as any)
          .select('stylist_user_id, total_amount, tax_amount, item_type, transaction_date')
          .gte('transaction_date', periodStart)
          .lte('transaction_date', periodEnd)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }

      // Transform to the format expected by calculateForecast: { user_id, service_revenue, product_revenue }
      const byUser: Record<string, { user_id: string; service_revenue: number; product_revenue: number }> = {};
      for (const item of allData) {
        const uid = item.stylist_user_id;
        if (!uid) continue;
        if (!byUser[uid]) byUser[uid] = { user_id: uid, service_revenue: 0, product_revenue: 0 };
        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        const itemType = (item.item_type || '').toLowerCase();
        if (itemType === 'service') byUser[uid].service_revenue += amount;
        else byUser[uid].product_revenue += amount;
      }
      return Object.values(byUser);
    },
    enabled: !!periodStart && !!periodEnd,
  });

  const { data: ytdRevenue } = useQuery({
    queryKey: ['payroll-analytics-ytd-revenue', organizationId],
    queryFn: async () => {
      const yearStart = format(startOfYear(new Date()), 'yyyy-MM-dd');
      const today = format(new Date(), 'yyyy-MM-dd');

      const allData: any[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('v_all_transaction_items' as any)
          .select('total_amount, tax_amount')
          .gte('transaction_date', yearStart)
          .lte('transaction_date', today)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }

      return allData.reduce((sum, item) =>
        sum + (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0), 0);
    },
    enabled: !!organizationId,
  });

  const kpis = calculateKPIs(
    employeeSettings,
    payrollRuns,
    salesData || [],
    ytdRevenue || 0,
    currentPeriod,
    levels || [],
    employeeLevels || []
  );

  const compensationBreakdown = calculateCompensationBreakdown(payrollRuns);

  const isLoading = isLoadingSettings || isLoadingRuns || isLoadingSchedule || isLoadingSales;

  return {
    kpis,
    compensationBreakdown,
    isLoading,
    error: null,
  };
}

function calculateKPIs(
  employeeSettings: any[],
  payrollRuns: any[],
  salesData: any[],
  ytdRevenue: number,
  currentPeriod: { periodStart: Date; periodEnd: Date; nextPayDay: Date } | null,
  levels: any[],
  employeeLevels: { user_id: string; stylist_level: string | null }[]
): PayrollKPIs {
  const activeEmployees = employeeSettings.filter(e => e.is_payroll_active);
  const activeEmployeeCount = activeEmployees.length;

  const ytdPayrollTotal = payrollRuns
    .filter(run => run.status === 'processed')
    .reduce((sum, run) => sum + (run.total_gross_pay || 0), 0);

  const laborCostRatio = ytdRevenue > 0 ? (ytdPayrollTotal / ytdRevenue) * 100 : 0;

  const { forecast, tipsCollected, totalBasePay, totalCommissionPay } = calculateForecast(
    salesData,
    activeEmployees,
    currentPeriod,
    levels,
    employeeLevels
  );

  const lastRun = payrollRuns.find(run => run.status === 'processed');
  const forecastChange = lastRun?.total_gross_pay
    ? ((forecast - lastRun.total_gross_pay) / lastRun.total_gross_pay) * 100
    : 0;

  // Derive commission ratio from current forecast (same time window as other KPIs)
  const commissionRatio = forecast > 0
    ? (totalCommissionPay / forecast) * 100
    : 0;

  const employerTaxBurden = forecast * 0.10;
  const overtimeHours = 0;

  const baseVsCommissionPct = forecast > 0 ? (totalBasePay / forecast) * 100 : 0;

  return {
    nextPayrollForecast: forecast,
    forecastChange,
    ytdPayrollTotal,
    laborCostRatio,
    commissionRatio,
    employerTaxBurden,
    activeEmployeeCount,
    overtimeHours,
    tipsCollected,
    baseVsCommissionPct,
  };
}

function calculateForecast(
  salesData: any[],
  employees: any[],
  currentPeriod: { periodStart: Date; periodEnd: Date; nextPayDay: Date } | null,
  levels: any[],
  employeeLevels: { user_id: string; stylist_level: string | null }[]
): { forecast: number; tipsCollected: number; totalBasePay: number; totalCommissionPay: number } {
  if (!currentPeriod || employees.length === 0) {
    return { forecast: 0, tipsCollected: 0, totalBasePay: 0, totalCommissionPay: 0 };
  }

  const today = new Date();
  const daysPassed = Math.max(1, differenceInDays(today, currentPeriod.periodStart) + 1);
  const totalDays = differenceInDays(currentPeriod.periodEnd, currentPeriod.periodStart) + 1;
  const daysRemaining = Math.max(0, totalDays - daysPassed);

  const employeeSales: Record<string, { services: number; products: number }> = {};
  
  for (const row of salesData) {
    if (!row.user_id) continue;
    if (!employeeSales[row.user_id]) {
      employeeSales[row.user_id] = { services: 0, products: 0 };
    }
    employeeSales[row.user_id].services += Number(row.service_revenue) || 0;
    employeeSales[row.user_id].products += Number(row.product_revenue) || 0;
  }

  // Look up per-employee level rates; fall back to median only for unassigned employees
  const midLevel = levels.length > 0 ? levels[Math.floor(levels.length / 2)] : null;
  const defaultSvcRate = midLevel?.service_commission_rate ?? 0;
  const defaultRetailRate = midLevel?.retail_commission_rate ?? 0;

  // Build a slug-to-level map for fast lookups
  const levelBySlug: Record<string, any> = {};
  for (const l of levels) {
    if (l.slug) levelBySlug[l.slug] = l;
  }

  let totalForecast = 0;
  let totalTips = 0;
  let totalBasePay = 0;
  let totalCommissionPay = 0;

  for (const emp of employees) {
    const sales = employeeSales[emp.employee_id] || { services: 0, products: 0 };
    
    const dailyAvgServices = sales.services / daysPassed;
    const dailyAvgProducts = sales.products / daysPassed;
    const projectedServices = sales.services + (dailyAvgServices * daysRemaining);
    const projectedProducts = sales.products + (dailyAvgProducts * daysRemaining);

    let basePay = 0;
    const hoursPerPeriod = 80;
    
    if (emp.pay_type === 'hourly' || emp.pay_type === 'hourly_plus_commission') {
      let rate = emp.hourly_rate || 0;
      // Fallback: use level's hourly_wage if employee has no rate set
      if (!rate) {
        const empLevel = employeeLevels.find(el => el.user_id === emp.employee_id);
        if (empLevel?.stylist_level) {
          const matchedLevel = levels.find((l: any) => l.slug === empLevel.stylist_level);
          if (matchedLevel?.hourly_wage_enabled && matchedLevel.hourly_wage) {
            rate = matchedLevel.hourly_wage;
          }
        }
      }
      basePay = rate * hoursPerPeriod;
    } else if (emp.pay_type === 'salary' || emp.pay_type === 'salary_plus_commission') {
      basePay = (emp.salary_amount || 0) / 26;
    }

    let commissionPay = 0;
    if (emp.commission_enabled) {
      // Use employee's assigned level rates if available, otherwise fall back to median
      const empLevel = employeeLevels.find(el => el.user_id === emp.employee_id);
      const assignedLevel = empLevel?.stylist_level ? levelBySlug[empLevel.stylist_level] : null;
      const svcRate = assignedLevel?.service_commission_rate ?? defaultSvcRate;
      const retailRate = assignedLevel?.retail_commission_rate ?? defaultRetailRate;
      commissionPay = projectedServices * svcRate + projectedProducts * retailRate;
    }

    totalBasePay += basePay;
    totalCommissionPay += commissionPay;
    totalForecast += basePay + commissionPay;
  }

  return { forecast: totalForecast, tipsCollected: totalTips, totalBasePay, totalCommissionPay };
}

function calculateCompensationBreakdown(payrollRuns: any[]): CompensationBreakdown {
  const processedRuns = payrollRuns
    .filter(run => run.status === 'processed')
    .slice(0, 6);

  if (processedRuns.length === 0) {
    return {
      basePay: 0,
      serviceCommissions: 0,
      productCommissions: 0,
      bonuses: 0,
      tips: 0,
    };
  }

  const totals = processedRuns.reduce((acc, run) => ({
    basePay: acc.basePay + (run.total_base_pay || 0),
    serviceCommissions: acc.serviceCommissions + (run.total_service_commissions || 0),
    productCommissions: acc.productCommissions + (run.total_product_commissions || 0),
    bonuses: acc.bonuses + (run.total_bonuses || 0),
    tips: acc.tips + (run.total_tips || 0),
  }), {
    basePay: 0,
    serviceCommissions: 0,
    productCommissions: 0,
    bonuses: 0,
    tips: 0,
  });

  return totals;
}
