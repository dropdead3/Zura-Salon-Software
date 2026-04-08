import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fetchAllBatched } from '@/utils/fetchAllBatched';
import { format, addDays } from 'date-fns';

export interface PhorestStaffMember {
  id: string;
  name: string;
  email?: string;
  branchId?: string;
  branchName?: string;
}

export interface PhorestBranch {
  id: string;
  name: string;
}

export interface PhorestConnectionStatus {
  connected: boolean;
  business?: {
    name: string;
    id: string;
  };
  staff_count?: number;
  staff_list?: PhorestStaffMember[];
  branch_list?: PhorestBranch[];
  error?: string;
}

export interface PhorestStaffMapping {
  id: string;
  user_id: string;
  phorest_staff_id: string;
  phorest_staff_name: string | null;
  phorest_staff_email: string | null;
  phorest_branch_id: string | null;
  phorest_branch_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PhorestSyncLog {
  id: string;
  sync_type: string;
  started_at: string;
  completed_at: string | null;
  records_synced: number;
  status: string;
  error_message: string | null;
}

export interface PhorestPerformanceMetrics {
  id: string;
  user_id: string;
  week_start: string;
  new_clients: number;
  retention_rate: number;
  retail_sales: number;
  extension_clients: number;
  total_revenue: number;
  service_count: number;
  average_ticket: number;
  rebooking_rate: number;
}

export function usePhorestConnection() {
  return useQuery({
    queryKey: ['phorest-connection'],
    queryFn: async (): Promise<PhorestConnectionStatus> => {
      const { data, error } = await supabase.functions.invoke('test-phorest-connection');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function usePhorestSyncLogs() {
  return useQuery({
    queryKey: ['phorest-sync-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_sync_log')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as PhorestSyncLog[];
    },
  });
}

export function usePhorestStaffMappings() {
  return useQuery({
    queryKey: ['phorest-staff-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_staff_mapping')
        .select(`
          *,
          employee_profiles:user_id (
            full_name,
            display_name,
            email
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useUserPhorestMapping(userId: string | undefined) {
  return useQuery({
    queryKey: ['phorest-user-mapping', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('phorest_staff_mapping')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function usePhorestPerformanceMetrics(weekStart?: string) {
  const weekEnd = weekStart ? format(addDays(new Date(weekStart), 6), 'yyyy-MM-dd') : undefined;

  return useQuery({
    queryKey: ['phorest-performance', weekStart],
    queryFn: async () => {
      if (!weekStart || !weekEnd) return [];

      // Fetch staff mappings to link phorest_staff_id → user_id
      const { data: mappings } = await supabase
        .from('phorest_staff_mapping')
        .select('phorest_staff_id, user_id, phorest_staff_name')
        .eq('is_active', true);

      const staffMap = new Map((mappings || []).map(m => [m.phorest_staff_id, m]));
      const userIds = [...new Set((mappings || []).filter(m => m.user_id).map(m => m.user_id!))];

      // Fetch employee profiles
      let profileMap = new Map<string, { full_name: string; display_name: string | null; photo_url: string | null }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('user_id, full_name, display_name, photo_url')
          .in('user_id', userIds);
        profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      }

      // Fetch appointments for the week (paginated)
      const appointments = await fetchAllBatched<{
        phorest_staff_id: string | null;
        phorest_client_id: string | null;
        total_price: number | null;
        tip_amount: number | null;
        status: string | null;
        rebooked_at_checkout: boolean | null;
        service_name: string | null;
      }>((from, to) =>
        supabase
          .from('phorest_appointments')
          .select('phorest_staff_id, phorest_client_id, total_price, tip_amount, status, rebooked_at_checkout, service_name')
          .gte('appointment_date', weekStart)
          .lte('appointment_date', weekEnd)
          .range(from, to)
      );

      // Fetch transaction items for retail revenue
      const txItems = await fetchAllBatched<{
        phorest_staff_id: string | null;
        total_amount: number | null;
        tax_amount: number | null;
        item_type: string | null;
      }>((from, to) =>
        supabase
          .from('phorest_transaction_items')
          .select('phorest_staff_id, total_amount, tax_amount, item_type')
          .gte('transaction_date', weekStart)
          .lte('transaction_date', weekEnd)
          .range(from, to)
      );

      // Aggregate by staff
      const byStaff = new Map<string, {
        total_revenue: number;
        retail_sales: number;
        service_count: number;
        new_clients: number;
        retention_rate: number;
        extension_clients: number;
        completed: number;
        rebooked: number;
        clientSet: Set<string>;
      }>();

      // Process appointments
      for (const apt of appointments) {
        const sid = apt.phorest_staff_id;
        if (!sid) continue;
        if (!byStaff.has(sid)) {
          byStaff.set(sid, {
            total_revenue: 0, retail_sales: 0, service_count: 0,
            new_clients: 0, retention_rate: 0, extension_clients: 0,
            completed: 0, rebooked: 0, clientSet: new Set(),
          });
        }
        const s = byStaff.get(sid)!;
        if (apt.status === 'completed') {
          s.total_revenue += (Number(apt.total_price) || 0) - (Number(apt.tip_amount) || 0);
          s.service_count += 1;
          s.completed += 1;
          if (apt.rebooked_at_checkout) s.rebooked += 1;
          if (apt.phorest_client_id) s.clientSet.add(apt.phorest_client_id);
        }
      }

      // Process retail from transaction items
      for (const tx of txItems) {
        const sid = tx.phorest_staff_id;
        if (!sid || tx.item_type !== 'product') continue;
        if (!byStaff.has(sid)) continue;
        byStaff.get(sid)!.retail_sales += (Number(tx.total_amount) || 0) + (Number(tx.tax_amount) || 0);
      }

      // Compute retention_rate as rebooking rate
      for (const s of byStaff.values()) {
        s.retention_rate = s.completed > 0 ? (s.rebooked / s.completed) * 100 : 0;
      }

      // Build results matching the old shape
      const results = Array.from(byStaff.entries())
        .map(([phorestId, s]) => {
          const mapping = staffMap.get(phorestId);
          const userId = mapping?.user_id || null;
          const profile = userId ? profileMap.get(userId) : undefined;
          const avgTicket = s.service_count > 0 ? s.total_revenue / s.service_count : 0;
          return {
            user_id: userId,
            phorest_staff_id: phorestId,
            week_start: weekStart,
            total_revenue: s.total_revenue,
            retail_sales: s.retail_sales,
            service_count: s.service_count,
            new_clients: s.new_clients,
            retention_rate: s.retention_rate,
            rebooking_rate: s.retention_rate, // alias for consumers expecting this field
            average_ticket: avgTicket,
            extension_clients: s.extension_clients,
            employee_profiles: profile || { full_name: mapping?.phorest_staff_name || 'Unknown', display_name: null, photo_url: null },
          };
        })
        .sort((a, b) => b.total_revenue - a.total_revenue);

      return results;
    },
    enabled: !!weekStart,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePhorestAppointments(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['phorest-appointments', dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('phorest_appointments')
        .select(`
          *,
          employee_profiles:stylist_user_id (
            full_name,
            display_name
          )
        `)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (dateFrom) {
        query = query.gte('appointment_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('appointment_date', dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!dateFrom || !!dateTo,
  });
}

export function useTriggerPhorestSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (syncType: 'staff' | 'appointments' | 'clients' | 'reports' | 'sales' | 'services' | 'all') => {
      // For services, use the dedicated edge function
      if (syncType === 'services') {
        const { data, error } = await supabase.functions.invoke('sync-phorest-services');
        if (error) throw error;
        return data;
      }
      
      const { data, error } = await supabase.functions.invoke('sync-phorest-data', {
        body: { sync_type: syncType },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, syncType) => {
      queryClient.invalidateQueries({ queryKey: ['phorest-sync-logs'] });
      queryClient.invalidateQueries({ queryKey: ['phorest-performance'] });
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['phorest-staff-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['phorest-services'] });
      queryClient.invalidateQueries({ queryKey: ['my-clients-full'] });
      
      const count = data?.synced || data?.total || 0;
      toast({
        title: 'Sync completed',
        description: syncType === 'services' 
          ? `Synced ${count} services from Phorest.`
          : 'Phorest data has been synchronized.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Sync failed',
        description: error.message || 'Failed to sync Phorest data',
        variant: 'destructive',
      });
    },
  });
}

export function useCalculatePreferredStylists() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('calculate-preferred-stylists');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-clients-full'] });
      queryClient.invalidateQueries({ queryKey: ['phorest-clients'] });
      
      toast({
        title: 'Calculation complete',
        description: `Updated ${data?.updated_count || 0} client assignments based on appointment history.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Calculation failed',
        description: error.message || 'Failed to calculate preferred stylists',
        variant: 'destructive',
      });
    },
  });
}

export function useCreateStaffMapping() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (mapping: { 
      user_id: string; 
      phorest_staff_id: string; 
      phorest_staff_name?: string;
      phorest_staff_email?: string;
      phorest_branch_id?: string;
      phorest_branch_name?: string;
    }) => {
      const { data, error } = await supabase
        .from('phorest_staff_mapping')
        .insert(mapping)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phorest-staff-mappings'] });
      toast({
        title: 'Mapping created',
        description: 'Staff member has been linked to Phorest.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create mapping',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteStaffMapping() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (mappingId: string) => {
      const { error } = await supabase
        .from('phorest_staff_mapping')
        .delete()
        .eq('id', mappingId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phorest-staff-mappings'] });
      toast({
        title: 'Mapping removed',
        description: 'Staff mapping has been deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete mapping',
        variant: 'destructive',
      });
    },
  });
}

// Check for Phorest appointment conflicts for a given stylist, date, and time range
export function usePhorestConflicts(
  stylistUserId?: string,
  date?: string,
  startTime?: string,
  endTime?: string
) {
  return useQuery({
    queryKey: ['phorest-conflicts', stylistUserId, date, startTime, endTime],
    queryFn: async () => {
      if (!stylistUserId || !date || !startTime) return [];

      // Query for overlapping appointments
      const { data, error } = await supabase
        .from('phorest_appointments')
        .select('*')
        .eq('stylist_user_id', stylistUserId)
        .eq('appointment_date', date)
        .neq('status', 'cancelled');

      if (error) throw error;

      // Filter for time overlaps
      const conflicts = (data || []).filter(apt => {
        const aptStart = apt.start_time;
        const aptEnd = apt.end_time;
        
        // Check if there's any overlap
        // Overlap exists if: startTime < aptEnd AND endTime > aptStart
        const requestEnd = endTime || startTime; // If no end time, assume 1 hour
        return startTime < aptEnd && requestEnd > aptStart;
      });

      return conflicts;
    },
    enabled: !!stylistUserId && !!date && !!startTime,
  });
}

// Get upcoming Phorest appointments for a stylist
export function useStylistPhorestAppointments(stylistUserId?: string, date?: string) {
  return useQuery({
    queryKey: ['phorest-stylist-appointments', stylistUserId, date],
    queryFn: async () => {
      if (!stylistUserId) return [];

      let query = supabase
        .from('phorest_appointments')
        .select('*')
        .eq('stylist_user_id', stylistUserId)
        .neq('status', 'cancelled')
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (date) {
        query = query.eq('appointment_date', date);
      } else {
        // Default to today onwards
        const today = new Date().toISOString().split('T')[0];
        query = query.gte('appointment_date', today);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!stylistUserId,
  });
}