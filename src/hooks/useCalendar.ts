import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useEffectiveUserId } from './useEffectiveUser';
import { toast } from 'sonner';

export interface Appointment {
  id: string;
  external_id: string | null;
  staff_user_id: string | null;
  client_id: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
  service_id: string | null;
  service_name: string | null;
  service_category: string | null;
  status: AppointmentStatus;
  location_id: string | null;
  original_price: number | null;
  total_price: number | null;
  tip_amount: number | null;
  payment_method: string | null;
  rebooked_at_checkout: boolean | null;
  notes: string | null;
  client_notes: string | null;
  import_source: string | null;
  imported_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Joined data
  staff_profile?: {
    display_name: string | null;
    full_name: string;
    photo_url: string | null;
  };
  staff_name?: string | null;
}

export type AppointmentStatus = 'pending' | 'booked' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export type CalendarView = 'day' | 'week' | 'month' | 'agenda';

export type ColorBy = 'status' | 'service' | 'stylist';

export interface CalendarFilters {
  locationIds: string[];
  stylistIds: string[];
  statuses: AppointmentStatus[];
  showCancelled: boolean;
}

export const STATUS_CONFIG: Record<AppointmentStatus, { 
  color: string; 
  bgColor: string;
  borderColor: string;
  label: string;
}> = {
  pending: {
    color: 'text-amber-900',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    label: 'Pending'
  },
  booked: { 
    color: 'text-slate-900', 
    bgColor: 'bg-slate-200', 
    borderColor: 'border-slate-400',
    label: 'Booked' 
  },
  confirmed: { 
    color: 'text-green-900', 
    bgColor: 'bg-green-200', 
    borderColor: 'border-green-500',
    label: 'Confirmed' 
  },
  checked_in: { 
    color: 'text-blue-900', 
    bgColor: 'bg-blue-200', 
    borderColor: 'border-blue-500',
    label: 'Checked In' 
  },
  in_progress: {
    color: 'text-cyan-900',
    bgColor: 'bg-cyan-200',
    borderColor: 'border-cyan-500',
    label: 'In Progress'
  },
  completed: { 
    color: 'text-purple-900', 
    bgColor: 'bg-purple-200', 
    borderColor: 'border-purple-500',
    label: 'Completed' 
  },
  cancelled: { 
    color: 'text-gray-600', 
    bgColor: 'bg-gray-100', 
    borderColor: 'border-gray-300',
    label: 'Cancelled' 
  },
  no_show: { 
    color: 'text-red-900', 
    bgColor: 'bg-red-200', 
    borderColor: 'border-red-500',
    label: 'No Show' 
  },
};

/**
 * Main calendar hook using the normalized appointments table
 * This replaces usePhorestCalendar for the standalone system
 */
export function useCalendar(organizationId?: string) {
  const { hasPermission } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const effectiveUserId = useEffectiveUserId();
  const queryClient = useQueryClient();
  
  // Use passed org or effective org from context
  const orgId = organizationId || effectiveOrganization?.id;
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [filters, setFilters] = useState<CalendarFilters>({
    locationIds: [],
    stylistIds: [],
    statuses: ['pending', 'booked', 'confirmed', 'checked_in', 'in_progress', 'completed'],
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

  // Fetch appointments from normalized table
  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: ['appointments', dateRange, filters, effectiveUserId, canViewAll, canViewTeam, orgId],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          staff_profile:employee_profiles!appointments_staff_user_id_fkey(
            display_name,
            full_name,
            photo_url
          )
        `)
        .gte('appointment_date', dateRange.start)
        .lte('appointment_date', dateRange.end)
        .order('appointment_date')
        .order('start_time');

      // Apply organization filter
      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      // Apply status filter
      if (filters.showCancelled) {
        query = query.in('status', [...filters.statuses, 'cancelled', 'no_show']);
      } else {
        query = query.in('status', filters.statuses);
      }

      // Apply permission-based filtering
      if (!canViewAll && !canViewTeam && canViewOwn && effectiveUserId) {
        query = query.eq('staff_user_id', effectiveUserId);
      }

      // Apply stylist filter if selected
      if (filters.stylistIds.length > 0) {
        query = query.in('staff_user_id', filters.stylistIds);
      }

      // Apply location filter if selected
      if (filters.locationIds.length > 0) {
        query = query.in('location_id', filters.locationIds);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as unknown as Appointment[];
    },
  });

  // Update appointment status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ appointmentId, status, rebooked_at_checkout, tip_amount }: { 
      appointmentId: string; 
      status: AppointmentStatus;
      rebooked_at_checkout?: boolean;
      tip_amount?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('update-booking', {
        body: { 
          appointment_id: appointmentId, 
          status,
          rebooked_at_checkout,
          tip_amount,
        },
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Update failed');
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update appointment', { description: error.message });
    },
  });

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
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
    isLoading,
    
    // Permissions
    canViewAll,
    canViewTeam,
    canViewOwn,
    canCreate,
    
    // Actions
    goToToday,
    goToPrevious,
    goToNext,
    refetch,
    updateStatus: updateStatus.mutate,
    isUpdating: updateStatus.isPending,
  };
}

// Alias for backward compatibility
export { useCalendar as useAppointments };
