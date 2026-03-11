import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RentPayment {
  id: string;
  organization_id: string;
  booth_renter_id: string;
  contract_id: string;
  period_start: string;
  period_end: string;
  due_date: string;
  base_rent: number;
  late_fee: number;
  credits_applied: number;
  adjustments: number;
  adjustment_notes: string | null;
  amount_paid: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'waived';
  paid_at: string | null;
  payment_method: string | null;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  autopay_scheduled: boolean;
  autopay_attempted_at: string | null;
  autopay_failed_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  total_due: number;
  balance: number;
  // Joined
  renter_name?: string;
  renter_business_name?: string;
}

export interface RecordPaymentData {
  paymentId: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
}

export interface CreatePaymentData {
  organization_id: string;
  booth_renter_id: string;
  contract_id: string;
  period_start: string;
  period_end: string;
  due_date: string;
  base_rent: number;
  late_fee?: number;
  credits_applied?: number;
  adjustments?: number;
  adjustment_notes?: string;
  autopay_scheduled?: boolean;
}

export function useRentPayments(filters: {
  organizationId?: string;
  boothRenterId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
} = {}) {
  return useQuery({
    queryKey: ['rent-payments', filters],
    queryFn: async () => {
      let query = supabase
        .from('rent_payments' as any)
        .select('*')
        .order('due_date', { ascending: true });

      if (filters.organizationId) {
        query = query.eq('organization_id', filters.organizationId);
      }

      if (filters.boothRenterId) {
        query = query.eq('booth_renter_id', filters.boothRenterId);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.startDate) {
        query = query.gte('due_date', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('due_date', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch renter names
      const renterIds = [...new Set((data || []).map((p: any) => p.booth_renter_id))];
      const { data: profiles } = await supabase
        .from('booth_renter_profiles' as any)
        .select('id, business_name, user_id')
        .in('id', renterIds);

      const userIds = (profiles || []).map((p: any) => p.user_id);
      const { data: employeeProfiles } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name')
        .in('user_id', userIds);

      const empMap = new Map((employeeProfiles || []).map(e => [e.user_id, e]));
      const profileMap = new Map((profiles || []).map((p: any) => {
        const emp = empMap.get(p.user_id);
        return [p.id, { business_name: p.business_name, name: emp?.display_name || emp?.full_name }];
      }));

      return (data || []).map((payment: any) => {
        const total_due = payment.base_rent + payment.late_fee - payment.credits_applied + payment.adjustments;
        const balance = total_due - payment.amount_paid;
        const profile = profileMap.get(payment.booth_renter_id);
        return {
          ...payment,
          total_due,
          balance,
          renter_name: profile?.name,
          renter_business_name: profile?.business_name,
        };
      }) as RentPayment[];
    },
  });
}

export function useRentPaymentsSummary(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['rent-payments-summary', organizationId],
    queryFn: async () => {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('rent_payments' as any)
        .select('status, base_rent, late_fee, credits_applied, adjustments, amount_paid, due_date')
        .eq('organization_id', organizationId!)
        .gte('due_date', startOfMonth);

      if (error) throw error;

      const summary = {
        totalDue: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        overdueCount: 0,
        overdueAmount: 0,
        pendingCount: 0,
        paidCount: 0,
      };

      ((data as any[]) || []).forEach((payment: any) => {
        const total_due = payment.base_rent + payment.late_fee - payment.credits_applied + payment.adjustments;
        summary.totalDue += total_due;
        summary.totalCollected += payment.amount_paid;

        if (payment.status === 'paid') {
          summary.paidCount++;
        } else if (payment.status === 'overdue') {
          summary.overdueCount++;
          summary.overdueAmount += total_due - payment.amount_paid;
        } else if (payment.status === 'pending') {
          summary.pendingCount++;
        }
      });

      summary.totalOutstanding = summary.totalDue - summary.totalCollected;

      return summary;
    },
    enabled: !!organizationId,
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, amount, paymentMethod, notes }: RecordPaymentData) => {
      // Get current payment to calculate new total
      const { data: current, error: fetchError } = await supabase
        .from('rent_payments' as any)
        .select('amount_paid, base_rent, late_fee, credits_applied, adjustments')
        .eq('id', paymentId)
        .single();

      if (fetchError) throw fetchError;

      const currentPayment = current as any;
      const newAmountPaid = currentPayment.amount_paid + amount;
      const total_due = currentPayment.base_rent + currentPayment.late_fee - currentPayment.credits_applied + currentPayment.adjustments;
      const newBalance = total_due - newAmountPaid;

      let newStatus: string = 'partial';
      if (newBalance <= 0) {
        newStatus = 'paid';
      }

      const { data: updated, error } = await supabase
        .from('rent_payments' as any)
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
          payment_method: paymentMethod,
          notes: notes || null,
        } as any)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-payments'] });
      queryClient.invalidateQueries({ queryKey: ['rent-payments-summary'] });
      queryClient.invalidateQueries({ queryKey: ['rent-revenue-analytics'] });
      toast.success('Payment recorded');
    },
    onError: (error) => {
      toast.error('Failed to record payment', { description: error.message });
    },
  });
}

export function useCreateRentPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePaymentData) => {
      const { data: payment, error } = await supabase
        .from('rent_payments' as any)
        .insert({
          ...data,
          status: 'pending',
        } as any)
        .select()
        .single();

      if (error) throw error;
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-payments'] });
      queryClient.invalidateQueries({ queryKey: ['rent-payments-summary'] });
      toast.success('Rent payment created');
    },
    onError: (error) => {
      toast.error('Failed to create payment', { description: error.message });
    },
  });
}

export function useWaivePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason: string }) => {
      const { data: updated, error } = await supabase
        .from('rent_payments' as any)
        .update({
          status: 'waived',
          notes: reason,
        } as any)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-payments'] });
      queryClient.invalidateQueries({ queryKey: ['rent-payments-summary'] });
      toast.success('Payment waived');
    },
    onError: (error) => {
      toast.error('Failed to waive payment', { description: error.message });
    },
  });
}

export function useApplyLateFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, lateFee }: { paymentId: string; lateFee: number }) => {
      const { data: updated, error } = await supabase
        .from('rent_payments' as any)
        .update({
          late_fee: lateFee,
          status: 'overdue',
        } as any)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-payments'] });
      queryClient.invalidateQueries({ queryKey: ['rent-payments-summary'] });
      toast.success('Late fee applied');
    },
    onError: (error) => {
      toast.error('Failed to apply late fee', { description: error.message });
    },
  });
}
