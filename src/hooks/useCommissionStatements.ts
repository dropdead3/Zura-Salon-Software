import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CommissionStatement {
  id: string;
  organization_id: string;
  booth_renter_id: string;
  period_start: string;
  period_end: string;
  total_retail_sales: number;
  total_service_revenue: number | null;
  commission_rate: number;
  total_commission: number;
  deductions: number | null;
  deduction_notes: string | null;
  net_payout: number;
  status: 'pending' | 'approved' | 'paid' | 'disputed';
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  statement_pdf_url: string | null;
  line_items: any[] | null;
  created_at: string;
  // Joined
  renter_name?: string;
  renter_business_name?: string;
}

export interface CreateStatementData {
  organization_id: string;
  booth_renter_id: string;
  period_start: string;
  period_end: string;
  total_retail_sales: number;
  total_service_revenue?: number;
  commission_rate: number;
  deductions?: number;
  deduction_notes?: string;
  line_items?: any[];
}

export function useCommissionStatements(filters: {
  organizationId?: string;
  boothRenterId?: string;
  status?: string;
  year?: number;
} = {}) {
  return useQuery({
    queryKey: ['commission-statements', filters],
    queryFn: async () => {
      let query = supabase
        .from('renter_commission_statements' as any)
        .select('*')
        .order('period_start', { ascending: false });

      if (filters.organizationId) {
        query = query.eq('organization_id', filters.organizationId);
      }

      if (filters.boothRenterId) {
        query = query.eq('booth_renter_id', filters.boothRenterId);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.year) {
        const startOfYear = `${filters.year}-01-01`;
        const endOfYear = `${filters.year}-12-31`;
        query = query.gte('period_start', startOfYear).lte('period_end', endOfYear);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch renter names
      const renterIds = [...new Set((data || []).map((s: any) => s.booth_renter_id))];
      const { data: renterProfiles } = await supabase
        .from('booth_renter_profiles' as any)
        .select('id, business_name, user_id')
        .in('id', renterIds);

      const userIds = (renterProfiles || []).map((p: any) => p.user_id);
      const { data: empProfiles } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name')
        .in('user_id', userIds);

      const empMap = new Map((empProfiles || []).map(e => [e.user_id, e]));
      const renterMap = new Map((renterProfiles || []).map((p: any) => {
        const emp = empMap.get(p.user_id);
        return [p.id, { business_name: p.business_name, name: emp ? formatDisplayName(emp.full_name || '', emp.display_name) : undefined }];
      }));

      return (data || []).map((statement: any) => {
        const renter = renterMap.get(statement.booth_renter_id);
        return {
          ...statement,
          renter_name: renter?.name,
          renter_business_name: renter?.business_name,
        };
      }) as CommissionStatement[];
    },
  });
}

export function useCreateCommissionStatement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStatementData) => {
      const total_commission = data.total_retail_sales * data.commission_rate;
      const net_payout = total_commission - (data.deductions || 0);

      const { data: statement, error } = await supabase
        .from('renter_commission_statements' as any)
        .insert({
          ...data,
          total_commission,
          net_payout,
          status: 'pending',
        } as any)
        .select()
        .single();

      if (error) throw error;
      return statement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-statements'] });
      toast.success('Commission statement created');
    },
    onError: (error) => {
      toast.error('Failed to create statement', { description: error.message });
    },
  });
}

export function useApproveStatement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (statementId: string) => {
      const { data, error } = await supabase
        .from('renter_commission_statements' as any)
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        } as any)
        .eq('id', statementId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-statements'] });
      toast.success('Statement approved');
    },
    onError: (error) => {
      toast.error('Failed to approve statement', { description: error.message });
    },
  });
}

export function useMarkStatementPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      statementId,
      paymentMethod,
      paymentReference,
    }: {
      statementId: string;
      paymentMethod: string;
      paymentReference?: string;
    }) => {
      const { data, error } = await supabase
        .from('renter_commission_statements' as any)
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: paymentMethod,
          payment_reference: paymentReference,
        } as any)
        .eq('id', statementId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-statements'] });
      toast.success('Statement marked as paid');
    },
    onError: (error) => {
      toast.error('Failed to update statement', { description: error.message });
    },
  });
}

export function useRenterYTDCommissions(boothRenterId: string | undefined) {
  return useQuery({
    queryKey: ['renter-ytd-commissions', boothRenterId],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('renter_commission_statements' as any)
        .select('total_retail_sales, total_commission, net_payout, status')
        .eq('booth_renter_id', boothRenterId!)
        .gte('period_start', `${currentYear}-01-01`)
        .lte('period_end', `${currentYear}-12-31`);

      if (error) throw error;

      return {
        totalSales: (data || []).reduce((sum: number, s: any) => sum + s.total_retail_sales, 0),
        totalCommission: (data || []).reduce((sum: number, s: any) => sum + s.total_commission, 0),
        totalPaid: (data || [])
          .filter((s: any) => s.status === 'paid')
          .reduce((sum: number, s: any) => sum + s.net_payout, 0),
        totalPending: (data || [])
          .filter((s: any) => s.status !== 'paid')
          .reduce((sum: number, s: any) => sum + s.net_payout, 0),
      };
    },
    enabled: !!boothRenterId,
  });
}
