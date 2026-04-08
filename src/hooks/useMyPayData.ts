import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { usePayrollCalculations, EmployeeCompensation } from './usePayrollCalculations';
import { useResolveCommission } from './useResolveCommission';
import { EmployeePayrollSettings, PayType } from './useEmployeePayrollSettings';
import { startOfMonth, endOfMonth, format, subDays, addDays } from 'date-fns';
import { usePaySchedule, getCurrentPayPeriod } from './usePaySchedule';

export interface PayStub {
  id: string;
  payrollRunId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  checkDate: string;
  status: string;
  grossPay: number;
  regularHours: number;
  overtimeHours: number;
  hourlyPay: number;
  salaryPay: number;
  commissionPay: number;
  bonusPay: number;
  tips: number;
  taxes: number;
  deductions: number;
  netPay: number;
}

export interface CurrentPeriod {
  startDate: string;
  endDate: string;
  checkDate: string;
}

export interface MyPayData {
  settings: EmployeePayrollSettings | null;
  currentPeriod: CurrentPeriod;
  salesData: {
    serviceRevenue: number;
    productRevenue: number;
  };
  estimatedCompensation: EmployeeCompensation | null;
  payStubs: PayStub[];
  isLoading: boolean;
  error: Error | null;
}

function inferCurrentPayPeriod(): CurrentPeriod {
  // Default fallback when no pay schedule is configured
  const today = new Date();
  const dayOfMonth = today.getDate();
  
  // Bi-weekly assumption: 1st-15th, 16th-end of month
  let startDate: Date;
  let endDate: Date;
  
  if (dayOfMonth <= 15) {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    endDate = new Date(today.getFullYear(), today.getMonth(), 15);
  } else {
    startDate = new Date(today.getFullYear(), today.getMonth(), 16);
    endDate = endOfMonth(today);
  }
  
  // Check date is typically 5 business days after period end
  const checkDate = addDays(endDate, 5);
  
  return {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    checkDate: format(checkDate, 'yyyy-MM-dd'),
  };
}

export function useMyPayData(): MyPayData {
  const { user } = useAuth();
  const { selectedOrganization } = useOrganizationContext();
  const organizationId = selectedOrganization?.id;
  const { calculateEmployeeCompensation, getWeeksInPeriod } = usePayrollCalculations();
  const { resolveCommission } = useResolveCommission();
  const { settings: payScheduleSettings, isLoading: payScheduleLoading } = usePaySchedule();

  // Use configured pay schedule or fall back to inferred period
  const currentPeriod = useMemo(() => {
    if (payScheduleSettings) {
      const period = getCurrentPayPeriod(payScheduleSettings);
      return {
        startDate: format(period.periodStart, 'yyyy-MM-dd'),
        endDate: format(period.periodEnd, 'yyyy-MM-dd'),
        checkDate: format(period.nextPayDay, 'yyyy-MM-dd'),
      };
    }
    return inferCurrentPayPeriod();
  }, [payScheduleSettings]);

  // Fetch employee's payroll settings
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ['my-payroll-settings', user?.id, organizationId],
    queryFn: async () => {
      if (!user?.id || !organizationId) return null;
      
      const { data, error } = await supabase
        .from('employee_payroll_settings')
        .select(`
          *,
          employee:employee_profiles!employee_payroll_settings_employee_id_fkey(
            user_id,
            full_name,
            display_name,
            photo_url,
            email,
            is_active
          )
        `)
        .eq('employee_id', user.id)
        .eq('organization_id', organizationId)
        .maybeSingle();
      
      if (error) throw error;
      return data as EmployeePayrollSettings | null;
    },
    enabled: !!user?.id && !!organizationId,
  });

  // Fetch employee's stylist_level slug for level-based hourly wage fallback
  const { data: employeeProfile } = useQuery({
    queryKey: ['my-employee-profile-level', user?.id, organizationId],
    queryFn: async () => {
      if (!user?.id || !organizationId) return null;
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('stylist_level')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!organizationId,
  });

  // Fetch current period sales data for commission calculation (from live POS transaction items)
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['my-sales-data', user?.id, currentPeriod.startDate, currentPeriod.endDate],
    queryFn: async () => {
      if (!user?.id) return { serviceRevenue: 0, productRevenue: 0 };
      
      const allData: any[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('phorest_transaction_items')
          .select('total_amount, tax_amount, item_type')
          .eq('stylist_user_id', user.id)
          .gte('transaction_date', currentPeriod.startDate)
          .lte('transaction_date', currentPeriod.endDate)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }
      
      let serviceRevenue = 0;
      let productRevenue = 0;
      for (const item of allData) {
        const amount = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
        const itemType = (item.item_type || '').toLowerCase();
        if (itemType === 'service') {
          serviceRevenue += amount;
        } else {
          productRevenue += amount;
        }
      }
      
      return { serviceRevenue, productRevenue };
    },
    enabled: !!user?.id,
  });

  // Fetch pay stub history
  const { data: payStubs, isLoading: stubsLoading } = useQuery({
    queryKey: ['my-pay-stubs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('payroll_line_items')
        .select(`
          id,
          payroll_run_id,
          gross_pay,
          regular_hours,
          overtime_hours,
          hourly_pay,
          salary_pay,
          commission_pay,
          bonus_pay,
          tips,
          employee_taxes,
          employee_deductions,
          net_pay,
          payroll_run:payroll_runs!payroll_line_items_payroll_run_id_fkey(
            pay_period_start,
            pay_period_end,
            check_date,
            status
          )
        `)
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map((item): PayStub => ({
        id: item.id,
        payrollRunId: item.payroll_run_id,
        payPeriodStart: (item.payroll_run as any)?.pay_period_start || '',
        payPeriodEnd: (item.payroll_run as any)?.pay_period_end || '',
        checkDate: (item.payroll_run as any)?.check_date || '',
        status: (item.payroll_run as any)?.status || 'unknown',
        grossPay: Number(item.gross_pay) || 0,
        regularHours: Number(item.regular_hours) || 0,
        overtimeHours: Number(item.overtime_hours) || 0,
        hourlyPay: Number(item.hourly_pay) || 0,
        salaryPay: Number(item.salary_pay) || 0,
        commissionPay: Number(item.commission_pay) || 0,
        bonusPay: Number(item.bonus_pay) || 0,
        tips: Number(item.tips) || 0,
        taxes: Number(item.employee_taxes) || 0,
        deductions: Number(item.employee_deductions) || 0,
        netPay: Number(item.net_pay) || 0,
      }));
    },
    enabled: !!user?.id,
  });

  const employeeLevelSlug = employeeProfile?.stylist_level || null;

  // Calculate estimated compensation for current period
  const estimatedCompensation = settings && salesData
    ? calculateEmployeeCompensation(
        settings,
        { employeeId: user?.id || '', regularHours: 80, overtimeHours: 0 },
        { employeeId: user?.id || '', ...salesData },
        undefined,
        getWeeksInPeriod(currentPeriod.startDate, currentPeriod.endDate),
        employeeLevelSlug,
        resolveCommission
      )
    : null;

  return {
    settings: settings || null,
    currentPeriod,
    salesData: salesData || { serviceRevenue: 0, productRevenue: 0 },
    estimatedCompensation,
    payStubs: payStubs || [],
    isLoading: settingsLoading || salesLoading || stubsLoading,
    error: settingsError as Error | null,
  };
}
