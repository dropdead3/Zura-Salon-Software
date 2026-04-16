import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { LocationTimezoneProvider } from '@/contexts/LocationTimezoneContext';
import { useLocationTimezone } from '@/hooks/useLocationTimezone';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ScheduleHeader } from '@/components/dashboard/schedule/ScheduleHeader';
import { ScheduleActionBar } from '@/components/dashboard/schedule/ScheduleActionBar';
// ScheduleLegend is now embedded inside ScheduleActionBar
import { DayView } from '@/components/dashboard/schedule/DayView';
import { computeUtilizationByStylist } from '@/lib/schedule-utilization';
import { WeekView } from '@/components/dashboard/schedule/WeekView';
import { MonthView } from '@/components/dashboard/schedule/MonthView';
import { AgendaView } from '@/components/dashboard/schedule/AgendaView';
import { AppointmentDetailSheet } from '@/components/dashboard/schedule/AppointmentDetailSheet';
import { CheckoutSummarySheet } from '@/components/dashboard/schedule/CheckoutSummarySheet';
import { QuickBookingPopover } from '@/components/dashboard/schedule/QuickBookingPopover';
import { ScheduleUtilizationBar } from '@/components/dashboard/schedule/ScheduleUtilizationBar';
import { SchedulingCopilotPanel } from '@/components/scheduling/SchedulingCopilotPanel';
import { DraftBookingsSheet } from '@/components/dashboard/schedule/DraftBookingsSheet';
import { ClientDetailSheet } from '@/components/dashboard/ClientDetailSheet';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { usePhorestCalendar, type PhorestAppointment, type CalendarView } from '@/hooks/usePhorestCalendar';
import { useCalendarPreferences } from '@/hooks/useCalendarPreferences';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffectiveUserId } from '@/hooks/useEffectiveUser';
import { useActiveLocations, isClosedOnDate, getLocationHoursForDate } from '@/hooks/useLocations';
import { ClosedDayWarningDialog } from '@/components/dashboard/schedule/ClosedDayWarningDialog';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useOrgNow } from '@/hooks/useOrgNow';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useDraftBookings, type DraftBooking } from '@/hooks/useDraftBookings';
import { useServiceLookup } from '@/hooks/useServiceLookup';
import { useAppointmentAssistantNames } from '@/hooks/useAppointmentAssistantNames';
import { Loader2, Sparkles, Users } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MeetingSchedulerWizard, ScheduleTypeSelector, MeetingDetailPanel } from '@/components/dashboard/schedule/meetings';
import { useAdminMeetingsForDate, type AdminMeeting, type MeetingAttendee } from '@/hooks/useAdminMeetings';
import { ShiftScheduleView } from '@/components/dashboard/schedule/shifts/ShiftScheduleView';
import { cn } from '@/lib/utils';
import type { CalendarFilterState } from '@/components/dashboard/schedule/CalendarFiltersPopover';
import { AddTimeBlockForm } from '@/components/dashboard/schedule/AddTimeBlockForm';
import { RequestAssistantPanel } from '@/components/dashboard/schedule/RequestAssistantPanel';
import { AssistantBlockManagerSheet } from '@/components/dashboard/schedule/AssistantBlockManagerSheet';
import { useAssistantTimeBlocks, useAssistantTimeBlocksRange, useMyPendingAssistantBlocks } from '@/hooks/useAssistantTimeBlocks';
import { useScheduleHotkeys } from '@/hooks/useScheduleHotkeys';
import type { AssistantTimeBlock } from '@/hooks/useAssistantTimeBlocks';
import { useStaffScheduleBlocks } from '@/hooks/useStaffScheduleBlocks';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';

interface QuickLoginState {
  quickLoginUserId?: string;
  quickLoginUserName?: string;
}


