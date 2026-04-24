import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllBatched } from '@/utils/fetchAllBatched';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { getOrgToday, orgNowMinutes } from '@/lib/orgTime';
import { useOrgDefaults } from '@/hooks/useOrgDefaults';
import { useEffectiveUserId } from './useEffectiveUser';
import { usePOSProviderLabel } from './usePOSProviderLabel';
import { toast } from 'sonner';

export interface PhorestAppointment {
  id: string;
  phorest_id: string;
  stylist_user_id: string | null;
  phorest_staff_id: string | null;
  client_name: string;
  client_phone: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  service_name: string;
  service_category: string | null;
  status: AppointmentStatus;
  location_id: string | null;
  total_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // New fields for filtering
  phorest_client_id: string | null;
  is_new_client: boolean;
  // Recurrence fields
  recurrence_group_id: string | null;
  recurrence_index: number | null;
  recurrence_rule: Record<string, unknown> | null;
  // Redo fields
  is_redo: boolean;
  redo_reason: string | null;
  original_appointment_id: string | null;
  redo_pricing_override: number | null;
  redo_approved_by: string | null;
  original_price: number | null;
  // Creator + soft-delete fields
  created_by?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  // Deposit fields
  deposit_required?: boolean;
  deposit_amount?: number | null;
  deposit_status?: string | null;
  deposit_stripe_payment_id?: string | null;
  deposit_applied_to_total?: boolean;
  // Cancellation fee fields
  cancellation_fee_charged?: number | null;
  cancellation_fee_status?: string | null;
  cancellation_fee_stripe_payment_id?: string | null;
  card_on_file_id?: string | null;
  // Payment metadata
  stripe_payment_intent_id?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  paid_at?: string | null;
  // Payment link fields
  payment_link_sent_at?: string | null;
  payment_link_url?: string | null;
  payment_link_expires_at?: string | null;
  split_payment_terminal_intent_id?: string | null;
  split_payment_link_intent_id?: string | null;
  // Client contact
  client_email?: string | null;
  // Source tag (set client-side when merging tables)
  _source?: 'phorest' | 'local';
  // Joined data
  stylist_profile?: {
    display_name: string | null;
    full_name: string;
    photo_url: string | null;
  };
}

export type AppointmentStatus = 'pending' | 'booked' | 'unconfirmed' | 'confirmed' | 'walk_in' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';

export type CalendarView = 'day' | 'week' | 'month' | 'agenda';

export type ColorBy = 'status' | 'service' | 'stylist';

export interface CalendarFilters {
  locationIds: string[];
  stylistIds: string[];
  statuses: AppointmentStatus[];
  showCancelled: boolean;
}

export { APPOINTMENT_STATUS_CONFIG as STATUS_CONFIG } from '@/lib/design-tokens';

