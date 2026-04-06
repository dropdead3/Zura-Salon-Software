import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStylistLevels } from './useStylistLevels';
import { EmployeePayrollSettings, PayType } from './useEmployeePayrollSettings';

// EmployeeHours, EmployeeAdjustments, EmployeeSalesData, EmployeeCompensation, PayrollTotals interfaces and TAX_RATES
export interface EmployeeHours {
  employeeId: string;
  regularHours: number;
  overtimeHours: number;
}

export interface EmployeeAdjustments {
  employeeId: string;
  bonus: number;
  tips: number;
  deductions: number;
}

export interface EmployeeSalesData {
  employeeId: string;
  serviceRevenue: number;
  productRevenue: number;
}

export interface EmployeeCompensation {
  employeeId: string;
  employeeName: string;
  photoUrl: string | null;
  payType: PayType;
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number | null;
  hourlyPay: number;
  salaryPay: number;
  commissionPay: number;
  serviceCommission: number;
  productCommission: number;
  bonusPay: number;
  tips: number;
  deductions: number;
  grossPay: number;
  estimatedFederalTax: number;
  estimatedStateTax: number;
  estimatedFICA: number;
  estimatedTaxes: number;
  employerTaxes: number;
  netPay: number;
}

export interface PayrollTotals {
  grossPay: number;
  totalHourlyPay: number;
  totalSalaryPay: number;
  totalCommissions: number;
  totalBonuses: number;
  totalTips: number;
  totalDeductions: number;
  employeeTaxes: number;
  employerTaxes: number;
  netPay: number;
  employeeCount: number;
}

// Tax rate constants (approximate withholding rates)
const TAX_RATES = {
  FEDERAL: 0.22,
  STATE: 0.05,
  FICA_EMPLOYEE: 0.0765,
  FICA_EMPLOYER: 0.0765,
  FUTA: 0.006,
  SUTA: 0.027,
};