export default function Schedule() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const location = useLocation();
  const { preferences } = useCalendarPreferences();
  const effectiveUserId = useEffectiveUserId();
  const { roles, user } = useAuth();
  const { data: locations = [] } = useActiveLocations();
  const { data: businessSettings } = useBusinessSettings();
  const { todayStr: orgToday } = useOrgNow();
  const quickLoginHandled = useRef(false);
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: drafts = [] } = useDraftBookings(orgId);
  const { data: serviceLookup } = useServiceLookup();
  
  // Check if user is stylist or stylist_assistant (they get full calendar view access)
  const isStylistRole = roles.includes('stylist') || roles.includes('stylist_assistant');
  const isServiceProvider = roles.includes('stylist') || roles.includes('stylist_assistant') || roles.includes('booth_renter');
  const isAdminRole = roles.includes('admin') || roles.includes('manager') || roles.includes('super_admin');
  
  const {
    currentDate,
    setCurrentDate,
    view,
    setView,
    filters,
    setFilters,
    appointments: allAppointments,
    assistedAppointmentIds,
    appointmentsWithAssistants,
    isLoading,
    lastSync,
    canCreate,
    triggerSync,
    updateStatus,
    isUpdating,
  } = usePhorestCalendar();

  // Batch-fetch assistant names for appointments that have assistants
  const assistantApptIds = useMemo(() => 
    appointmentsWithAssistants ? Array.from(appointmentsWithAssistants) as string[] : [],
    [appointmentsWithAssistants]
  );
  const { data: assistantData } = useAppointmentAssistantNames(assistantApptIds);
  const assistantNamesMap = assistantData?.assistantNamesMap;
  const assistantProfilesMap = assistantData?.assistantProfilesMap;

  // State for selections and sheets
  const [selectedAppointment, setSelectedAppointment] = useState<PhorestAppointment | null>(null);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const locationTimezone = useLocationTimezone(selectedLocation || null);

  // Fetch assistant time blocks for the current date/location
  const {
    timeBlocks: assistantTimeBlocks,
    createBlock: createAssistantBlock,
    isCreating: isCreatingBlock,
  } = useAssistantTimeBlocks(currentDate, selectedLocation, orgId ?? null);

  // Range-based time blocks for week/agenda views
  // Pending blocks for toolbar badge
  const { pendingCount } = useMyPendingAssistantBlocks(user?.id ?? null, selectedLocation || null);
  const weekStartStr = useMemo(() => format(currentDate, 'yyyy-MM-dd'), [currentDate]);
  const weekEndStr = useMemo(() => {
    const end = new Date(currentDate);
    end.setDate(end.getDate() + 13); // Cover both week (7 days) and agenda (14 days)
    return format(end, 'yyyy-MM-dd');
  }, [currentDate]);
  const { timeBlocks: rangeTimeBlocks } = useAssistantTimeBlocksRange(
    (view === 'week' || view === 'agenda') ? weekStartStr : null,
    (view === 'week' || view === 'agenda') ? weekEndStr : null,
    selectedLocation || null,
  );

  // Staff schedule blocks (breaks, lunches, blocked time from POS)
  const weekEndDate = useMemo(() => {
    const end = new Date(currentDate);
    end.setDate(end.getDate() + 13);
    return end;
  }, [currentDate]);
  const { data: scheduleBlocks = [] } = useStaffScheduleBlocks(
    currentDate,
    view === 'week' || view === 'agenda' ? weekEndDate : currentDate,
    selectedLocation || undefined,
  );

  const [detailOpen, setDetailOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<string | undefined>(undefined);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutRebookCompleted, setCheckoutRebookCompleted] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [closedDayWarning, setClosedDayWarning] = useState<{
    open: boolean;
    date: Date;
    reason?: string;
    isOutsideHours?: boolean;
    pendingAction?: () => void;
  }>({ open: false, date: new Date() });

  // Client Detail Sheet state (FIX #1)
  const [clientDetailOpen, setClientDetailOpen] = useState(false);
  const [clientDetailData, setClientDetailData] = useState<any>(null);

  // Action bar cancel reason dialog (FIX #3)
  const [actionBarCancelOpen, setActionBarCancelOpen] = useState(false);
  const [actionBarCancelReason, setActionBarCancelReason] = useState('');

  // Meeting scheduler state
  const [meetingWizardOpen, setMeetingWizardOpen] = useState(false);
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<(AdminMeeting & { admin_meeting_attendees?: { user_id: string; rsvp_status: string }[] }) | null>(null);
  const [meetingDetailOpen, setMeetingDetailOpen] = useState(false);
  const [showShiftsView, setShowShiftsView] = useState(false);

  // Fetch admin meetings for current date
  const currentDateStr = format(currentDate, 'yyyy-MM-dd');
  const { data: adminMeetings = [] } = useAdminMeetingsForDate(currentDateStr);

  // Listen for FAB toggle event
  useEffect(() => {
    const handleToggle = () => setCopilotOpen(prev => !prev);
    window.addEventListener('toggle-scheduling-copilot', handleToggle);
    return () => window.removeEventListener('toggle-scheduling-copilot', handleToggle);
  }, []);
  const [bookingDefaults, setBookingDefaults] = useState<{ date?: Date; stylistId?: string; time?: string }>({});
  const [activeDraft, setActiveDraft] = useState<DraftBooking | null>(null);
  const [rebookData, setRebookData] = useState<{
    clientId?: string;
    clientName?: string;
    staffUserId?: string;
    staffName?: string;
    selectedServices: string[];
  } | null>(null);
  const [draftsSheetOpen, setDraftsSheetOpen] = useState(false);
  const [calendarFilters, setCalendarFilters] = useState<CalendarFilterState>({
    clientTypes: [],
    confirmationStatus: [],
    leadSources: [],
  });

  const [breakDialogOpen, setBreakDialogOpen] = useState(false);
  const [assistantDialogOpen, setAssistantDialogOpen] = useState(false);
  const [blockManagerOpen, setBlockManagerOpen] = useState(false);
  const [breakDefaults, setBreakDefaults] = useState<{ time: string; stylistId: string }>({ time: '09:00', stylistId: '' });



  // Set default location when locations load
  useEffect(() => {
    if (locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0].id);
    }
  }, [locations, selectedLocation]);

  // Keyboard hotkeys: arrows for date/location, letters to jump locations
  useScheduleHotkeys({
    currentDate,
    setCurrentDate,
    selectedLocation,
    setSelectedLocation,
    locations,
  });

  // Handle quick login navigation state
  useEffect(() => {
    const quickLoginState = location.state as QuickLoginState | undefined;
    if (quickLoginState?.quickLoginUserId && !quickLoginHandled.current) {
      quickLoginHandled.current = true;
      setSelectedStaffIds([quickLoginState.quickLoginUserId]);
      toast.success(`Welcome back, ${quickLoginState.quickLoginUserName}!`);
      // Clear the state to prevent re-triggering on navigation
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Handle multi-select staff change
  const handleStaffToggle = (staffId: string) => {
    if (staffId === 'all') {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(prev => 
        prev.includes(staffId) 
          ? prev.filter(id => id !== staffId)
          : [...prev, staffId]
      );
    }
  };

  // Filter appointments by location, staff, and calendar filters
  const appointments = useMemo(() => {
    let filtered = allAppointments;
    
    // Filter by location
    if (selectedLocation) {
      filtered = filtered.filter(apt => apt.location_id === selectedLocation);
    }
    
    // Filter by selected staff (if any are selected)
    if (selectedStaffIds.length > 0) {
      filtered = filtered.filter(apt => 
        apt.stylist_user_id && selectedStaffIds.includes(apt.stylist_user_id)
      );
    }

    // Filter by client type (new/returning)
    if (calendarFilters.clientTypes.length > 0) {
      filtered = filtered.filter(apt => {
        const isNew = apt.is_new_client;
        if (calendarFilters.clientTypes.includes('new') && isNew) return true;
        if (calendarFilters.clientTypes.includes('returning') && !isNew) return true;
        return false;
      });
    }

    // Filter by confirmation status
    if (calendarFilters.confirmationStatus.length > 0) {
      filtered = filtered.filter(apt => {
        const isConfirmed = apt.status === 'confirmed' || apt.status === 'checked_in' || apt.status === 'completed';
        if (calendarFilters.confirmationStatus.includes('confirmed') && isConfirmed) return true;
        if (calendarFilters.confirmationStatus.includes('unconfirmed') && !isConfirmed) return true;
        return false;
      });
    }
    
    return filtered;
  }, [allAppointments, selectedLocation, selectedStaffIds, calendarFilters]);

  // Keep selectedAppointment in sync with latest query data
  useEffect(() => {
    if (selectedAppointment && appointments.length > 0) {
      const fresh = appointments.find(a => a.id === selectedAppointment.id);
      if (fresh && fresh.status !== selectedAppointment.status) {
        setSelectedAppointment(fresh);
      }
    }
  }, [appointments]);

  // Today's appointment count — respects ALL active filters (location, staff, client type, etc.)
  // so the action bar reflects whatever the user is currently viewing.
  const todayAppointmentCount = useMemo(() => {
    const todayStr = orgToday;
    return appointments.filter(apt =>
      apt.appointment_date === todayStr &&
      !['cancelled', 'no_show'].includes(apt.status)
    ).length;
  }, [appointments, orgToday]);

  // Get the phorest_branch_id and effective tax rate for the selected location
  const selectedLocationData = useMemo(() => {
    return locations.find(l => l.id === selectedLocation);
  }, [locations, selectedLocation]);

  const selectedBranchId = selectedLocationData?.phorest_branch_id || null;

  // Calculate effective tax rate for the selected location
  const effectiveTaxRate = useMemo(() => {
    return selectedLocationData?.tax_rate ?? businessSettings?.default_tax_rate ?? 0.08;
  }, [selectedLocationData, businessSettings]);

  // Fetch service-provider staff for DayView columns
  // Two-step: get user_ids with stylist/stylist_assistant roles, then fetch their profiles filtered by location + org
  const { data: locationStylists = [] } = useQuery({
    queryKey: ['schedule-stylists', selectedLocation, orgId],
    queryFn: async () => {
      // 1. Get service-provider user_ids from user_roles
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['stylist', 'stylist_assistant'] as any[]);

      const serviceProviderIds = (roleRows || []).map((r: any) => r.user_id);
      if (serviceProviderIds.length === 0) return [];

      // 2. Fetch profiles for those users, filtered by location + org
      let query = supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url, location_id, location_ids, stylist_level, is_booking, lead_pool_eligible, specialties')
        .eq('is_active', true)
        .eq('is_approved', true)
        .in('user_id', serviceProviderIds);

      if (orgId) query = query.eq('organization_id', orgId);
      if (selectedLocation) {
        query = query.or(`location_id.eq.${selectedLocation},location_ids.cs.{${selectedLocation}}`);
      }

      const { data } = await query;

      // Deduplicate by user_id
      const unique = new Map<string, { user_id: string; display_name: string | null; full_name: string; photo_url: string | null; stylist_level: string | null; is_booking: boolean | null; lead_pool_eligible: boolean; specialties: string[] }>();
      ((data || []) as any[]).forEach((d: any) => {
        if (!unique.has(d.user_id)) {
          unique.set(d.user_id, {
            user_id: d.user_id,
            display_name: d.display_name || null,
            full_name: d.full_name || 'Unknown',
            photo_url: d.photo_url || null,
            stylist_level: d.stylist_level || null,
            is_booking: d.is_booking ?? null,
            lead_pool_eligible: d.lead_pool_eligible ?? true,
            specialties: d.specialties || [],
          });
        }
      });

      return Array.from(unique.values());
    },
    enabled: !!orgId,
  });

  // Fetch work-day schedules for stylists at the selected location
  const { data: stylistSchedules = [] } = useQuery({
    queryKey: ['schedule-stylist-work-days', selectedLocation],
    queryFn: async () => {
      if (!selectedLocation) return [];
      const { data } = await supabase
        .from('employee_location_schedules')
        .select('user_id, work_days')
        .eq('location_id', selectedLocation);
      return (data || []) as { user_id: string; work_days: string[] }[];
    },
    enabled: !!selectedLocation,
  });

  const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Appointment-based staff fallback: only add staff who already passed the role+location filter
  // but may be missing due to stale data. Skip non-service-provider staff entirely.
  const allStylists = useMemo(() => {
    const currentDayKey = DAY_KEYS[currentDate.getDay()];

    // Build a map of user_id -> work_days for this location
    const schedulesMap = new Map(
      stylistSchedules.map(s => [s.user_id, s.work_days])
    );

    // Start with location stylists filtered by work day
    const filteredStylists = locationStylists.filter((s: any) => {
      const workDays = schedulesMap.get(s.user_id);
      // No schedule entry = show always (safe default)
      if (!workDays || workDays.length === 0) return true;
      return workDays.includes(currentDayKey);
    });

    const staffMap = new Map(filteredStylists.map((s: any) => [s.user_id, s]));

    // Only add fallback entries for staff who have appointments at the selected location
    // AND are not already in the staff list. We use appointment data for display name only.
    const locationAppointments = selectedLocation
      ? allAppointments.filter((a: any) => a.location_id === selectedLocation)
      : allAppointments;

    const missingIds = [...new Set(
      locationAppointments
        .map((a: any) => a.stylist_user_id || a.staff_user_id)
        .filter((id: string | null): id is string => !!id && !staffMap.has(id))
    )];

    if (missingIds.length > 0) {
      const appointmentsByStaff = new Map<string, any>();
      locationAppointments.forEach((a: any) => {
        const sid = a.stylist_user_id || a.staff_user_id;
        if (sid && !appointmentsByStaff.has(sid)) {
          appointmentsByStaff.set(sid, a);
        }
      });

      missingIds.forEach(id => {
        const apt = appointmentsByStaff.get(id);
        staffMap.set(id, {
          user_id: id,
          display_name: apt?.staff_name || null,
          full_name: apt?.staff_name || 'Unknown',
          photo_url: null,
          stylist_level: null,
          is_booking: null,
          lead_pool_eligible: true,
        });
      });
    }

    return Array.from(staffMap.values());
  }, [locationStylists, allAppointments, selectedLocation, stylistSchedules, currentDate]);

  // Toggle: show all stylists vs only those with appointments
  const [staffFilterMode, setStaffFilterMode] = useState<'with-appointments' | 'work-this-day'>('work-this-day');

  // Filter stylists based on staff selection + staffFilterMode
  const displayedStylists = useMemo(() => {
    if (selectedStaffIds.length > 0) {
      return allStylists.filter(s => selectedStaffIds.includes(s.user_id));
    }

    if (staffFilterMode === 'with-appointments') {
      const staffWithAppts = new Set(
        appointments.map(a => (a as any).stylist_user_id || (a as any).staff_user_id).filter(Boolean)
      );
      return allStylists.filter(s => staffWithAppts.has(s.user_id));
    }

    return allStylists;
  }, [allStylists, selectedStaffIds, staffFilterMode, appointments]);

  // Per-stylist utilization for the current date — feeds the staff-dropdown capacity badge.
  const headerUtilization = useMemo(() => {
    const hStart = zoomLevel <= -3 ? 6 : zoomLevel === -2 ? 6 : zoomLevel === -1 ? 7 : preferences.hours_start;
    const hEnd = zoomLevel <= -3 ? 24 : zoomLevel === -2 ? 22 : zoomLevel === -1 ? 21 : preferences.hours_end;
    return computeUtilizationByStylist(
      allStylists,
      appointments as any,
      format(currentDate, 'yyyy-MM-dd'),
      hStart,
      hEnd,
    );
  }, [allStylists, appointments, currentDate, zoomLevel, preferences.hours_start, preferences.hours_end]);

  // Stylists enriched with utilization for the dropdown.
  const headerStylists = useMemo(
    () => allStylists.map((s) => ({ ...s, utilization: headerUtilization.get(s.user_id) ?? 0 })),
    [allStylists, headerUtilization],
  );

  // Auto-switch to agenda view on mobile
  useEffect(() => {
    if (isMobile && view !== 'agenda') {
      setView('agenda');
    }
  }, [isMobile]);

  // Handle deep-link from forecast drill-down
  useEffect(() => {
    const state = location.state as { focusDate?: string; focusAppointmentId?: string } | null;
    if (state?.focusDate) {
      setCurrentDate(parseISO(state.focusDate));
      if (!isMobile) setView('day');
      // Clear state to prevent re-trigger on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Auto-select appointment from deep-link after data loads
  useEffect(() => {
    const state = location.state as { focusAppointmentId?: string } | null;
    if (state?.focusAppointmentId && allAppointments.length > 0) {
      const target = allAppointments.find(a => a.id === state.focusAppointmentId);
      if (target) {
        setSelectedAppointment(target);
        setDetailOpen(true);
      }
    }
  }, [allAppointments, location.state]);

  const handleAppointmentClick = (apt: PhorestAppointment) => {
    setSelectedAppointment(apt);
    setDetailOpen(true);
  };

  const handleMeetingClick = (meeting: AdminMeeting & { admin_meeting_attendees?: { user_id: string; rsvp_status: string }[] }) => {
    setSelectedMeeting(meeting);
    setMeetingDetailOpen(true);
  };

  const handleSlotClick = (dateOrStylistId: Date | string, time: string) => {
    const slotDate = typeof dateOrStylistId === 'string' ? currentDate : dateOrStylistId;
    const stylistId = typeof dateOrStylistId === 'string' ? dateOrStylistId : undefined;

    // Check if the slot is in the past
    const slotDateTime = new Date(slotDate);
    const [slotH, slotM] = time.split(':').map(Number);
    slotDateTime.setHours(slotH, slotM, 0, 0);
    if (slotDateTime < new Date()) {
      toast.error('Cannot schedule in the past');
      return;
    }

    // Check if location is closed or slot is outside hours
    if (selectedLocationData) {
      const hoursInfo = getLocationHoursForDate(
        selectedLocationData.hours_json,
        selectedLocationData.holiday_closures,
        slotDate
      );

      const isOutsideHours = !hoursInfo.isClosed && hoursInfo.openTime && hoursInfo.closeTime &&
        (time < hoursInfo.openTime || time >= hoursInfo.closeTime);

      if (hoursInfo.isClosed || isOutsideHours) {
        setClosedDayWarning({
          open: true,
          date: slotDate,
          reason: hoursInfo.closureReason,
          isOutsideHours: !!isOutsideHours,
          pendingAction: () => {
            if (stylistId) {
              setBookingDefaults({ date: slotDate, stylistId, time });
            } else {
              setBookingDefaults({ date: slotDate, time });
            }
            setBookingOpen(true);
          },
        });
        return;
      }
    }

    if (typeof dateOrStylistId === 'string') {
      setBookingDefaults({ date: currentDate, stylistId: dateOrStylistId, time });
    } else {
      setBookingDefaults({ date: dateOrStylistId, time });
    }

    // Admins (with or without service-provider role) get the type selector
    // so they can book client appointments, internal meetings, or timeblocks.
    if (isAdminRole) {
      setTypeSelectorOpen(true);
    } else {
      setBookingOpen(true);
    }
  };

  const handleCopilotSlotSelect = (time: string, staffUserId: string) => {
    setBookingDefaults({ date: currentDate, stylistId: staffUserId, time });
    setBookingOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setView('day');
  };

  const handleDayDoubleClick = (date: Date) => {
    setCurrentDate(date);
    setView('day');
  };

  const handleNewBooking = () => {
    // Any admin gets the type selector (client appt / meeting / timeblock).
    // Pure stylists go straight to client booking.
    if (isAdminRole) {
      setActiveDraft(null);
      setBookingDefaults({});
      setTypeSelectorOpen(true);
      return;
    }
    setActiveDraft(null);
    setBookingDefaults({});
    setBookingOpen(true);
  };

  const handleResumeDraft = (draft: DraftBooking) => {
    setActiveDraft(draft);
    setBookingDefaults({
      date: draft.appointment_date ? new Date(draft.appointment_date + 'T12:00:00') : currentDate,
      time: draft.start_time || '09:00',
      stylistId: draft.staff_user_id || undefined,
    });
    setBookingOpen(true);
  };

  const handleStatusChange = (status: any, options?: { rebooked_at_checkout?: boolean; tip_amount?: number; rebook_declined_reason?: string | null }) => {
    if (selectedAppointment) {
      updateStatus({ appointmentId: selectedAppointment.id, status, ...options });
    }
  };

  // Action bar handlers
  const handleCheckIn = () => handleStatusChange('checked_in');
  const handleConfirm = () => handleStatusChange('confirmed');
  const handlePay = () => {
    if (selectedAppointment) {
      setCheckoutOpen(true);
    }
  };
  const handleCheckoutConfirm = async (
    tipAmount: number,
    rebooked: boolean,
    promoResult?: any,
    declineReason?: string,
    paymentMetadata?: { method: string; stripe_payment_intent_id?: string }
  ) => {
    if (!selectedAppointment) return;

    // Persist applied promo if present
    if (promoResult?.valid && promoResult?.promotion) {
      try {
        await supabase.from('applied_promotions' as any).insert({
          organization_id: orgId,
          appointment_id: selectedAppointment.id,
          promotion_id: promoResult.promotion.id,
          promo_code: promoResult.promotion.promo_code,
          discount_amount: promoResult.calculated_discount ?? 0,
          discount_type: promoResult.promotion.promotion_type,
        });
      } catch (e) {
        console.error('Failed to persist promo result:', e);
      }
    }

    // G4 fix: Merge status change + payment metadata into a single atomic update
    const updatePayload: Record<string, unknown> = {
      status: 'completed',
      rebooked_at_checkout: rebooked,
      tip_amount: tipAmount,
      rebook_declined_reason: declineReason || null,
    };

    if (paymentMetadata) {
      updatePayload.payment_method = paymentMetadata.method;
      updatePayload.payment_status = paymentMetadata.stripe_payment_intent_id ? 'paid' : 'completed';
      updatePayload.stripe_payment_intent_id = paymentMetadata.stripe_payment_intent_id || null;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update(updatePayload)
        .eq('id', selectedAppointment.id);

      if (error) {
        console.error('Failed to complete appointment:', error);
        toast.error('Failed to complete checkout');
        return;
      }

      // B1 fix: Insert transaction record for card payments so they appear in reports
      if (paymentMetadata?.method === 'card_reader' || paymentMetadata?.method === 'card') {
        const totalPrice = selectedAppointment.total_price ?? selectedAppointment.original_price ?? 0;
        const transactionInsert = {
          transaction_id: paymentMetadata.stripe_payment_intent_id || `terminal_${selectedAppointment.id}`,
          item_name: selectedAppointment.service_name || 'Service',
          item_type: 'service',
          total_amount: totalPrice,
          tip_amount: tipAmount || null,
          payment_method: 'card_reader',
          transaction_date: selectedAppointment.appointment_date || format(new Date(), 'yyyy-MM-dd'),
          client_name: selectedAppointment.client_name || null,
          staff_user_id: selectedAppointment.stylist_user_id || null,
          location_id: selectedAppointment.location_id || null,
          organization_id: orgId,
          appointment_id: selectedAppointment.id || null,
        };
        const { error: txError } = await supabase
          .from('transaction_items')
          .insert(transactionInsert);
        if (txError) {
          console.error('Failed to insert transaction record:', txError);
          // Non-blocking — appointment is already completed
        }
      }

      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['phorest-sales'] });
      toast.success('Appointment completed');
    } catch (e) {
      console.error('Failed to complete appointment:', e);
      toast.error('Failed to complete checkout');
      return;
    }

    setCheckoutOpen(false);
    setCheckoutRebookCompleted(false);
    setSelectedAppointment(null);
  };

  // Triggered from CheckoutSummarySheet "Schedule Next" button
  const handleCheckoutScheduleNext = (apt: PhorestAppointment) => {
    // Pre-fill rebook data and open the booking popover
    setBookingDefaults({ date: currentDate, stylistId: apt.stylist_user_id || undefined });
    setActiveDraft(null);
    setRebookData({
      clientId: apt.phorest_client_id || undefined,
      clientName: apt.client_name || undefined,
      staffUserId: apt.stylist_user_id || undefined,
      staffName: apt.stylist_profile?.display_name || apt.stylist_profile?.full_name || undefined,
      selectedServices: [], // service IDs resolved in QuickBookingPopover if needed
    });
    setBookingOpen(true);
  };

  // FIX #3: Action bar cancel now opens reason dialog instead of direct cancel
  const handleRemove = () => {
    if (selectedAppointment) {
      setActionBarCancelReason('');
      setActionBarCancelOpen(true);
    }
  };

  const confirmActionBarCancel = () => {
    if (selectedAppointment) {
      // If reason provided, we need to add a note -- but we don't have useAppointmentNotes here.
      // Instead, append the reason to the appointment notes via a direct supabase update
      if (actionBarCancelReason.trim() && user?.id) {
        const prefix = '[Cancelled]';
        const noteText = `${prefix} ${actionBarCancelReason.trim()}`;
        supabase
          .from('appointment_notes')
          .insert({
            phorest_appointment_id: selectedAppointment.phorest_id || selectedAppointment.id,
            author_id: user.id,
            note: noteText,
            is_private: false,
          })
          .then(({ error }) => {
            if (error) toast.warning('Cancellation reason could not be saved');
          });
      }
      handleStatusChange('cancelled');
      toast.success('Appointment cancelled');
      setActionBarCancelOpen(false);
      setActionBarCancelReason('');
    }
  };

  const handleNotes = () => {
    if (selectedAppointment) {
      setInitialTab('notes');
      setDetailOpen(true);
    }
  };

  // FIX #1: Open client profile from detail panel
  const handleOpenClientProfile = (phorestClientId: string) => {
    // Fetch client data to pass to ClientDetailSheet
    supabase
      .from('v_all_clients' as any)
      .select('*')
      .eq('phorest_client_id', phorestClientId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setClientDetailData(data);
          setClientDetailOpen(true);
        } else {
          toast.error('Client not found');
        }
      });
  };

  // ─── Calendar Content ─────────────────────────────────────────
  const calendarContent = (
    <>
      {isLoading ? (
        <DashboardLoader size="lg" className="h-full" />
      ) : (
        <>
          {view === 'day' && selectedLocationData && (() => {
            const hoursInfo = getLocationHoursForDate(
              selectedLocationData.hours_json,
              selectedLocationData.holiday_closures,
              currentDate
            );
            return (
              <DayView
                date={currentDate}
                appointments={appointments}
                stylists={displayedStylists}
                hoursStart={zoomLevel <= -3 ? 6 : zoomLevel === -2 ? 6 : zoomLevel === -1 ? 7 : preferences.hours_start}
                hoursEnd={zoomLevel <= -3 ? 24 : zoomLevel === -2 ? 22 : zoomLevel === -1 ? 21 : preferences.hours_end}
                onAppointmentClick={handleAppointmentClick}
                onSlotClick={handleSlotClick}
                selectedAppointmentId={selectedAppointment?.id}
                locationHours={hoursInfo.openTime && hoursInfo.closeTime ? { open: hoursInfo.openTime, close: hoursInfo.closeTime } : null}
                isLocationClosed={hoursInfo.isClosed}
                closureReason={hoursInfo.closureReason}
                assistedAppointmentIds={assistedAppointmentIds}
                appointmentsWithAssistants={appointmentsWithAssistants}
                colorBy="service"
                serviceLookup={serviceLookup}
                assistantNamesMap={assistantNamesMap}
                assistantProfilesMap={assistantProfilesMap}
                assistantTimeBlocks={assistantTimeBlocks}
                onBlockClick={() => setBlockManagerOpen(true)}
                adminMeetings={adminMeetings}
                onMeetingClick={handleMeetingClick}
                zoomLevel={zoomLevel}
                scheduleBlocks={scheduleBlocks}
              />
            );
          })()}
          {view === 'day' && !selectedLocationData && (
            <DayView
              date={currentDate}
              appointments={appointments}
              stylists={displayedStylists}
               hoursStart={zoomLevel <= -3 ? 6 : zoomLevel === -2 ? 6 : zoomLevel === -1 ? 7 : preferences.hours_start}
               hoursEnd={zoomLevel <= -3 ? 24 : zoomLevel === -2 ? 22 : zoomLevel === -1 ? 21 : preferences.hours_end}
              onAppointmentClick={handleAppointmentClick}
              onSlotClick={handleSlotClick}
              
              selectedAppointmentId={selectedAppointment?.id}
              assistedAppointmentIds={assistedAppointmentIds}
              appointmentsWithAssistants={appointmentsWithAssistants}
               colorBy="service"
              serviceLookup={serviceLookup}
               assistantNamesMap={assistantNamesMap}
                 assistantProfilesMap={assistantProfilesMap}
                  assistantTimeBlocks={assistantTimeBlocks}
                  onBlockClick={() => setBlockManagerOpen(true)}
                   adminMeetings={adminMeetings}
                   onMeetingClick={handleMeetingClick}
                    zoomLevel={zoomLevel}
                    scheduleBlocks={scheduleBlocks}
                />
          )}
          
          {view === 'week' && (
            <WeekView
              currentDate={currentDate}
              appointments={appointments}
              hoursStart={zoomLevel <= -3 ? 6 : zoomLevel === -2 ? 6 : zoomLevel === -1 ? 7 : preferences.hours_start}
              hoursEnd={zoomLevel <= -3 ? 24 : zoomLevel === -2 ? 22 : zoomLevel === -1 ? 21 : preferences.hours_end}
              onAppointmentClick={handleAppointmentClick}
              onSlotClick={handleSlotClick}
              selectedLocationId={selectedLocation}
              onDayDoubleClick={handleDayDoubleClick}
              locationHoursJson={selectedLocationData?.hours_json}
              locationHolidayClosures={selectedLocationData?.holiday_closures}
              assistedAppointmentIds={assistedAppointmentIds}
              appointmentsWithAssistants={appointmentsWithAssistants}
              colorBy="service"
              serviceLookup={serviceLookup}
              assistantNamesMap={assistantNamesMap}
              assistantProfilesMap={assistantProfilesMap}
               zoomLevel={zoomLevel}
               scheduleBlocks={scheduleBlocks}
            />
          )}
          
          {view === 'month' && (
            <MonthView
              currentDate={currentDate}
              appointments={appointments}
              onDayClick={handleDayClick}
              onAppointmentClick={handleAppointmentClick}
              locationHoursJson={selectedLocationData?.hours_json}
              locationHolidayClosures={selectedLocationData?.holiday_closures}
            />
          )}
          
          {view === 'agenda' && (
            <AgendaView
              currentDate={currentDate}
              appointments={appointments}
              onAppointmentClick={handleAppointmentClick}
              assistedAppointmentIds={assistedAppointmentIds}
              assistantNamesMap={assistantNamesMap}
              appointmentsWithAssistants={appointmentsWithAssistants}
              serviceLookup={serviceLookup}
              assistantTimeBlocks={rangeTimeBlocks}
              adminMeetings={adminMeetings}
              onMeetingClick={handleMeetingClick}
            />
           )}

        </>
      )}
    </>
  );

  return (
    <LocationTimezoneProvider timezone={locationTimezone}>
    <DashboardLayout hideFooter>
      <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-4 pt-4">
          <ScheduleHeader
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                view={view}
                setView={setView}
                selectedStaffIds={selectedStaffIds}
                onStaffToggle={handleStaffToggle}
                stylists={headerStylists}
                selectedLocation={selectedLocation}
                onLocationChange={setSelectedLocation}
                locations={locations}
                onNewBooking={handleNewBooking}
                canCreate={canCreate}
                isAdminRole={isAdminRole}
                isServiceProvider={isServiceProvider}
                calendarFilters={calendarFilters}
                onCalendarFiltersChange={setCalendarFilters}
                draftCount={drafts.length}
                onOpenDrafts={() => setDraftsSheetOpen(true)}
                pendingBlockCount={pendingCount}
                onOpenBlockManager={() => setBlockManagerOpen(true)}
                showShiftsView={showShiftsView}
                onToggleShiftsView={() => setShowShiftsView(prev => !prev)}
                staffFilterMode={staffFilterMode}
                onStaffFilterModeChange={setStaffFilterMode}
                appointments={appointments}
                hoursStart={preferences.hours_start}
                hoursEnd={preferences.hours_end}
              />
        </div>

        {/* Main Content Area */}
        {showShiftsView ? (
          <div className="flex-1 min-h-0 p-4 overflow-hidden">
            <div className="h-full min-h-0 overflow-auto">
              <ShiftScheduleView locationId={selectedLocation} />
            </div>
          </div>
        ) : (
          <>
            <div className={cn("flex flex-1 min-h-0 flex-col overflow-hidden p-4")}>
              {copilotOpen && !isMobile ? (
                <ResizablePanelGroup direction="horizontal" className="h-full min-h-0">
                  <ResizablePanel defaultSize={75} minSize={50}>
                    <div className="h-full min-h-0 overflow-hidden">
                      {calendarContent}
                    </div>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                    <div className="h-full min-h-0 overflow-auto pl-2">
                      <SchedulingCopilotPanel
                        date={currentDate}
                        locationId={selectedLocation}
                        onSelectSlot={handleCopilotSlotSelect}
                        onClose={() => setCopilotOpen(false)}
                      />
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              ) : (
                <div className="h-full min-h-0 overflow-hidden">
                  {calendarContent}
                </div>
              )}
            </div>

            {(view === 'day' || view === 'week' || view === 'agenda') && (
              <div className="shrink-0 px-4 pr-20 pb-0 pt-1">
                <div className="flex items-center gap-2">
                  <ScheduleActionBar
                    appointments={allAppointments.filter(apt => 
                      apt.appointment_date === orgToday &&
                      apt.location_id === selectedLocation
                    )}
                    onSelectAppointment={(apt) => {
                      setSelectedAppointment(apt);
                      setDetailOpen(true);
                    }}
                    todayAppointmentCount={todayAppointmentCount}
                    zoomLevel={zoomLevel}
                    onZoomIn={() => setZoomLevel(prev => Math.min(prev + 1, 3))}
                    onZoomOut={() => setZoomLevel(prev => Math.max(prev - 1, -3))}
                    onCreateAppointment={handleNewBooking}
                    onOpenBlockManager={() => setBlockManagerOpen(true)}
                    pendingBlockCount={pendingCount}
                    onOpenDrafts={() => setDraftsSheetOpen(true)}
                    draftCount={drafts.length}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AppointmentDetailSheet
        appointment={selectedAppointment}
        open={detailOpen}
        onOpenChange={(open) => { setDetailOpen(open); if (!open) setInitialTab(undefined); }}
        initialTab={initialTab}
        onStatusChange={(appointmentId, status) => {
          // FIX #2: Use the appointmentId passed from the panel
          updateStatus({ appointmentId, status });
        }}
        isUpdating={isUpdating}
        onRebook={(apt) => {
          setDetailOpen(false);
          // FIX #15/A: Pre-fill client data for rebook via rebookData state
          setBookingDefaults({ date: currentDate, stylistId: apt.stylist_user_id || undefined });
          setActiveDraft(null);
          setRebookData({
            clientId: apt.phorest_client_id || undefined,
            clientName: apt.client_name || undefined,
            staffUserId: apt.stylist_user_id || undefined,
            staffName: apt.stylist_profile?.display_name || apt.stylist_profile?.full_name || undefined,
            selectedServices: [],
          });
          setBookingOpen(true);
        }}
        onReschedule={(apt) => {
          setDetailOpen(false);
          setBookingDefaults({ date: new Date(apt.appointment_date + 'T12:00:00'), stylistId: apt.stylist_user_id || undefined, time: apt.start_time });
          setBookingOpen(true);
        }}
        onPay={(apt) => {
          setDetailOpen(false);
          setCheckoutOpen(true);
        }}
        onOpenClientProfile={handleOpenClientProfile}
      />

      <CheckoutSummarySheet
        appointment={selectedAppointment}
        open={checkoutOpen}
        onOpenChange={(open) => {
          setCheckoutOpen(open);
          if (!open) setCheckoutRebookCompleted(false);
        }}
        onConfirm={handleCheckoutConfirm}
        isUpdating={isUpdating}
        taxRate={effectiveTaxRate}
        businessSettings={businessSettings || null}
        locationName={selectedLocationData?.name || ''}
        locationAddress={selectedLocationData?.address}
        locationPhone={selectedLocationData?.phone}
        organizationId={orgId}
        locationId={selectedLocation}
        onScheduleNext={handleCheckoutScheduleNext}
        rebookCompleted={checkoutRebookCompleted}
      />

      <QuickBookingPopover
        mode="panel"
        open={bookingOpen}
        onOpenChange={(open) => {
          setBookingOpen(open);
          if (!open) {
            setActiveDraft(null);
            setRebookData(null);
          }
        }}
        date={bookingDefaults.date || currentDate}
        time={bookingDefaults.time || '09:00'}
        defaultLocationId={selectedLocation}
        defaultStylistId={bookingDefaults.stylistId}
        onBookingComplete={(bookedDate) => {
          setCurrentDate(bookedDate);
          // If checkout is open, signal that rebook completed
          if (checkoutOpen) {
            setCheckoutRebookCompleted(true);
          }
        }}
        draftId={activeDraft?.id}
        initialDraftData={activeDraft ? {
          locationId: activeDraft.location_id || undefined,
          clientId: activeDraft.client_id,
          clientName: activeDraft.client_name,
          staffUserId: activeDraft.staff_user_id,
          staffName: activeDraft.staff_name,
          selectedServices: activeDraft.selected_services?.map(s => s.id) || [],
          notes: activeDraft.notes || undefined,
          stepReached: activeDraft.step_reached || undefined,
          isRedo: activeDraft.is_redo,
          redoMetadata: activeDraft.redo_metadata,
        } : rebookData ? {
          clientId: rebookData.clientId,
          clientName: rebookData.clientName,
          staffUserId: rebookData.staffUserId,
          staffName: rebookData.staffName,
          selectedServices: rebookData.selectedServices,
        } : undefined}
      />

      <DraftBookingsSheet
        open={draftsSheetOpen}
        onOpenChange={setDraftsSheetOpen}
        orgId={orgId}
        onResume={handleResumeDraft}
      />

      {/* FIX #1: ClientDetailSheet rendered in Schedule */}
      <ClientDetailSheet
        client={clientDetailData}
        open={clientDetailOpen}
        onOpenChange={setClientDetailOpen}
        locationName={selectedLocationData?.name}
      />

      <ClosedDayWarningDialog
        open={closedDayWarning.open}
        onOpenChange={(open) => setClosedDayWarning(prev => ({ ...prev, open }))}
        onConfirm={() => {
          setClosedDayWarning(prev => ({ ...prev, open: false }));
          closedDayWarning.pendingAction?.();
        }}
        date={closedDayWarning.date}
        locationName={selectedLocationData?.name || 'This location'}
        reason={closedDayWarning.reason}
        isOutsideHours={closedDayWarning.isOutsideHours}
      />

      {/* FIX #3: Action Bar Cancel Reason Dialog */}
      <AlertDialog open={actionBarCancelOpen} onOpenChange={(open) => { if (!open) { setActionBarCancelOpen(false); setActionBarCancelReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the appointment for {selectedAppointment?.client_name}. The client may need to be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Textarea
              placeholder="Reason for cancellation (optional)..."
              value={actionBarCancelReason}
              onChange={e => setActionBarCancelReason(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActionBarCancel}>
              Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Break dialog from context menu */}
      <Dialog open={breakDialogOpen} onOpenChange={setBreakDialogOpen}>
        <DialogContent className="sm:max-w-md p-0">
          <DialogTitle className="sr-only">Add Break / Block</DialogTitle>
          <AddTimeBlockForm
            date={currentDate}
            time={breakDefaults.time}
            defaultStylistId={breakDefaults.stylistId}
            onBack={() => setBreakDialogOpen(false)}
            onComplete={() => setBreakDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Request Assistant dialog from context menu */}
      <Dialog open={assistantDialogOpen} onOpenChange={setAssistantDialogOpen}>
        <DialogContent className="sm:max-w-md p-0">
          <DialogTitle className="sr-only">Request Assistant</DialogTitle>
          <RequestAssistantPanel
            date={currentDate}
            time={breakDefaults.time}
            requestingUserId={breakDefaults.stylistId}
            requestingUserName={allStylists.find(s => s.user_id === breakDefaults.stylistId)?.display_name || allStylists.find(s => s.user_id === breakDefaults.stylistId)?.full_name || 'Stylist'}
            appointments={appointments}
            locationId={selectedLocation}
            onBack={() => setAssistantDialogOpen(false)}
            onSubmit={(params) => {
              createAssistantBlock(params);
              setAssistantDialogOpen(false);
            }}
            isSubmitting={isCreatingBlock}
          />
        </DialogContent>
      </Dialog>

      {/* Assistant Block Manager Sheet */}
      <AssistantBlockManagerSheet
        open={blockManagerOpen}
        onOpenChange={setBlockManagerOpen}
        locationId={selectedLocation}
        currentDate={currentDate}
      />

      {/* Meeting Scheduler Wizard */}
      <MeetingSchedulerWizard
        open={meetingWizardOpen}
        onOpenChange={setMeetingWizardOpen}
        defaultDate={currentDate}
      />

      {/* Meeting Detail Panel */}
      <MeetingDetailPanel
        meeting={selectedMeeting}
        open={meetingDetailOpen}
        onOpenChange={setMeetingDetailOpen}
      />

      {/* Type Selector Dialog (dual-role users) */}
      <Dialog open={typeSelectorOpen} onOpenChange={setTypeSelectorOpen}>
        <DialogContent className="sm:max-w-sm p-6">
          <DialogTitle className="sr-only">Schedule Type</DialogTitle>
          <ScheduleTypeSelector
            selectedTime={bookingDefaults.time}
            onSelectClientBooking={() => {
              setTypeSelectorOpen(false);
              setActiveDraft(null);
              setBookingDefaults({});
              setBookingOpen(true);
            }}
            onSelectMeeting={() => {
              setTypeSelectorOpen(false);
              setMeetingWizardOpen(true);
            }}
            onSelectTimeblock={() => {
              setTypeSelectorOpen(false);
              setBreakDefaults({ time: bookingDefaults.time || '09:00', stylistId: bookingDefaults.stylistId || '' });
              setBreakDialogOpen(true);
            }}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
    </LocationTimezoneProvider>
  );
}
