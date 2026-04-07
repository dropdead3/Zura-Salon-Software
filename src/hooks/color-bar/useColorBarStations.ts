import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface ColorBarStation {
  id: string;
  organization_id: string;
  location_id: string;
  station_name: string;
  assigned_device_id: string | null;
  assigned_scale_id: string | null;
  connection_type: string | null;
  device_name: string | null;
  scale_model: string | null;
  pairing_code: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useColorBarStations(locationId?: string) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;

  return useQuery({
    queryKey: ['color-bar-stations', orgId, locationId],
    queryFn: async (): Promise<ColorBarStation[]> => {
      let query = supabase
        .from('backroom_stations')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('station_name');

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ColorBarStation[];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateColorBarStation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      location_id: string;
      station_name: string;
      connection_type?: string;
      device_name?: string;
      scale_model?: string;
      pairing_code?: string;
    }) => {
      const { data, error } = await supabase
        .from('backroom_stations')
        .insert(params)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ColorBarStation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['color-bar-stations'] });
      toast.success('Station created');
    },
    onError: (error) => {
      toast.error('Failed to create station: ' + error.message);
    },
  });
}

export function useUpdateColorBarStation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      station_name?: string;
      assigned_device_id?: string | null;
      assigned_scale_id?: string | null;
      connection_type?: string;
      device_name?: string | null;
      scale_model?: string | null;
      pairing_code?: string | null;
      is_active?: boolean;
      last_seen_at?: string;
    }) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase
        .from('backroom_stations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ColorBarStation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['color-bar-stations'] });
      toast.success('Station updated');
    },
    onError: (error) => {
      toast.error('Failed to update station: ' + error.message);
    },
  });
}

export function useDeleteColorBarStation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stationId: string) => {
      const { error } = await supabase
        .from('backroom_stations')
        .delete()
        .eq('id', stationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['color-bar-stations'] });
      toast.success('Station removed');
    },
    onError: (error) => {
      toast.error('Failed to remove station: ' + error.message);
    },
  });
}

/* ─── Connection Health Monitor ─── */

interface HealthStatus {
  isOnline: boolean | null;
  lastSeenAt: string | null;
  ping: () => void;
}

function getHealthColor(lastSeenAt: string | null): 'green' | 'yellow' | 'red' | 'gray' {
  if (!lastSeenAt) return 'gray';
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  const diffMin = diffMs / 60000;
  if (diffMin < 1) return 'green';
  if (diffMin < 5) return 'yellow';
  return 'red';
}

export { getHealthColor };

export function useStationHealthMonitor(
  station: ColorBarStation | null
): HealthStatus {
  const updateStation = useUpdateColorBarStation();
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(
    station?.last_seen_at ?? null
  );

  const connectionType = station?.connection_type ?? 'manual';

  const ping = useCallback(() => {
    if (!station) return;
    if (connectionType === 'manual') return;

    // Phase 1: simulated ping — direct always succeeds, BLE succeeds ~90% of the time
    const success = connectionType === 'direct' ? true : Math.random() > 0.1;
    if (success) {
      const now = new Date().toISOString();
      setLastSeenAt(now);
      updateStation.mutate(
        { id: station.id, last_seen_at: now },
        { onSuccess: () => {}, onError: () => {} }
      );
    }
  }, [station, connectionType, updateStation]);

  useEffect(() => {
    if (!station || connectionType === 'manual') return;

    // Immediate ping on mount
    ping();

    const interval = setInterval(ping, 30000);
    return () => clearInterval(interval);
  }, [station?.id, connectionType]); // eslint-disable-line react-hooks/exhaustive-deps

  const isOnline =
    connectionType === 'manual'
      ? null
      : lastSeenAt
        ? (Date.now() - new Date(lastSeenAt).getTime()) < 120000
        : false;

  return { isOnline, lastSeenAt, ping };
}
