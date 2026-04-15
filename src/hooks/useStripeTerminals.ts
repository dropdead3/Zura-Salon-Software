import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StripeTerminalLocation {
  id: string;
  object: string;
  display_name: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  metadata?: Record<string, string>;
}

interface StripeReader {
  id: string;
  object: string;
  label: string;
  device_type: string;
  status: string;
  location: string;
  serial_number: string;
  device_sw_version?: string;
  ip_address?: string;
}

export async function invokeTerminalAction(action: string, locationId: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('manage-stripe-terminals', {
    body: { action, location_id: locationId, ...params },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.data;
}

export function useTerminalLocations(locationId: string | null) {
  return useQuery({
    queryKey: ['terminal-locations', locationId],
    queryFn: async () => {
      const result = await invokeTerminalAction('list_locations', locationId!);
      return (result?.data || []) as StripeTerminalLocation[];
    },
    enabled: !!locationId,
    staleTime: 30000,
    retry: 2,
    retryDelay: 1000,
  });
}

export function useTerminalReaders(locationId: string | null, terminalLocationId?: string) {
  return useQuery({
    queryKey: ['terminal-readers', locationId, terminalLocationId],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (terminalLocationId) params.terminal_location_id = terminalLocationId;
      const result = await invokeTerminalAction('list_readers', locationId!, params);
      return (result?.data || []) as StripeReader[];
    },
    enabled: !!locationId,
    staleTime: 10000,
    refetchInterval: 30000,
    retry: 2,
    retryDelay: 1000,
  });
}

export function useCreateTerminalLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ locationId, displayName }: { locationId: string; displayName?: string }) => {
      return invokeTerminalAction('create_location', locationId, {
        display_name: displayName,
        metadata_location_id: true,
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['terminal-locations', vars.locationId] });
      toast.success('Terminal location created');
    },
    onError: (error) => {
      toast.error('Failed to create terminal location', { description: (error as Error).message });
    },
  });
}

export function useDeleteTerminalLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ locationId, terminalLocationId }: { locationId: string; terminalLocationId: string }) => {
      return invokeTerminalAction('delete_location', locationId, { terminal_location_id: terminalLocationId });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['terminal-locations', vars.locationId] });
      queryClient.invalidateQueries({ queryKey: ['terminal-readers', vars.locationId] });
      toast.success('Terminal location deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete terminal location', { description: (error as Error).message });
    },
  });
}

export function useRegisterReader() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      locationId,
      terminalLocationId,
      registrationCode,
      label,
    }: {
      locationId: string;
      terminalLocationId: string;
      registrationCode: string;
      label?: string;
    }) => {
      return invokeTerminalAction('register_reader', locationId, {
        terminal_location_id: terminalLocationId,
        registration_code: registrationCode,
        label,
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['terminal-readers', vars.locationId] });
      toast.success('Reader registered successfully');
    },
    onError: (error) => {
      toast.error('Failed to register reader', { description: (error as Error).message });
    },
  });
}

export function useDeleteReader() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ locationId, readerId }: { locationId: string; readerId: string }) => {
      return invokeTerminalAction('delete_reader', locationId, { reader_id: readerId });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['terminal-readers', vars.locationId] });
      toast.success('Reader removed');
    },
    onError: (error) => {
      toast.error('Failed to remove reader', { description: (error as Error).message });
    },
  });
}
