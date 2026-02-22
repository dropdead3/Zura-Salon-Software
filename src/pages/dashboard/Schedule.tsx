import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ScheduleHeader } from '@/components/dashboard/schedule/ScheduleHeader';
import { ScheduleActionBar } from '@/components/dashboard/schedule/ScheduleActionBar';
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
import { Loader2, Sparkles, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CalendarFilterState } from '@/components/dashboard/schedule/CalendarFiltersPopover';
import { AddTimeBlockForm } from '@/components/dashboard/schedule/AddTimeBlockForm';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface QuickLoginState {
  quickLoginUserId?: string;
  quickLoginUserName?: string;
}


export default function Schedule() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { preferences } = useCalendarPreferences();
  const effectiveUserId = useEffectiveUserId();
  const { roles } = useAuth();
  const { data: locations = [] } = useActiveLocations();
  const { data: businessSettings } = useBusinessSettings();
  const quickLoginHandled = useRef(false);
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: drafts = [] } = useDraftBookings(orgId);
  
  // Check if user is stylist or stylist_assistant (they get full calendar view access)
  const isStylistRole = roles.includes('stylist') || roles.includes('stylist_assistant');
  
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

  // State for selections and sheets
  const [selectedAppointment, setSelectedAppointment] = useState<PhorestAppointment | null>(null);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [closedDayWarning, setClosedDayWarning] = useState<{
    open: boolean;
    date: Date;
    reason?: string;
    isOutsideHours?: boolean;
    pendingAction?: () => void;
  }>({ open: false, date: new Date() });
  // Listen for FAB toggle event
  useEffect(() => {
    const handleToggle = () => setCopilotOpen(prev => !prev);
    window.addEventListener('toggle-scheduling-copilot', handleToggle);
    return () => window.removeEventListener('toggle-scheduling-copilot', handleToggle);
  }, []);
  const [bookingDefaults, setBookingDefaults] = useState<{ date?: Date; stylistId?: string; time?: string }>({});
  const [activeDraft, setActiveDraft] = useState<DraftBooking | null>(null);
  const [draftsSheetOpen, setDraftsSheetOpen] = useState(false);
  const [calendarFilters, setCalendarFilters] = useState<CalendarFilterState>({
    clientTypes: [],
    confirmationStatus: [],
    leadSources: [],
  });

  // Right-click "Add Break" context menu state
  const [breakContextMenu, setBreakContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    time: string;
    stylistId: string;
  } | null>(null);
  const [breakDialogOpen, setBreakDialogOpen] = useState(false);
  const [breakDefaults, setBreakDefaults] = useState<{ time: string; stylistId: string }>({ time: '09:00', stylistId: '' });

  const handleSlotContextMenu = (stylistId: string, time: string, e: React.MouseEvent) => {
    e.preventDefault();
    const slotDateTime = new Date(currentDate);
    const [slotH, slotM] = time.split(':').map(Number);
    slotDateTime.setHours(slotH, slotM, 0, 0);
    if (slotDateTime < new Date()) return;
    setBreakContextMenu({ open: true, x: e.clientX, y: e.clientY, time, stylistId });
  };

  // Close context menu on any click (delayed to avoid closing on the same event)
  useEffect(() => {
    if (!breakContextMenu?.open) return;
    const close = () => setBreakContextMenu(null);
    // Use a rAF to avoid the current event from immediately closing the menu
    const frameId = requestAnimationFrame(() => {
      window.addEventListener('mousedown', close);
      window.addEventListener('contextmenu', close);
      window.addEventListener('scroll', close, true);
    });
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousedown', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [breakContextMenu?.open]);


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

  const handleAppointmentClick = (apt: PhorestAppointment) => {
    setSelectedAppointment(apt);
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
    setBookingOpen(true);
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

  const handleStatusChange = (status: any, options?: { rebooked_at_checkout?: boolean; tip_amount?: number }) => {
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
  const handleCheckoutConfirm = (tipAmount: number, rebooked: boolean) => {
    handleStatusChange('completed', { 
      rebooked_at_checkout: rebooked, 
      tip_amount: tipAmount 
    });
    setCheckoutOpen(false);
    setSelectedAppointment(null);
  };
  const handleRemove = () => {
    if (selectedAppointment) {
      handleStatusChange('cancelled');
      toast.success('Appointment cancelled');
    }
  };
  const handleNotes = () => {
    if (selectedAppointment) {
      setDetailOpen(true);
    }
  };

  // ─── Calendar Content ─────────────────────────────────────────
  const calendarContent = (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
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
                onSlotContextMenu={handleSlotContextMenu}
                selectedAppointmentId={selectedAppointment?.id}
                locationHours={hoursInfo.openTime && hoursInfo.closeTime ? { open: hoursInfo.openTime, close: hoursInfo.closeTime } : null}
                isLocationClosed={hoursInfo.isClosed}
                closureReason={hoursInfo.closureReason}
                assistedAppointmentIds={assistedAppointmentIds}
                appointmentsWithAssistants={appointmentsWithAssistants}
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
              onSlotContextMenu={handleSlotContextMenu}
              selectedAppointmentId={selectedAppointment?.id}
              assistedAppointmentIds={assistedAppointmentIds}
              appointmentsWithAssistants={appointmentsWithAssistants}
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
                calendarFilters={calendarFilters}
                onCalendarFiltersChange={setCalendarFilters}
                draftCount={drafts.length}
                onOpenDrafts={() => setDraftsSheetOpen(true)}
              />
        </div>


        {/* Calendar View (with optional copilot panel) */}
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
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pointer-events-none z-20">
            <div className="pointer-events-auto">
              <ScheduleActionBar
                selectedAppointment={selectedAppointment}
                onCheckIn={handleCheckIn}
                onPay={handlePay}
                onRemove={handleRemove}
                onNotes={handleNotes}
                onConfirm={handleConfirm}
                onViewDetails={() => setDetailOpen(true)}
                isUpdating={isUpdating}
                todayAppointmentCount={todayAppointmentCount}
              />
            </div>
          </div>
        )}
      </div>

      <AppointmentDetailSheet
        appointment={selectedAppointment}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onStatusChange={(_, status) => handleStatusChange(status)}
        isUpdating={isUpdating}
      />

      <CheckoutSummarySheet
        appointment={selectedAppointment}
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        onConfirm={handleCheckoutConfirm}
        isUpdating={isUpdating}
        taxRate={effectiveTaxRate}
        businessSettings={businessSettings || null}
        locationName={selectedLocationData?.name || ''}
        locationAddress={selectedLocationData?.address}
        locationPhone={selectedLocationData?.phone}
      />

      <QuickBookingPopover
        mode="panel"
        open={bookingOpen}
        onOpenChange={(open) => {
          setBookingOpen(open);
          if (!open) setActiveDraft(null);
        }}
        date={bookingDefaults.date || currentDate}
        time={bookingDefaults.time || '09:00'}
        defaultLocationId={selectedLocation}
        defaultStylistId={bookingDefaults.stylistId}
        onBookingComplete={(bookedDate) => setCurrentDate(bookedDate)}
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
        } : undefined}
      />

      <DraftBookingsSheet
        open={draftsSheetOpen}
        onOpenChange={setDraftsSheetOpen}
        orgId={orgId}
        onResume={handleResumeDraft}
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

      {/* Right-click context menu */}
      {breakContextMenu?.open && (
        <div
          className="fixed z-50 min-w-[160px] rounded-lg border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
          style={{ top: breakContextMenu.y, left: breakContextMenu.x }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => {
              setBreakDefaults({ time: breakContextMenu.time, stylistId: breakContextMenu.stylistId });
              setBreakContextMenu(null);
              setBreakDialogOpen(true);
            }}
          >
             <Coffee className="h-4 w-4" />
             Add Break / Block
          </button>
        </div>
      )}

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
    </DashboardLayout>
  );
}