export function usePayrollSalesData(
  payPeriodStart: string | null,
  payPeriodEnd: string | null,
  employeeIds: string[]
) {
  return useQuery({
    queryKey: ['payroll-sales-data', payPeriodStart, payPeriodEnd, employeeIds],
    queryFn: async () => {
      if (!payPeriodStart || !payPeriodEnd || employeeIds.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('phorest_daily_sales_summary')
        .select('user_id, service_revenue, product_revenue, summary_date')
        .gte('summary_date', payPeriodStart)
        .lte('summary_date', payPeriodEnd)
        .in('user_id', employeeIds);

      if (error) throw error;

      const aggregated = (data || []).reduce((acc, row) => {
        if (!row.user_id) return acc;
        if (!acc[row.user_id]) {
          acc[row.user_id] = { serviceRevenue: 0, productRevenue: 0 };
        }
        acc[row.user_id].serviceRevenue += Number(row.service_revenue) || 0;
        acc[row.user_id].productRevenue += Number(row.product_revenue) || 0;
        return acc;
      }, {} as Record<string, { serviceRevenue: number; productRevenue: number }>);

      return Object.entries(aggregated).map(([employeeId, sales]) => ({
        employeeId,
        ...sales,
      }));
    },
    enabled: !!payPeriodStart && !!payPeriodEnd && employeeIds.length > 0,
  });
}

export function usePayrollCalculations() {
  const { data: levels } = useStylistLevels();

  // Build a simple calculateCommission from levels (flat lookup, no user context)
  const calculateCommission = (serviceRevenue: number, productRevenue: number) => {
    // Without user context, use median level rate as fallback
    if (!levels || levels.length === 0) {
      return { serviceCommission: 0, productCommission: 0, totalCommission: 0, tierName: '' };
    }
    const midLevel = levels[Math.floor(levels.length / 2)];
    const svcRate = midLevel.service_commission_rate ?? 0;
    const retailRate = midLevel.retail_commission_rate ?? 0;
    return {
      serviceCommission: serviceRevenue * svcRate,
      productCommission: productRevenue * retailRate,
      totalCommission: serviceRevenue * svcRate + productRevenue * retailRate,
      tierName: midLevel.label,
    };
  };

  const calculateEmployeeCompensation = (
    settings: EmployeePayrollSettings,
    hours: EmployeeHours,
    salesData: EmployeeSalesData | undefined,
    adjustments: EmployeeAdjustments | undefined,
    weeksInPeriod: number = 2,
    employeeLevelSlug?: string | null
  ): EmployeeCompensation => {
    let hourlyRate = settings.hourly_rate || 0;
    // Fallback: use level's hourly_wage if employee has no rate set
    if (!hourlyRate && employeeLevelSlug && levels) {
      const matchedLevel = levels.find(l => l.slug === employeeLevelSlug);
      if (matchedLevel?.hourly_wage_enabled && matchedLevel.hourly_wage) {
        hourlyRate = matchedLevel.hourly_wage;
      }
    }
    const annualSalary = settings.salary_amount || 0;
    const payType = settings.pay_type;

    let hourlyPay = 0;
    if (payType === 'hourly' || payType === 'hourly_plus_commission') {
      const regularPay = hours.regularHours * hourlyRate;
      const overtimePay = hours.overtimeHours * hourlyRate * 1.5;
      hourlyPay = regularPay + overtimePay;
    }

    let salaryPay = 0;
    if (payType === 'salary' || payType === 'salary_plus_commission') {
      salaryPay = (annualSalary / 26) * (weeksInPeriod / 2);
    }

    let commissionPay = 0;
    let serviceCommission = 0;
    let productCommission = 0;
    if (
      settings.commission_enabled &&
      salesData &&
      (payType === 'commission' ||
        payType === 'hourly_plus_commission' ||
        payType === 'salary_plus_commission')
    ) {
      const commission = calculateCommission(
        salesData.serviceRevenue,
        salesData.productRevenue
      );
      serviceCommission = commission.serviceCommission;
      productCommission = commission.productCommission;
      commissionPay = commission.totalCommission;
    }

    const bonus = adjustments?.bonus || 0;
    const tips = adjustments?.tips || 0;
    const deductions = adjustments?.deductions || 0;

    const grossPay = hourlyPay + salaryPay + commissionPay + bonus + tips;
    const taxableIncome = grossPay;
    const estimatedFederalTax = taxableIncome * TAX_RATES.FEDERAL;
    const estimatedStateTax = taxableIncome * TAX_RATES.STATE;
    const estimatedFICA = taxableIncome * TAX_RATES.FICA_EMPLOYEE;
    const estimatedTaxes = estimatedFederalTax + estimatedStateTax + estimatedFICA;
    const employerTaxes =
      taxableIncome * TAX_RATES.FICA_EMPLOYER +
      taxableIncome * TAX_RATES.FUTA +
      taxableIncome * TAX_RATES.SUTA;
    const netPay = grossPay - estimatedTaxes - deductions;

    return {
      employeeId: settings.employee_id,
      employeeName: settings.employee?.full_name || 'Unknown',
      photoUrl: settings.employee?.photo_url || null,
      payType,
      regularHours: hours.regularHours,
      overtimeHours: hours.overtimeHours,
      hourlyRate,
      hourlyPay,
      salaryPay,
      commissionPay,
      serviceCommission,
      productCommission,
      bonusPay: bonus,
      tips,
      deductions,
      grossPay,
      estimatedFederalTax,
      estimatedStateTax,
      estimatedFICA,
      estimatedTaxes,
      employerTaxes,
      netPay,
    };
  };

  const calculatePayrollTotals = (
    compensations: EmployeeCompensation[]
  ): PayrollTotals => {
    return compensations.reduce(
      (totals, comp) => ({
        grossPay: totals.grossPay + comp.grossPay,
        totalHourlyPay: totals.totalHourlyPay + comp.hourlyPay,
        totalSalaryPay: totals.totalSalaryPay + comp.salaryPay,
        totalCommissions: totals.totalCommissions + comp.commissionPay,
        totalBonuses: totals.totalBonuses + comp.bonusPay,
        totalTips: totals.totalTips + comp.tips,
        totalDeductions: totals.totalDeductions + comp.deductions,
        employeeTaxes: totals.employeeTaxes + comp.estimatedTaxes,
        employerTaxes: totals.employerTaxes + comp.employerTaxes,
        netPay: totals.netPay + comp.netPay,
        employeeCount: totals.employeeCount + 1,
      }),
      {
        grossPay: 0,
        totalHourlyPay: 0,
        totalSalaryPay: 0,
        totalCommissions: 0,
        totalBonuses: 0,
        totalTips: 0,
        totalDeductions: 0,
        employeeTaxes: 0,
        employerTaxes: 0,
        netPay: 0,
        employeeCount: 0,
      }
    );
  };

  const getWeeksInPeriod = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.round(diffDays / 7));
  };

  return {
    calculateEmployeeCompensation,
    calculatePayrollTotals,
    getWeeksInPeriod,
    commissionTiers: levels || [],
  };
}
