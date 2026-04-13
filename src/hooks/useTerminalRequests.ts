import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TerminalHardwareRequest {
  id: string;
  organization_id: string;
  location_id: string | null;
  requested_by: string;
  quantity: number;
  reason: string;
  notes: string | null;
  status: string;
  admin_notes: string | null;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields (platform side)
  organization_name?: string;
  location_name?: string;
  requester_name?: string;
}

export function useTerminalRequests(orgId: string | undefined) {
  return useQuery({
    queryKey: ['terminal-hardware-requests', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('terminal_hardware_requests')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TerminalHardwareRequest[];
    },
    enabled: !!orgId,
    staleTime: 30000,
  });
}

export function useAllTerminalRequests(statusFilter?: string) {
  return useQuery({
    queryKey: ['terminal-hardware-requests-all', statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-terminal-requests', {
        body: { action: 'list_all_requests', status_filter: statusFilter },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data?.data || []) as TerminalHardwareRequest[];
    },
    staleTime: 30000,
  });
}

export function useCreateTerminalRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      organizationId,
      locationId,
      quantity,
      reason,
      notes,
    }: {
      organizationId: string;
      locationId: string;
      quantity: number;
      reason: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('manage-terminal-requests', {
        body: {
          action: 'create_request',
          organization_id: organizationId,
          location_id: locationId,
          quantity,
          reason,
          notes,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['terminal-hardware-requests', vars.organizationId] });
      toast.success('Terminal request submitted');
    },
    onError: (error) => {
      toast.error('Failed to submit request', { description: (error as Error).message });
    },
  });
}

export function useUpdateTerminalRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      status,
      adminNotes,
      trackingNumber,
    }: {
      requestId: string;
      status?: string;
      adminNotes?: string;
      trackingNumber?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('manage-terminal-requests', {
        body: {
          action: 'update_request',
          request_id: requestId,
          status,
          admin_notes: adminNotes,
          tracking_number: trackingNumber,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminal-hardware-requests-all'] });
      toast.success('Request updated');
    },
    onError: (error) => {
      toast.error('Failed to update request', { description: (error as Error).message });
    },
  });
}