export function usePhorestCalendar() {
  const { hasPermission } = useAuth();
  const { timezone } = useOrgDefaults();
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();
  const { isConnected: isPOSConnected } = usePOSProviderLabel();
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('day');
  const [filters, setFilters] = useState<CalendarFilters>({
    locationIds: [],
    stylistIds: [],
    statuses: ['booked', 'unconfirmed', 'confirmed', 'walk_in', 'checked_in', 'completed'],
    showCancelled: false,
  });

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    switch (view) {
      case 'day':
        return {
          start: format(currentDate, 'yyyy-MM-dd'),
          end: format(currentDate, 'yyyy-MM-dd'),
        };
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
        return {
          start: format(weekStart, 'yyyy-MM-dd'),
          end: format(weekEnd, 'yyyy-MM-dd'),
        };
      case 'month':
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return {
          start: format(monthStart, 'yyyy-MM-dd'),
          end: format(monthEnd, 'yyyy-MM-dd'),
        };
      case 'agenda':
        // Agenda shows 2 weeks
        return {
          start: format(currentDate, 'yyyy-MM-dd'),
          end: format(addDays(currentDate, 14), 'yyyy-MM-dd'),
        };
      default:
        return {
          start: format(currentDate, 'yyyy-MM-dd'),
          end: format(currentDate, 'yyyy-MM-dd'),
        };
    }
  }, [currentDate, view]);

  // Permission checks
  const canViewAll = hasPermission('view_all_locations_calendar');
  const canViewTeam = hasPermission('view_team_appointments');
  const canViewOwn = hasPermission('view_own_appointments');
  const canCreate = hasPermission('create_appointments');

  // Fetch appointments with client data for filtering
  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: ['phorest-appointments', dateRange, filters, effectiveUserId, canViewAll, canViewTeam],
    queryFn: async () => {
      let query = supabase
        .from('v_all_appointments' as any)
        .select('*')
        .is('deleted_at', null)
        .eq('is_demo', false)
        .gte('appointment_date', dateRange.start)
        .lte('appointment_date', dateRange.end)
        .order('appointment_date')
        .order('start_time');

      // Apply status filter
      if (filters.showCancelled) {
        query = query.in('status', [...filters.statuses, 'cancelled', 'no_show']);
      } else {
        query = query.in('status', filters.statuses);
      }

      // Apply permission-based filtering
      if (!canViewAll && !canViewTeam && canViewOwn && effectiveUserId) {
        // Only view own appointments - also include appointments where user is an assistant
        const { data: assistedApptIds } = await supabase
          .from('appointment_assistants')
          .select('appointment_id')
          .eq('assistant_user_id', effectiveUserId);

        const assistedIds = ((assistedApptIds || []) as any[]).map((a: any) => a.appointment_id);

        if (assistedIds.length > 0) {
          // Use or filter to include own + assisted appointments
          query = query.or(`stylist_user_id.eq.${effectiveUserId},id.in.(${assistedIds.join(',')})`);
        } else {
          query = query.eq('stylist_user_id', effectiveUserId);
        }
      }

      // Apply stylist filter if selected
      if (filters.stylistIds.length > 0) {
        query = query.in('stylist_user_id', filters.stylistIds);
      }

      const allRows: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const to = from + batchSize - 1;
        const { data, error } = await query.range(from, to);
        if (error) throw error;
        if (data && data.length > 0) {
          allRows.push(...data);
          hasMore = data.length === batchSize;
          from += batchSize;
        } else {
          hasMore = false;
        }
      }

      // Batch-resolve stylist profiles (views don't support FK joins)
      const userIds = [...new Set(allRows.map((r: any) => r.stylist_user_id).filter(Boolean))];
      let profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('employee_profiles')
          .select('user_id, display_name, full_name, photo_url')
          .in('user_id', userIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      }

      const raw = allRows.map((r: any) => ({
        ...r,
        stylist_profile: profileMap.get(r.stylist_user_id) || null,
      })) as PhorestAppointment[];

      // Display-layer safety net: prevent future/in-progress appointments
      // from showing as "completed" due to sync race conditions or stale data.
      const orgToday = getOrgToday(timezone);
      const nowMins = orgNowMinutes(timezone);

      return raw.map(apt => {
        // Fix premature "completed" from sync race conditions
        if (apt.status === 'completed') {
          if (apt.appointment_date > orgToday) {
            return { ...apt, status: 'unconfirmed' as AppointmentStatus };
          }
          if (apt.appointment_date === orgToday && apt.end_time) {
            const [h, m] = apt.end_time.split(':').map(Number);
            if (h * 60 + m > nowMins) {
              return { ...apt, status: 'unconfirmed' as AppointmentStatus };
            }
          }
          return apt;
        }
        // Remap legacy 'booked' to 'unconfirmed' for display
        if (apt.status === 'booked') {
          return { ...apt, status: 'unconfirmed' as AppointmentStatus };
        }
        return apt;
      });
    },
    staleTime: 30_000,
  });

  // Get last sync time (only when a POS integration is connected)
  const { data: lastSync } = useQuery({
    queryKey: ['phorest-last-sync', isPOSConnected],
    queryFn: async () => {
      const { data } = await supabase
        .from('phorest_sync_log')
        .select('completed_at')
        .eq('sync_type', 'appointments')
        .eq('status', 'success')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      return data?.completed_at ? new Date(data.completed_at) : null;
    },
    enabled: isPOSConnected,
  });

  // SIGNAL PRESERVATION: when a sync run completes, the appointment query
  // may be holding a pre-backfill snapshot (client_name still null where it
  // is now resolved). Invalidate exactly once per sync-completion advance —
  // not on every render — so newly-resolved names appear without a hard
  // reload, and we don't poll wastefully when nothing has changed.
  const lastSyncMs = lastSync ? lastSync.getTime() : null;
  useEffect(() => {
    if (!lastSyncMs) return;
    queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
  }, [lastSyncMs, queryClient]);

  // Update appointment status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ appointmentId, status, rebooked_at_checkout, tip_amount, rebook_declined_reason }: { 
      appointmentId: string; 
      status: AppointmentStatus;
      rebooked_at_checkout?: boolean;
      tip_amount?: number;
      rebook_declined_reason?: string | null;
    }) => {
      const response = await supabase.functions.invoke('update-phorest-appointment', {
        body: { 
          appointment_id: appointmentId, 
          status,
          ...(rebooked_at_checkout !== undefined && { rebooked_at_checkout }),
          ...(tip_amount !== undefined && { tip_amount }),
          ...(rebook_declined_reason !== undefined && { rebook_declined_reason }),
        },
      });
      
      if (response.error) throw response.error;
      if (!response.data?.success) throw new Error(response.data?.error || 'Update failed');
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['live-session-snapshot'] });
      toast.success('Appointment updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update appointment', { description: error.message });
    },
  });

  // Track which appointments the current user is assisting
  const { data: assistedAppointmentIds = new Set<string>() } = useQuery({
    queryKey: ['assisted-appointment-ids', effectiveUserId, dateRange],
    queryFn: async () => {
      if (!effectiveUserId) return new Set<string>();
      const { data } = await supabase
        .from('appointment_assistants')
        .select('appointment_id')
        .eq('assistant_user_id', effectiveUserId);
      return new Set(((data || []) as any[]).map((a: any) => a.appointment_id));
    },
    enabled: !!effectiveUserId,
    staleTime: 5 * 60_000,
  });

  // For admin/manager views: track which appointments (in current view) have assistants assigned.
  // Wave 13 perf: derive from `appointments` already in memory instead of refetching the
  // entire date range from v_all_appointments + chunked .in() lookups.
  const appointmentIdsInView = useMemo(
    () => appointments.map(a => a.id),
    [appointments],
  );

  const { data: appointmentsWithAssistants = new Set<string>() } = useQuery({
    queryKey: [
      'appointments-with-assistants',
      canViewAll || canViewTeam,
      // Use length + first/last id as a stable signature to avoid cache misses
      // every time the array reference changes but content is equivalent.
      appointmentIdsInView.length,
      appointmentIdsInView[0] ?? null,
      appointmentIdsInView[appointmentIdsInView.length - 1] ?? null,
    ],
    queryFn: async () => {
      if (!canViewAll && !canViewTeam) return new Set<string>();
      if (appointmentIdsInView.length === 0) return new Set<string>();

      // Chunk .in() calls to avoid query-string limits
      const CHUNK = 500;
      const allAssistants: any[] = [];
      for (let i = 0; i < appointmentIdsInView.length; i += CHUNK) {
        const chunk = appointmentIdsInView.slice(i, i + CHUNK);
        const { data } = await supabase
          .from('appointment_assistants')
          .select('appointment_id')
          .in('appointment_id', chunk);
        if (data) allAssistants.push(...data);
      }

      return new Set(allAssistants.map(a => a.appointment_id));
    },
    enabled: (canViewAll || canViewTeam) && appointmentIdsInView.length > 0,
    staleTime: 60_000,
  });

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, PhorestAppointment[]>();
    appointments.forEach(apt => {
      const date = apt.appointment_date;
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(apt);
    });
    return map;
  }, [appointments]);

  // Navigation helpers
  const goToToday = useCallback(() => setCurrentDate(new Date()), []);
  const goToPrevious = useCallback(() => {
    setCurrentDate(prev => {
      switch (view) {
        case 'day': return addDays(prev, -1);
        case 'week': return addDays(prev, -7);
        case 'month': return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
        case 'agenda': return addDays(prev, -14);
        default: return prev;
      }
    });
  }, [view]);
  const goToNext = useCallback(() => {
    setCurrentDate(prev => {
      switch (view) {
        case 'day': return addDays(prev, 1);
        case 'week': return addDays(prev, 7);
        case 'month': return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
        case 'agenda': return addDays(prev, 14);
        default: return prev;
      }
    });
  }, [view]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    // No-op when running standalone (no POS integration connected)
    if (!isPOSConnected) {
      toast.info('Calendar runs natively', {
        description: 'No external POS sync is needed.',
      });
      await refetch();
      return;
    }

    try {
      const response = await supabase.functions.invoke('sync-phorest-data', {
        body: {
          sync_type: 'appointments',
          date_from: dateRange.start,
          date_to: dateRange.end,
        },
      });

      if (response.error) throw response.error;

      await refetch();
      queryClient.invalidateQueries({ queryKey: ['phorest-last-sync'] });
      toast.success('Calendar synced successfully');
    } catch (error: any) {
      toast.error('Sync failed', { description: error.message });
    }
  }, [dateRange, refetch, queryClient, isPOSConnected]);

  return {
    // State
    currentDate,
    setCurrentDate,
    view,
    setView,
    filters,
    setFilters,
    
    // Data
    appointments,
    appointmentsByDate,
    assistedAppointmentIds,
    appointmentsWithAssistants,
    isLoading,
    lastSync,
    
    // Permissions
    canViewAll,
    canViewTeam,
    canViewOwn,
    canCreate,
    
    // Actions
    goToToday,
    goToPrevious,
    goToNext,
    triggerSync,
    refetch,
    updateStatus: updateStatus.mutate,
    isUpdating: updateStatus.isPending,
  };
}
