import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ScheduleHeader } from '@/components/dashboard/schedule/ScheduleHeader';
import { ScheduleActionBar } from '@/components/dashboard/schedule/ScheduleActionBar';
// ScheduleLegend is now embedded inside ScheduleActionBar
import { DayView } from '@/components/dashboard/schedule/DayView';
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
import type { AssistantTimeBlock } from '@/hooks/useAssistantTimeBlocks';
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
  const isMobile = useIsMobile();
  const location = useLocation();
  const { preferences } = useCalendarPreferences();
  const effectiveUserId = useEffectiveUserId();
  const { roles, user } = useAuth();
  const { data: locations = [] } = useActiveLocations();
  const { data: businessSettings } = useBusinessSettings();
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

  // Calculate today's appointment count for the selected location
  const todayAppointmentCount = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return allAppointments.filter(apt => 
      apt.appointment_date === today && 
      apt.location_id === selectedLocation &&
      !['cancelled', 'no_show'].includes(apt.status)
    ).length;
  }, [allAppointments, selectedLocation]);

  // Get the phorest_branch_id and effective tax rate for the selected location
  const selectedLocationData = useMemo(() => {
    return locations.find(l => l.id === selectedLocation);
  }, [locations, selectedLocation]);

  const selectedBranchId = selectedLocationData?.phorest_branch_id || null;

  // Calculate effective tax rate for the selected location
  const effectiveTaxRate = useMemo(() => {
    return selectedLocationData?.tax_rate ?? businessSettings?.default_tax_rate ?? 0.08;
  }, [selectedLocationData, businessSettings]);

  // Fetch stylists for DayView - filter by selected location's branch
  const { data: allStylists = [] } = useQuery({
    queryKey: ['schedule-stylists-with-mapping', selectedBranchId],
    queryFn: async () => {
      let query = supabase
        .from('phorest_staff_mapping')
        .select(`
          user_id,
          phorest_branch_id,
          employee_profiles!phorest_staff_mapping_user_id_fkey(
            user_id,
            display_name,
            full_name,
            photo_url
          )
        `)
        .eq('is_active', true)
        .eq('show_on_calendar', true);
      
      // Filter by branch if selected
      if (selectedBranchId) {
        query = query.eq('phorest_branch_id', selectedBranchId);
      }
      
      const { data } = await query;
      
      // Deduplicate by user_id (staff may be mapped to multiple locations)
      const uniqueStylists = new Map<string, { user_id: string; display_name: string | null; full_name: string; photo_url: string | null }>();
      
      (data || []).forEach((d: any) => {
        if (!uniqueStylists.has(d.user_id)) {
          uniqueStylists.set(d.user_id, {
            user_id: d.user_id,
            display_name: d.employee_profiles?.display_name || null,
            full_name: d.employee_profiles?.full_name || 'Unknown',
            photo_url: d.employee_profiles?.photo_url || null,
          });
        }
      });
      
      return Array.from(uniqueStylists.values());
    },
  });

  // Filter stylists based on staff selection (for day view columns)
  const displayedStylists = selectedStaffIds.length === 0
    ? allStylists 
    : allStylists.filter(s => selectedStaffIds.includes(s.user_id));

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

    // Role-based branching (mirrors handleNewBooking logic)
    if (isAdminRole && !isServiceProvider) {
      setMeetingWizardOpen(true);
    } else if (isAdminRole && isServiceProvider) {
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
    // Role-based branching: admin-only → meeting wizard, dual-role → type selector
    if (isAdminRole && !isServiceProvider) {
      setMeetingWizardOpen(true);
      return;
    }
    if (isAdminRole && isServiceProvider) {
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
  const handleCheckoutConfirm = async (tipAmount: number, rebooked: boolean, promoResult?: any, declineReason?: string) => {
    // Persist applied promo if present
    if (promoResult?.valid && promoResult?.promotion && selectedAppointment) {
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

    handleStatusChange('completed', { 
      rebooked_at_checkout: rebooked, 
      tip_amount: tipAmount,
      rebook_declined_reason: declineReason || null,
    });
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
      .from('phorest_clients')
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
                hoursStart={preferences.hours_start}
                hoursEnd={preferences.hours_end}
                onAppointmentClick={handleAppointmentClick}
                onSlotClick={handleSlotClick}
                selectedAppointmentId={selectedAppointment?.id}
                locationHours={hoursInfo.openTime && hoursInfo.closeTime ? { open: hoursInfo.openTime, close: hoursInfo.closeTime } : null}
                isLocationClosed={hoursInfo.isClosed}
                closureReason={hoursInfo.closureReason}
                assistedAppointmentIds={assistedAppointmentIds}
                appointmentsWithAssistants={appointmentsWithAssistants}
                colorBy={preferences.color_by as 'status' | 'service' | 'stylist'}
                serviceLookup={serviceLookup}
                assistantNamesMap={assistantNamesMap}
                assistantProfilesMap={assistantProfilesMap}
                assistantTimeBlocks={assistantTimeBlocks}
                onBlockClick={() => setBlockManagerOpen(true)}
                adminMeetings={adminMeetings}
                onMeetingClick={handleMeetingClick}
              />
            );
          })()}
          {view === 'day' && !selectedLocationData && (
            <DayView
              date={currentDate}
              appointments={appointments}
              stylists={displayedStylists}
              hoursStart={preferences.hours_start}
              hoursEnd={preferences.hours_end}
              onAppointmentClick={handleAppointmentClick}
              onSlotClick={handleSlotClick}
              
              selectedAppointmentId={selectedAppointment?.id}
              assistedAppointmentIds={assistedAppointmentIds}
              appointmentsWithAssistants={appointmentsWithAssistants}
              colorBy={preferences.color_by as 'status' | 'service' | 'stylist'}
              serviceLookup={serviceLookup}
               assistantNamesMap={assistantNamesMap}
                 assistantProfilesMap={assistantProfilesMap}
                  assistantTimeBlocks={assistantTimeBlocks}
                  onBlockClick={() => setBlockManagerOpen(true)}
                  adminMeetings={adminMeetings}
                  onMeetingClick={handleMeetingClick}
               />
          )}
          
          {view === 'week' && (
            <WeekView
              currentDate={currentDate}
              appointments={appointments}
              hoursStart={preferences.hours_start}
              hoursEnd={preferences.hours_end}
              onAppointmentClick={handleAppointmentClick}
              onSlotClick={handleSlotClick}
              selectedLocationId={selectedLocation}
              onDayDoubleClick={handleDayDoubleClick}
              locationHoursJson={selectedLocationData?.hours_json}
              locationHolidayClosures={selectedLocationData?.holiday_closures}
              assistedAppointmentIds={assistedAppointmentIds}
              appointmentsWithAssistants={appointmentsWithAssistants}
              colorBy={preferences.color_by as 'status' | 'service' | 'stylist'}
              serviceLookup={serviceLookup}
              assistantNamesMap={assistantNamesMap}
              assistantProfilesMap={assistantProfilesMap}
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
    <DashboardLayout hideFooter>
      <div className="flex flex-col h-screen relative">
        {/* Header */}
        <div className="px-4 pt-4">
          <ScheduleHeader
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                view={view}
                setView={setView}
                selectedStaffIds={selectedStaffIds}
                onStaffToggle={handleStaffToggle}
                stylists={allStylists}
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
              />
        </div>


        {/* Main Content Area */}
        {showShiftsView ? (
          <div className="flex-1 p-4 overflow-y-auto">
            <ShiftScheduleView locationId={selectedLocation} />
          </div>
        ) : (
          <>
            <div className={cn("flex-1 p-4 overflow-hidden", (view === 'day' || view === 'week') && "pb-[91px]")}>
              {copilotOpen && !isMobile ? (
                <ResizablePanelGroup direction="horizontal" className="h-full">
                  <ResizablePanel defaultSize={75} minSize={50}>
                    {calendarContent}
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                    <div className="h-full overflow-auto pl-2">
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
                calendarContent
              )}
            </div>

            {/* Floating Action Bar */}
            {(view === 'day' || view === 'week') && (
          <div className="absolute bottom-0 left-0 right-0 pl-4 pr-20 pb-4 pointer-events-none z-20">
            <div className="pointer-events-auto flex items-center gap-2">
              <ScheduleActionBar
                appointments={allAppointments.filter(apt => 
                  apt.appointment_date === format(new Date(), 'yyyy-MM-dd') &&
                  apt.location_id === selectedLocation
                )}
                onSelectAppointment={(apt) => {
                  setSelectedAppointment(apt);
                  setDetailOpen(true);
                }}
                todayAppointmentCount={todayAppointmentCount}
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
  );
}
