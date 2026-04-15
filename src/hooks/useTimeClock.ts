import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { usePayrollConnection } from '@/hooks/usePayrollConnection';
import { toast } from 'sonner';

export interface TimeEntry {
  id: string;
  organization_id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number | null;
  break_minutes: number | null;
  location_id: string | null;
  notes: string | null;
  source: string | null;
  payroll_synced: boolean | null;
  created_at: string;
  updated_at: string;
}

export function useTimeClock() {
  const { user } = useAuth();
  const { selectedOrganization } = useOrganizationContext();
  const { provider } = usePayrollConnection();
  const queryClient = useQueryClient();
  const orgId = selectedOrganization?.id;
  const userId = user?.id;

  // Fetch active (open) time entry
  const { data: activeEntry, isLoading } = useQuery({
    queryKey: ['time-clock-active', userId, orgId],
    queryFn: async () => {
      if (!userId || !orgId) return null;
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as TimeEntry | null;
    },
    enabled: !!userId && !!orgId,
  });

  // Today's total hours
  const { data: todayTotalHours = 0 } = useQuery({
    queryKey: ['time-clock-today', userId, orgId],
    queryFn: async () => {
      if (!userId || !orgId) return 0;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('time_entries')
        .select('duration_minutes, clock_in, clock_out')
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .gte('clock_in', todayStart.toISOString());
      if (error) throw error;
      if (!data) return 0;
      let total = 0;
      for (const entry of data) {
        if (entry.duration_minutes) {
          total += Number(entry.duration_minutes);
        } else if (!entry.clock_out) {
          // Currently clocked in — add elapsed time
          total += (Date.now() - new Date(entry.clock_in).getTime()) / 60000;
        }
      }
      return Math.round((total / 60) * 100) / 100; // hours, 2 decimals
    },
    enabled: !!userId && !!orgId,
    refetchInterval: 60000, // refresh every minute for live elapsed
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['time-clock-active', userId, orgId] });
    queryClient.invalidateQueries({ queryKey: ['time-clock-today', userId, orgId] });
  };

  const clockIn = useMutation({
    mutationFn: async ({ locationId, source = 'sidebar' }: { locationId?: string; source?: string } = {}) => {
      if (!userId || !orgId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          organization_id: orgId,
          user_id: userId,
          clock_in: new Date().toISOString(),
          location_id: locationId || null,
          source,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Clocked in — your shift has started');
    },
    onError: (err: Error) => {
      toast.error(`Clock in failed: ${err.message}`);
    },
  });

  const clockOut = useMutation({
    mutationFn: async ({ notes }: { notes?: string } = {}) => {
      if (!activeEntry) throw new Error('No active clock-in found');
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          clock_out: new Date().toISOString(),
          notes: notes || null,
        })
        .eq('id', activeEntry.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      invalidate();
      const mins = data?.duration_minutes ? Math.round(Number(data.duration_minutes)) : 0;
      const hrs = Math.floor(mins / 60);
      const m = mins % 60;
      toast.success(`Clocked out — ${hrs}h ${m}m logged`);
    },
    onError: (err: Error) => {
      toast.error(`Clock out failed: ${err.message}`);
    },
  });

  return {
    activeEntry,
    isClockedIn: !!activeEntry,
    isLoading,
    todayTotalHours,
    clockIn: clockIn.mutate,
    clockOut: clockOut.mutate,
    isClockingIn: clockIn.isPending,
    isClockingOut: clockOut.isPending,
    provider,
    payrollSynced: activeEntry?.payroll_synced ?? null,
  };
}
