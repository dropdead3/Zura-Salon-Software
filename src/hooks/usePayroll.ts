import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { usePayrollConnection } from './usePayrollConnection';
import { toast } from 'sonner';
import { EmployeeCompensation } from './usePayrollCalculations';

export interface PayrollRun {
  id: string;
  organization_id: string;
  provider: 'gusto' | 'quickbooks';
  external_payroll_id: string | null;
  pay_period_start: string;
  pay_period_end: string;
  check_date: string;
  status: 'draft' | 'submitted' | 'processing' | 'processed' | 'cancelled' | 'failed';
  total_gross_pay: number;
  total_employer_taxes: number;
  total_employee_deductions: number;
  total_net_pay: number;
  employee_count: number;
  submitted_by: string | null;
  submitted_at: string | null;
  processed_at: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollLineItem {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  external_employee_id: string | null;
  gross_pay: number;
  regular_hours: number;
  overtime_hours: number;
  hourly_pay: number;
  salary_pay: number;
  commission_pay: number;
  bonus_pay: number;
  tips: number;
  employee_taxes: number;
  employee_deductions: number;
  employer_taxes: number;
  net_pay: number;
  metadata: Record<string, any> | null;
}

export function usePayroll() {
  const { selectedOrganization } = useOrganizationContext();
  const organizationId = selectedOrganization?.id;
  const { isConnected, provider } = usePayrollConnection();
  const queryClient = useQueryClient();

  // Fetch payroll runs from local DB
  const { data: payrollRuns, isLoading: isLoadingRuns } = useQuery({
    queryKey: ['payroll-runs', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('check_date', { ascending: false });
      
      if (error) throw error;
      return data as unknown as PayrollRun[];
    },
    enabled: !!organizationId,
  });

  // Fetch line items for a specific payroll run
  const usePayrollLineItems = (payrollRunId: string | null) => {
    return useQuery({
      queryKey: ['payroll-line-items', payrollRunId],
      queryFn: async () => {
        if (!payrollRunId) return [];
        
        const { data, error } = await supabase
          .from('payroll_line_items')
          .select(`
            *,
            employee:employee_profiles!payroll_line_items_employee_id_fkey(
              user_id,
              full_name,
              display_name,
              photo_url
            )
          `)
          .eq('payroll_run_id', payrollRunId);
        
        if (error) throw error;
        return data;
      },
      enabled: !!payrollRunId,
    });
  };

  // Sync payroll data from provider
  const syncPayrolls = useMutation({
    mutationFn: async ({ startDate, endDate }: { startDate?: string; endDate?: string } = {}) => {
      if (!organizationId || !isConnected) {
        throw new Error('No payroll provider connected');
      }
      
      const { data, error } = await supabase.functions.invoke('payroll-proxy', {
        body: {
          organizationId,
          action: 'getPayrolls',
          data: { startDate, endDate },
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      toast.success('Payroll data synced');
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  // Get employees from provider
  const { data: providerEmployees, refetch: refetchEmployees } = useQuery({
    queryKey: ['payroll-provider-employees', organizationId],
    queryFn: async () => {
      if (!organizationId || !isConnected) return [];
      
      const { data, error } = await supabase.functions.invoke('payroll-proxy', {
        body: {
          organizationId,
          action: 'getEmployees',
        },
      });
      
      if (error) throw error;
      return data?.data || [];
    },
    enabled: !!organizationId && isConnected,
    staleTime: 5 * 60 * 1000,
  });

  // Get pay schedules from provider
  const { data: paySchedules } = useQuery({
    queryKey: ['payroll-pay-schedules', organizationId],
    queryFn: async () => {
      if (!organizationId || !isConnected) return [];
      
      const { data, error } = await supabase.functions.invoke('payroll-proxy', {
        body: {
          organizationId,
          action: 'getPaySchedules',
        },
      });
      
      if (error) throw error;
      return data?.data || [];
    },
    enabled: !!organizationId && isConnected,
    staleTime: 10 * 60 * 1000,
  });

  // Create a new payroll run
  const createPayrollRun = useMutation({
    mutationFn: async (payrollData: {
      payPeriodStart: string;
      payPeriodEnd: string;
      checkDate: string;
      employees?: { id: string; hours?: number; commission?: number }[];
    }) => {
      if (!organizationId || !isConnected) {
        throw new Error('No payroll provider connected');
      }
      
      const { data, error } = await supabase.functions.invoke('payroll-proxy', {
        body: {
          organizationId,
          action: 'createPayroll',
          data: {
            payroll: {
              pay_period: {
                start_date: payrollData.payPeriodStart,
                end_date: payrollData.payPeriodEnd,
              },
              check_date: payrollData.checkDate,
              employee_compensations: payrollData.employees,
            },
          },
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      toast.success('Payroll run created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create payroll: ${error.message}`);
    },
  });

  // Submit payroll for processing
  const submitPayroll = useMutation({
    mutationFn: async (payrollId: string) => {
      if (!organizationId || !isConnected) {
        throw new Error('No payroll provider connected');
      }
      
      const { data, error } = await supabase.functions.invoke('payroll-proxy', {
        body: {
          organizationId,
          action: 'submitPayroll',
          data: { payrollId },
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      toast.success('Payroll submitted for processing');
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit payroll: ${error.message}`);
    },
  });

  // Create a local payroll run (stored in database, not sent to provider)
  const createLocalPayrollRun = useMutation({
    mutationFn: async (data: {
      payPeriodStart: string;
      payPeriodEnd: string;
      checkDate: string;
      status: 'draft' | 'submitted';
      lineItems: EmployeeCompensation[];
    }) => {
      if (!organizationId) {
        throw new Error('No organization selected');
      }

      // Calculate totals from line items
      const totals = data.lineItems.reduce(
        (acc, item) => ({
          grossPay: acc.grossPay + item.grossPay,
          employerTaxes: acc.employerTaxes + item.employerTaxes,
          employeeTaxes: acc.employeeTaxes + item.estimatedTaxes,
          deductions: acc.deductions + item.deductions,
          netPay: acc.netPay + item.netPay,
        }),
        { grossPay: 0, employerTaxes: 0, employeeTaxes: 0, deductions: 0, netPay: 0 }
      );

      // Insert payroll run
      const { data: payrollRun, error: runError } = await supabase
        .from('payroll_runs')
        .insert({
          organization_id: organizationId,
          provider: provider || 'gusto',
          pay_period_start: data.payPeriodStart,
          pay_period_end: data.payPeriodEnd,
          check_date: data.checkDate,
          status: data.status,
          total_gross_pay: totals.grossPay,
          total_employer_taxes: totals.employerTaxes,
          total_employee_deductions: totals.deductions,
          total_net_pay: totals.netPay,
          employee_count: data.lineItems.length,
        })
        .select()
        .single();

      if (runError) throw runError;

      // Insert line items
      const lineItemsToInsert = data.lineItems.map((item) => ({
        payroll_run_id: payrollRun.id,
        employee_id: item.employeeId,
        gross_pay: item.grossPay,
        regular_hours: item.regularHours,
        overtime_hours: item.overtimeHours,
        hourly_pay: item.hourlyPay,
        salary_pay: item.salaryPay,
        commission_pay: item.commissionPay,
        bonus_pay: item.bonusPay,
        tips: item.tips,
        employee_taxes: item.estimatedTaxes,
        employer_taxes: item.employerTaxes,
        employee_deductions: item.deductions,
        net_pay: item.netPay,
      }));

      const { error: itemsError } = await supabase
        .from('payroll_line_items')
        .insert(lineItemsToInsert);

      if (itemsError) throw itemsError;

      return payrollRun;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      toast.success(
        variables.status === 'draft'
          ? 'Payroll saved as draft'
          : 'Payroll finalized successfully'
      );
    },
    onError: (error: Error) => {
      toast.error(`Failed to save payroll: ${error.message}`);
    },
  });

  return {
    // Data
    payrollRuns: payrollRuns || [],
    isLoadingRuns,
    providerEmployees: providerEmployees || [],
    paySchedules: paySchedules || [],
    
    // Queries
    usePayrollLineItems,
    
    // Mutations
    syncPayrolls: syncPayrolls.mutate,
    isSyncing: syncPayrolls.isPending,
    createPayrollRun: createPayrollRun.mutate,
    isCreatingRun: createPayrollRun.isPending,
    submitPayroll: submitPayroll.mutate,
    isSubmitting: submitPayroll.isPending,
    createLocalPayrollRun: createLocalPayrollRun.mutate,
    isCreatingLocalRun: createLocalPayrollRun.isPending,
    refetchEmployees,
  };
}
