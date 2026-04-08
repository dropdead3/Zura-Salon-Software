import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveUserId } from './useEffectiveUser';
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
  // Source tag (set client-side when merging tables)
  _source?: 'phorest' | 'local';
  // Joined data
  stylist_profile?: {
    display_name: string | null;
    full_name: string;
    photo_url: string | null;
  };
}

export type AppointmentStatus = 'pending' | 'booked' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';

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
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('day');
  const [filters, setFilters] = useState<CalendarFilters>({
    locationIds: [],
    stylistIds: [],
    statuses: ['booked', 'confirmed', 'checked_in', 'completed'],
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
        .from('phorest_appointments')
        .select(`
          *,
          stylist_profile:employee_profiles!phorest_appointments_stylist_user_id_fkey(
            display_name,
            full_name,
            photo_url
          )
        `)
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

        const assistedIds = (assistedApptIds || []).map(a => a.appointment_id);

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

      return allRows as PhorestAppointment[];
    },
  });

  // Get last sync time
  const { data: lastSync } = useQuery({
    queryKey: ['phorest-last-sync'],
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
  });

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
      return new Set((data || []).map(a => a.appointment_id));
    },
    enabled: !!effectiveUserId,
  });

  // For admin/manager views: track ALL appointments that have assistants assigned
  const { data: appointmentsWithAssistants = new Set<string>() } = useQuery({
    queryKey: ['appointments-with-assistants', dateRange, canViewAll || canViewTeam],
    queryFn: async () => {
      if (!canViewAll && !canViewTeam) return new Set<string>();
      // Get appointment IDs in date range that have assistants (paginated)
      const apptIds = await fetchAllBatched<any>((from, to) =>
        supabase
          .from('phorest_appointments')
          .select('id')
          .gte('appointment_date', dateRange.start)
          .lte('appointment_date', dateRange.end)
          .eq('is_demo', false)
          .range(from, to)
      );

      if (apptIds.length === 0) return new Set<string>();

      const ids = apptIds.map(a => a.id);
      // Chunk .in() calls to avoid query-string limits
      const CHUNK = 500;
      const allAssistants: any[] = [];
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const { data } = await supabase
          .from('appointment_assistants')
          .select('appointment_id')
          .in('appointment_id', chunk);
        if (data) allAssistants.push(...data);
      }

      return new Set(allAssistants.map(a => a.appointment_id));
    },
    enabled: canViewAll || canViewTeam,
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
  }, [dateRange, refetch, queryClient]);

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
