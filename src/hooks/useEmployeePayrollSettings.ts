import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export type PayType = 'hourly' | 'salary' | 'commission' | 'hourly_plus_commission' | 'salary_plus_commission';
export type DirectDepositStatus = 'not_started' | 'pending' | 'verified' | 'failed';

export interface EmployeePayrollSettings {
  id: string;
  employee_id: string;
  organization_id: string;
  external_employee_id: string | null;
  pay_type: PayType;
  hourly_rate: number | null;
  salary_amount: number | null;
  commission_enabled: boolean;
  direct_deposit_status: DirectDepositStatus;
  is_payroll_active: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  // Joined employee data
  employee?: {
    user_id: string;
    full_name: string;
    display_name: string | null;
    photo_url: string | null;
    email: string | null;
    is_active: boolean;
  };
}

export function useEmployeePayrollSettings() {
  const { selectedOrganization } = useOrganizationContext();
  const organizationId = selectedOrganization?.id;
  const queryClient = useQueryClient();

  // Fetch all employee payroll settings for the organization
  const { data: employeeSettings, isLoading, error } = useQuery({
    queryKey: ['employee-payroll-settings', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
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
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as EmployeePayrollSettings[];
    },
    enabled: !!organizationId,
  });

  // Fetch employees without payroll settings (for adding new employees)
  const { data: employeesWithoutSettings } = useQuery({
    queryKey: ['employees-without-payroll-settings', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      // Get all active employees in the organization
      const { data: employees, error: empError } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, photo_url, email')
        .eq('organization_id', organizationId)
        .eq('is_active', true);
      
      if (empError) throw empError;
      
      // Get employees that already have payroll settings
      const { data: existingSettings, error: settingsError } = await supabase
        .from('employee_payroll_settings')
        .select('employee_id')
        .eq('organization_id', organizationId);
      
      if (settingsError) throw settingsError;
      
      const existingEmployeeIds = new Set(existingSettings?.map(s => s.employee_id));
      
      return employees?.filter(emp => !existingEmployeeIds.has(emp.user_id)) || [];
    },
    enabled: !!organizationId,
  });

  // Create or update employee payroll settings
  const upsertSettings = useMutation({
    mutationFn: async (settings: {
      employee_id: string;
      pay_type: PayType;
      hourly_rate?: number | null;
      salary_amount?: number | null;
      commission_enabled?: boolean;
      is_payroll_active?: boolean;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { data, error } = await supabase
        .from('employee_payroll_settings')
        .upsert({
          employee_id: settings.employee_id,
          organization_id: organizationId,
          pay_type: settings.pay_type,
          hourly_rate: settings.hourly_rate,
          salary_amount: settings.salary_amount,
          commission_enabled: settings.commission_enabled ?? false,
          is_payroll_active: settings.is_payroll_active ?? true,
        }, { 
          onConflict: 'employee_id,organization_id',
          ignoreDuplicates: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-payroll-settings'] });
      queryClient.invalidateQueries({ queryKey: ['employees-without-payroll-settings'] });
      toast.success('Employee payroll settings saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  // Update direct deposit status
  const updateDirectDepositStatus = useMutation({
    mutationFn: async ({ 
      employeeId, 
      status 
    }: { 
      employeeId: string; 
      status: DirectDepositStatus;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { error } = await supabase
        .from('employee_payroll_settings')
        .update({ direct_deposit_status: status })
        .eq('employee_id', employeeId)
        .eq('organization_id', organizationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-payroll-settings'] });
    },
  });

  // Toggle payroll active status
  const togglePayrollActive = useMutation({
    mutationFn: async ({ 
      employeeId, 
      isActive 
    }: { 
      employeeId: string; 
      isActive: boolean;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { error } = await supabase
        .from('employee_payroll_settings')
        .update({ is_payroll_active: isActive })
        .eq('employee_id', employeeId)
        .eq('organization_id', organizationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-payroll-settings'] });
      toast.success('Payroll status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  // Delete employee payroll settings
  const deleteSettings = useMutation({
    mutationFn: async (employeeId: string) => {
      if (!organizationId) throw new Error('No organization selected');
      
      const { error } = await supabase
        .from('employee_payroll_settings')
        .delete()
        .eq('employee_id', employeeId)
        .eq('organization_id', organizationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-payroll-settings'] });
      queryClient.invalidateQueries({ queryKey: ['employees-without-payroll-settings'] });
      toast.success('Employee removed from payroll');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove employee: ${error.message}`);
    },
  });

  return {
    employeeSettings: employeeSettings || [],
    employeesWithoutSettings: employeesWithoutSettings || [],
    isLoading,
    error,
    upsertSettings: upsertSettings.mutate,
    isUpserting: upsertSettings.isPending,
    updateDirectDepositStatus: updateDirectDepositStatus.mutate,
    togglePayrollActive: togglePayrollActive.mutate,
    deleteSettings: deleteSettings.mutate,
    isDeleting: deleteSettings.isPending,
  };
}
