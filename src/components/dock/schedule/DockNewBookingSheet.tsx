/**
 * DockNewBookingSheet — Mobile-first booking wizard for Dock schedule.
 * 3-step flow: Client → Service → Confirm
 * Pre-selects the logged-in staff member as stylist.
 */

import { useState, useMemo, useCallback, Fragment } from 'react';
import { formatMinutesToDuration } from '@/lib/formatDuration';
import { useDebounce } from '@/hooks/use-debounce';
import { format, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { DOCK_SHEET } from '../dock-ui-tokens';

import {
  ArrowLeft, X, Search, UserPlus, Clock, Check, Loader2, Users,
  Calendar as CalendarIcon, Scissors, User, MapPin, StickyNote, Plus,
  Sparkles, Palette, Link, Wind, Droplets, ClipboardList, Paintbrush,
  type LucideIcon,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useServicesByCategory, type PhorestService } from '@/hooks/usePhorestServices';
import { useOrgNow } from '@/hooks/useOrgNow';
import { useLocations } from '@/hooks/useLocations';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DockStaffSession } from '@/pages/Dock';
import { useDockDemo } from '@/contexts/DockDemoContext';
import { DockNewClientSheet } from './DockNewClientSheet';
import { DEMO_SERVICES, DEMO_SERVICES_BY_CATEGORY, searchDemoClients, type DemoService } from '@/hooks/dock/dockDemoData';
import { formatFirstLastInitial } from '@/lib/dock-utils';

interface DockNewBookingSheetProps {
  open: boolean;
  onClose: () => void;
  staff: DockStaffSession;
  locationId: string;
  staffFilter?: string;
}

interface PhorestClient {
  id: string;
  phorest_client_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  client_since: string | null;
}


type Step = 'client' | 'service' | 'confirm';

const SPRING = { type: 'spring' as const, damping: 28, stiffness: 320, mass: 0.8 };

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function formatTime12h(time: string) {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export function DockNewBookingSheet({ open, onClose, staff, locationId, staffFilter }: DockNewBookingSheetProps) {
  const queryClient = useQueryClient();
  const { isDemoMode, usesRealData, organizationId } = useDockDemo();

  // Drag controls for pull-to-dismiss
  const dragControls = useDragControls();
  const { nowMinutes } = useOrgNow();

  const getDefaultTime = useCallback(() => {
    const nearest = Math.ceil(nowMinutes / 15) * 15;
    return minutesToTime(nearest);
  }, [nowMinutes]);

  // Wizard state
  const [step, setStep] = useState<Step>('client');
  const [selectedClient, setSelectedClient] = useState<PhorestClient | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(locationId || '');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState(() => {
    const nearest = Math.ceil((new Date().getHours() * 60 + new Date().getMinutes()) / 15) * 15;
    return minutesToTime(nearest);
  });
  const [notes, setNotes] = useState('');
  const [selectedAssistants, setSelectedAssistants] = useState<string[]>([]);
  const [showNewClientSheet, setShowNewClientSheet] = useState(false);


  // Data — scope queries by organization
  const { data: locations = [] } = useLocations(staff.organizationId || undefined);
  const { data: servicesByCategory, services = [], isLoading: isLoadingServices } = useServicesByCategory(selectedLocation || undefined);

  // Dynamic time slots from location operating hours (15-min increments)
  const timeSlots = useMemo(() => {
    const currentLocation = locations.find(l => l.id === selectedLocation);
    const dayName = format(new Date(selectedDate + 'T12:00:00'), 'EEEE').toLowerCase() as keyof import('@/hooks/useLocations').HoursJson;
    const dayHours = currentLocation?.hours_json?.[dayName];
    const isClosed = dayHours?.closed === true;
    const openTime = isClosed ? null : (dayHours?.open || '09:00');
    const closeTime = isClosed ? null : (dayHours?.close || '18:00');

    // Generate operating-hours slots
    const opSlots: string[] = [];
    if (openTime && closeTime) {
      const startMins = timeToMinutes(openTime);
      const endMins = timeToMinutes(closeTime);
      for (let m = startMins; m <= endMins; m += 15) {
        opSlots.push(minutesToTime(m));
      }
    }

    // Only inject "Now" slot if today AND within operating hours
    const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
    const nowRounded = Math.ceil(nowMinutes / 15) * 15;
    const nowStr = minutesToTime(nowRounded);

    if (opSlots.length === 0) {
      // Closed day — only offer "now" if today
      return isToday ? [nowStr] : [];
    }

    if (isToday && !opSlots.includes(nowStr)) {
      const startMins = timeToMinutes(openTime!);
      const endMins = timeToMinutes(closeTime!);
      if (nowRounded >= startMins && nowRounded <= endMins) {
        return [nowStr, ...opSlots];
      }
    }
    return opSlots;
  }, [locations, selectedLocation, selectedDate, nowMinutes]);

  // Real data queries for org-scoped demo mode
  const { data: realServicesByCategory, isLoading: isLoadingRealServices } = useQuery({
    queryKey: ['dock-demo-real-services', organizationId],
    queryFn: async () => {
      const { data: svcData } = await supabase
        .from('v_all_services')
        .select('*')
        .order('category')
        .order('name');

      const all = (svcData || []) as PhorestService[];
      const grouped = all.reduce((acc, s) => {
        const cat = s.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(s);
        return acc;
      }, {} as Record<string, PhorestService[]>);

      return { grouped, all };
    },
    enabled: isDemoMode && usesRealData && !!organizationId,
  });

  // Demo mode overrides — use real data if available, else static mocks
  const effectiveServicesByCategory = usesRealData && realServicesByCategory
    ? realServicesByCategory.grouped
    : isDemoMode ? DEMO_SERVICES_BY_CATEGORY : servicesByCategory;
  const effectiveServices = usesRealData && realServicesByCategory
    ? realServicesByCategory.all
    : isDemoMode ? (DEMO_SERVICES as unknown as PhorestService[]) : services;
  const effectiveServicesLoading = usesRealData ? isLoadingRealServices : isLoadingServices;

  // Phorest staff mapping for this user
  const { data: staffMapping } = useQuery({
    queryKey: ['dock-staff-mapping', staff.userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('phorest_staff_mapping')
        .select('phorest_staff_id')
        .eq('user_id', staff.userId)
        .eq('is_active', true)
        .single();
      return data;
    },
    enabled: !isDemoMode,
  });

  // Team members at this location (for assistant selection) — filtered to stylist roles only
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['dock-team-members-booking', staff.organizationId, locationId],
    queryFn: async () => {
      if (!staff.organizationId || !locationId) return [];
      // Fetch stylist-role user IDs
      const { data: stylistRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['stylist', 'stylist_assistant']);
      const stylistUserIds = new Set((stylistRoles || []).map(r => r.user_id));

      const { data } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url, location_id, location_ids')
        .eq('organization_id', staff.organizationId)
        .eq('is_active', true)
        .eq('is_approved', true)
        .order('display_name', { ascending: true });
      return (data || [])
        .filter(p => p.user_id !== staff.userId) // exclude current stylist
        .filter(p => stylistUserIds.has(p.user_id)) // only stylist / assistant_stylist roles
        .filter(p => p.location_id === locationId || (p.location_ids && p.location_ids.includes(locationId)))
        .map(p => ({
          userId: p.user_id,
          name: formatFirstLastInitial(p.display_name || p.full_name || 'Unknown'),
          photoUrl: p.photo_url,
        }));
    },
    enabled: !!staff.organizationId && !!locationId,
    staleTime: 300_000,
  });

  const effectiveStylistUserId = useMemo(() => {
    if (!isDemoMode) return staff.userId;
    if (staffFilter && staffFilter !== 'all') return staffFilter;
    return teamMembers[0]?.userId ?? null;
  }, [isDemoMode, staff.userId, staffFilter, teamMembers]);

  const effectiveStylistName = useMemo(() => {
    if (!isDemoMode) return staff.displayName;
    if (staffFilter && staffFilter !== 'all') {
      return teamMembers.find((member) => member.userId === staffFilter)?.name || staff.displayName;
    }
    return teamMembers[0]?.name || 'Team Member';
  }, [isDemoMode, staff.displayName, staffFilter, teamMembers]);

  // Client search — use real DB when usesRealData
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['dock-booking-clients', clientSearch, isDemoMode, usesRealData, organizationId],
    queryFn: async () => {
      if (isDemoMode && !usesRealData) {
        return clientSearch.length >= 2
          ? searchDemoClients(clientSearch) as unknown as PhorestClient[]
          : [];
      }

      // Real query (both normal mode and usesRealData demo mode)
      let query = supabase
        .from('phorest_clients')
        .select('id, phorest_client_id, name, email, phone, client_since')
        .eq('is_duplicate', false)
        .order('name')
        .limit(30);

      if (clientSearch.length >= 2) {
        const hasDigit = /\d/.test(clientSearch);
        const hasAt = clientSearch.includes('@');
        const filters = [`name.ilike.%${clientSearch}%`];
        if (hasDigit) filters.push(`phone.ilike.%${clientSearch}%`);
        if (hasAt) filters.push(`email.ilike.%${clientSearch}%`);
        query = query.or(filters.join(','));
      }

      const { data } = await query;
      return (data || []) as PhorestClient[];
    },
    enabled: clientSearch.length >= 2,
  });

  // Computed
  const selectedServiceDetails = useMemo(
    () => effectiveServices.filter(s => selectedServices.includes(s.phorest_service_id)),
    [effectiveServices, selectedServices],
  );
  const totalDuration = selectedServiceDetails.reduce((s, v) => s + v.duration_minutes, 0);
  const totalPrice = selectedServiceDetails.reduce((s, v) => s + (v.price || 0), 0);

  // Create booking
  const createBooking = useMutation({
    mutationFn: async () => {
      if (!selectedClient) throw new Error('No client selected');

      if (isDemoMode) {
        if (usesRealData && !effectiveStylistUserId) {
          throw new Error('Select a team member before confirming the booking');
        }

        // Insert a real row flagged as demo so it surfaces in Dock schedule
        const endMinutes =
          parseInt(selectedTime.split(':')[0]) * 60 +
          parseInt(selectedTime.split(':')[1]) +
          totalDuration;
        const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
        const endM = String(endMinutes % 60).padStart(2, '0');
        const endTime = `${endH}:${endM}`;

        const { data: inserted, error } = await supabase
          .from('phorest_appointments')
          .insert({
            phorest_id: `demo-${crypto.randomUUID()}`,
            
            location_id: selectedLocation || locationId,
            client_name: selectedClient.name,
            phorest_client_id: selectedClient.phorest_client_id,
            service_name: selectedServiceDetails.map(s => s.name).join(', '),
            appointment_date: selectedDate,
            start_time: `${selectedTime}:00`,
            end_time: `${endTime}:00`,
            
            total_price: totalPrice,
            status: 'confirmed',
            notes: notes || null,
            stylist_user_id: effectiveStylistUserId,
            is_demo: true,
          })
          .select('id')
          .single();

        if (error) throw error;
        return { success: true, demo: true, appointment_id: inserted?.id };
      }

      const loc = locations.find(l => l.id === selectedLocation);
      const branchId = loc?.phorest_branch_id;
      if (!branchId) throw new Error('No branch ID for location');

      const startDateTime = `${selectedDate}T${selectedTime}:00Z`;

      const response = await supabase.functions.invoke('create-phorest-booking', {
        body: {
          branch_id: branchId,
          location_id: selectedLocation,
          client_id: selectedClient.phorest_client_id,
          staff_id: staffMapping?.phorest_staff_id,
          service_ids: selectedServices,
          start_time: startDateTime,
          notes: notes || undefined,
        },
      });

      if (response.error) throw response.error;
      if (!response.data?.success) throw new Error(response.data?.error || 'Booking failed');
      return response.data;
    },
    onSuccess: async (data) => {
      // Insert assistant assignments if any selected
      if (selectedAssistants.length > 0 && data?.appointment_id) {
        try {
          const rows = selectedAssistants.map(uid => ({
            appointment_id: data.appointment_id,
            assistant_user_id: uid,
            organization_id: staff.organizationId!,
          }));
          await supabase.from('appointment_assistants').insert(rows);
        } catch (e) {
          console.warn('[DockBooking] Failed to insert assistants:', e);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['dock-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-assistants'] });
      toast.success(isDemoMode ? 'Demo booking created' : 'Appointment booked');
      handleClose();
    },
    onError: (error: Error) => {
      toast.error('Booking failed', { description: error.message });
    },
  });

  const handleClose = () => {
    setStep('client');
    setSelectedClient(null);
    setClientSearch('');
    setSelectedServices([]);
    setSelectedAssistants([]);
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    setSelectedTime(getDefaultTime());
    setNotes('');
    setShowNewClientSheet(false);
    onClose();
  };

  const handleBack = () => {
    if (step === 'service') setStep('client');
    else if (step === 'confirm') setStep('service');
  };

  const stepTitle = step === 'client' ? 'Select Client' : step === 'service' ? 'Choose Services' : 'Confirm Booking';


  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="dock-booking-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            key="dock-booking-sheet"
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={SPRING}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.4, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y < -120 || info.velocity.y < -500) {
                try { navigator.vibrate?.(15); } catch {}
                handleClose();
              }
            }}
            className="absolute inset-x-0 top-0 z-[61] flex flex-col bg-[hsl(var(--platform-bg))] border-b border-[hsl(var(--platform-border))] rounded-b-2xl"
            style={{ maxHeight: '92%' }}
          >
            {/* Header */}
            <div className="px-7 pt-4 pb-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-base tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
                  {stepTitle}
                </h2>
                <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-[hsl(var(--platform-foreground)/0.1)] transition-colors">
                  <X className="w-5 h-5 text-[hsl(var(--platform-foreground-muted))]" />
                </button>
              </div>

              {/* Progress Tracker */}
              <div className="flex items-center gap-2">
                {(['client', 'service', 'confirm'] as const).map((s, i) => {
                  const steps = ['client', 'service', 'confirm'] as const;
                  const currentIndex = steps.indexOf(step);
                  const isCompleted = i < currentIndex;
                  const isCurrent = s === step;
                  const isFuture = i > currentIndex;
                  const label = s === 'client' ? 'Client' : s === 'service' ? 'Services' : 'Confirm';

                  return (
                    <Fragment key={s}>
                      {i > 0 && (
                        <div className={cn(
                          'flex-1 h-px',
                          isCompleted || isCurrent ? 'bg-violet-500' : 'bg-[hsl(var(--platform-foreground)/0.15)]'
                        )} />
                      )}
                      <button
                        onClick={() => isCompleted && setStep(s)}
                        disabled={isFuture}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display tracking-wide uppercase transition-all',
                          isCompleted && 'bg-violet-600 text-white cursor-pointer hover:bg-violet-500',
                          isCurrent && 'ring-2 ring-violet-500 text-[hsl(var(--platform-foreground))] bg-[hsl(var(--platform-foreground)/0.05)]',
                          isFuture && 'text-[hsl(var(--platform-foreground-muted)/0.5)] cursor-default'
                        )}
                      >
                        {isCompleted && <Check className="w-3 h-3" />}
                        {label}
                      </button>
                    </Fragment>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {step === 'client' && (
                <>
                  <ClientStepDock
                    clients={clients}
                    isLoading={isLoadingClients}
                    searchQuery={clientSearch}
                    onSearchChange={setClientSearch}
                    onSelectClient={(c) => {
                      setSelectedClient(c);
                      setStep('service');
                    }}
                    onNewClient={() => setShowNewClientSheet(true)}
                    selectedClient={selectedClient}
                    onContinue={() => setStep('service')}
                    onDeselectClient={() => {
                      setSelectedClient(null);
                      setSelectedServices([]);
                    }}
                  />
                   <DockNewClientSheet
                    open={showNewClientSheet}
                    onClose={() => setShowNewClientSheet(false)}
                    locationId={locationId}
                    organizationId={organizationId}
                    defaultName={clientSearch}
                    onClientCreated={(c) => {
                      setSelectedClient({ ...c, client_since: null });
                      setStep('service');
                      setShowNewClientSheet(false);
                    }}
                  />
                </>
              )}

              {step === 'service' && (
                <ServiceStepDock
                  servicesByCategory={effectiveServicesByCategory}
                  allServices={effectiveServices}
                  selectedServices={selectedServices}
                  onToggleService={(id) => {
                    setSelectedServices(prev =>
                      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id],
                    );
                  }}
                  totalDuration={totalDuration}
                  totalPrice={totalPrice}
                  isLoading={effectiveServicesLoading}
                  onContinue={() => setStep('confirm')}
                />
              )}

              {step === 'confirm' && (
                <ConfirmStepDock
                  client={selectedClient}
                  services={selectedServiceDetails}
                  stylistName={effectiveStylistName}
                  locationName={locations.find(l => l.id === selectedLocation)?.name || ''}
                  date={selectedDate}
                  time={selectedTime}
                  onTimeChange={setSelectedTime}
                  totalDuration={totalDuration}
                  totalPrice={totalPrice}
                  notes={notes}
                  onNotesChange={setNotes}
                  onConfirm={() => createBooking.mutate()}
                  isLoading={createBooking.isPending}
                  onAddService={() => setStep('service')}
                  teamMembers={teamMembers}
                  selectedAssistants={selectedAssistants}
                  onAssistantsChange={setSelectedAssistants}
                  timeSlots={timeSlots}
                />
              )}
            </div>

            {/* Drag handle — bottom position for top-anchored sheet */}
            <div className={DOCK_SHEET.dragHandleWrapperBottom} onPointerDown={(e) => dragControls.start(e)}>
              <div className={DOCK_SHEET.dragHandle} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Client Step ─── */
function ClientStepDock({
  clients,
  isLoading,
  searchQuery,
  onSearchChange,
  onSelectClient,
  onNewClient,
  selectedClient,
  onContinue,
  onDeselectClient,
}: {
  clients: PhorestClient[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectClient: (c: PhorestClient) => void;
  onNewClient: () => void;
  selectedClient: PhorestClient | null;
  onContinue: () => void;
  onDeselectClient: () => void;
}) {
  const isSearching = searchQuery.length >= 2;

  return (
    <div className="px-7 pb-6 flex flex-col h-full">
      {/* Selected client banner */}
      {selectedClient && (
        <div className="mb-4 p-3 rounded-xl border border-violet-500/40 bg-violet-600/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-violet-600/20 ring-2 ring-violet-500/50 flex items-center justify-center shrink-0">
            <span className="text-xs font-medium text-violet-400">{getInitials(selectedClient.name)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span className="text-sm font-medium text-[hsl(var(--platform-foreground))] truncate">{selectedClient.name}</span>
            </div>
            <div className="text-xs text-[hsl(var(--platform-foreground-muted))] truncate">
              {selectedClient.phone || selectedClient.email || 'No contact info'}
            </div>
          </div>
          <button
            onClick={onDeselectClient}
            className="w-7 h-7 shrink-0 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center hover:bg-violet-600/40 active:scale-95 transition-all"
            aria-label="Deselect client"
          >
            <X className="w-3.5 h-3.5 text-violet-400" />
          </button>
        </div>
      )}

      {/* Search + New Client row */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--platform-foreground-muted))]" />
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-[hsl(var(--platform-foreground)/0.06)] border border-[hsl(var(--platform-border))] text-sm text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-muted)/0.5)] focus:outline-none focus:border-violet-500/50"
          />
        </div>
        <button
          onClick={onNewClient}
          className="h-11 w-11 shrink-0 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center hover:bg-violet-600/30 active:scale-95 transition-all"
          title="Create new client"
        >
          <Plus className="w-5 h-5 text-violet-400" />
        </button>
      </div>

      {/* Search results */}
      {/* Scrollable results area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isSearching ? (
          isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                No clients found
              </p>
              <button
                onClick={onNewClient}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-sans bg-violet-600/15 text-violet-400 hover:bg-violet-600/25 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Create &ldquo;{searchQuery}&rdquo; as new client
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {clients.map((c) => (
                <ClientRow key={c.id} client={c} onSelect={onSelectClient} />
              ))}
            </div>
          )
        ) : !selectedClient ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--platform-foreground)/0.06)] flex items-center justify-center">
              <Search className="w-6 h-6 text-[hsl(var(--platform-foreground-muted)/0.4)]" />
            </div>
            <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
              Search for a client or create a new one
            </p>
            <button
              onClick={onNewClient}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-sans bg-violet-600/15 text-violet-400 hover:bg-violet-600/25 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              New Client
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-xs text-[hsl(var(--platform-foreground-muted)/0.6)]">
              Search above to change client, or continue
            </p>
          </div>
        )}
      </div>

      {/* Sticky Continue button */}
      {selectedClient && (
        <div className="shrink-0 pt-2">
          <div className="h-6 bg-gradient-to-t from-[hsl(var(--platform-bg))] to-transparent -mt-8 pointer-events-none" />
          <button
            onClick={onContinue}
            className="w-full h-12 rounded-full bg-[hsl(var(--platform-accent))] text-white font-sans text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Reusable client row ─── */
function ClientRow({ client, onSelect }: { client: PhorestClient; onSelect: (c: PhorestClient) => void }) {
  const { data: lastVisitDate, isLoading: isLoadingVisit } = useQuery({
    queryKey: ['dock-client-last-visit', client.phorest_client_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('phorest_appointments')
        .select('appointment_date')
        .eq('phorest_client_id', client.phorest_client_id)
        .eq('is_demo', false)
        .in('status', ['confirmed', 'completed', 'checked_in', 'arrived'])
        .order('appointment_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.appointment_date ?? null;
    },
    enabled: !!client.phorest_client_id,
    staleTime: 60_000,
  });

  const clientSinceLabel = client.client_since
    ? `Client since · ${formatDistanceToNow(new Date(client.client_since), { addSuffix: false })}`
    : null;

  const lastVisitLabel = isLoadingVisit
    ? '…'
    : lastVisitDate
      ? `Last visit · ${formatDistanceToNow(new Date(lastVisitDate), { addSuffix: true })}`
      : 'No visits on record';

  return (
    <button
      onClick={() => onSelect(client)}
      className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-[hsl(var(--platform-foreground)/0.06)] active:bg-[hsl(var(--platform-foreground)/0.1)] transition-colors"
    >
      <div className="w-10 h-10 rounded-full bg-violet-600/20 flex items-center justify-center shrink-0">
        <span className="text-xs font-medium text-violet-400">{getInitials(client.name)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[hsl(var(--platform-foreground))] truncate">{client.name}</div>
        <div className="text-xs text-[hsl(var(--platform-foreground-muted))] truncate">
          {client.phone || client.email || 'No contact info'}
        </div>
        <div className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.7)] truncate mt-0.5">
          {clientSinceLabel ? `${clientSinceLabel} · ${lastVisitLabel}` : lastVisitLabel}
        </div>
      </div>
    </button>
  );
}

/* ─── Service Step ─── */
function ServiceStepDock({
  servicesByCategory,
  allServices,
  selectedServices,
  onToggleService,
  totalDuration,
  totalPrice,
  isLoading,
  onContinue,
}: {
  servicesByCategory: Record<string, PhorestService[]> | undefined;
  allServices: PhorestService[];
  selectedServices: string[];
  onToggleService: (id: string) => void;
  totalDuration: number;
  totalPrice: number;
  isLoading: boolean;
  onContinue: () => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 200);

  // Deduplicate services per category by name (keep longest duration)
  const dedupedByCategory = useMemo(() => {
    if (!servicesByCategory) return {};
    const result: Record<string, PhorestService[]> = {};
    for (const [cat, svcs] of Object.entries(servicesByCategory)) {
      const nameMap = new Map<string, PhorestService>();
      for (const s of svcs) {
        const existing = nameMap.get(s.name);
        if (!existing || s.duration_minutes > existing.duration_minutes) {
          nameMap.set(s.name, s);
        }
      }
      result[cat] = Array.from(nameMap.values());
    }
    return result;
  }, [servicesByCategory]);

  const categories = Object.entries(dedupedByCategory);
  const hasServices = categories.length > 0;

  // Selected service details for chip display
  const selectedDetails = useMemo(
    () => allServices.filter(s => selectedServices.includes(s.phorest_service_id)),
    [allServices, selectedServices],
  );

  // Filtered services for Level 2
  const filteredServices = useMemo(() => {
    if (!selectedCategory) return [];
    const svcs = dedupedByCategory[selectedCategory] || [];
    if (!debouncedSearch) return svcs;
    const q = debouncedSearch.toLowerCase();
    return svcs.filter(s => s.name.toLowerCase().includes(q));
  }, [selectedCategory, dedupedByCategory, debouncedSearch]);

  // Category icon map — Lucide icons, no emojis
  const getCategoryIcon = (cat: string): LucideIcon => {
    if (/blond|highlight|foil|balayage/i.test(cat)) return Sparkles;
    if (/vivid|fashion/i.test(cat)) return Paintbrush;
    if (/color/i.test(cat)) return Palette;
    if (/cut|haircut/i.test(cat)) return Scissors;
    if (/extension/i.test(cat)) return Link;
    if (/style|blowout|updo/i.test(cat)) return Wind;
    if (/extra|treatment/i.test(cat)) return Droplets;
    if (/consult/i.test(cat)) return ClipboardList;
    return Scissors;
  };

  const drillDownSpring = { type: 'spring' as const, damping: 26, stiffness: 300, mass: 0.8 };

  return (
    <div className="flex flex-col">
      <div className="px-7 pb-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
          </div>
        ) : !hasServices ? (
          <p className="text-center text-sm text-[hsl(var(--platform-foreground-muted))] py-8">
            No services available
          </p>
        ) : (
          <AnimatePresence mode="wait">
            {selectedCategory === null ? (
              /* ── Level 1: Category Grid ── */
              <motion.div
                key="category-grid"
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -40, opacity: 0 }}
                transition={drillDownSpring}
              >
                <div className="grid grid-cols-2 gap-3">
                  {categories.map(([cat, svcs]) => {
                    const selectedInCat = svcs.filter(s => selectedServices.includes(s.phorest_service_id)).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className="relative flex flex-row items-center gap-3 p-4 rounded-xl bg-[hsl(var(--platform-foreground)/0.04)] border border-[hsl(var(--platform-border)/0.5)] hover:bg-[hsl(var(--platform-foreground)/0.08)] active:scale-[0.97] transition-all text-left"
                      >
                        {(() => { const Icon = getCategoryIcon(cat); return (
                          <div className="w-8 h-8 rounded-lg bg-violet-600/10 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-violet-400" />
                          </div>
                        ); })()}
                        <div>
                          <div className="text-sm font-medium text-[hsl(var(--platform-foreground))]">{cat}</div>
                          <div className="text-xs text-[hsl(var(--platform-foreground-muted))]">
                            {svcs.length} service{svcs.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        {selectedInCat > 0 && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
                            <span className="text-[10px] text-white font-medium">{selectedInCat}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              /* ── Level 2: Service List for Selected Category ── */
              <motion.div
                key={`service-list-${selectedCategory}`}
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 40, opacity: 0 }}
                transition={drillDownSpring}
              >
                <button
                  onClick={() => { setSelectedCategory(null); setSearchQuery(''); }}
                  className="flex items-center gap-2 mb-4 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="font-sans">All Categories</span>
                </button>
                <div className="flex items-center gap-2.5 mb-3 px-1">
                  {(() => { const Icon = getCategoryIcon(selectedCategory); return (
                    <div className="w-8 h-8 rounded-lg bg-violet-600/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-violet-400" />
                    </div>
                  ); })()}
                  <h3 className="font-display text-sm tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
                    {selectedCategory}
                  </h3>
                </div>

                {/* Search within category */}
                {(dedupedByCategory[selectedCategory]?.length || 0) > 6 && (
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--platform-foreground-muted))]" />
                    <input
                      type="text"
                      placeholder="Filter services…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-9 pl-9 pr-4 rounded-lg bg-[hsl(var(--platform-foreground)/0.06)] border border-[hsl(var(--platform-border)/0.5)] text-sm text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-muted)/0.5)] focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  {filteredServices.length === 0 ? (
                    <p className="text-center text-xs text-[hsl(var(--platform-foreground-muted))] py-6">
                      No matching services
                    </p>
                  ) : filteredServices.map((s) => {
                    const isSelected = selectedServices.includes(s.phorest_service_id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => onToggleService(s.phorest_service_id)}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-lg text-left transition-all',
                          isSelected
                            ? 'bg-violet-600/15 ring-1 ring-violet-500/30'
                            : 'hover:bg-[hsl(var(--platform-foreground)/0.06)]',
                        )}
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="text-sm text-[hsl(var(--platform-foreground))] truncate">{s.name}</div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1 text-xs text-[hsl(var(--platform-foreground-muted))]">
                              <Clock className="w-3 h-3" />
                              {formatMinutesToDuration(s.duration_minutes)}
                            </span>
                            {s.price !== null && (
                              <span className="text-xs text-[hsl(var(--platform-foreground-muted))]">
                                ${s.price}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                          isSelected
                            ? 'bg-violet-600 border-violet-600 text-white'
                            : 'border-[hsl(var(--platform-foreground-muted)/0.3)]',
                        )}>
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Footer with chip summary */}
      <div className="sticky bottom-0 px-7 py-4 border-t border-[hsl(var(--platform-border))] bg-[hsl(var(--platform-bg))]">
        {selectedDetails.length > 0 && (
          <>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedDetails.map((s) => (
                <span
                  key={s.phorest_service_id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-sans bg-violet-600/15 text-violet-300 border border-violet-500/20"
                >
                  {s.name}
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleService(s.phorest_service_id); }}
                    className="ml-0.5 hover:text-violet-100 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-[hsl(var(--platform-foreground-muted))]">
                {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} · {formatMinutesToDuration(totalDuration)}
              </span>
              <span className="text-[hsl(var(--platform-foreground))] font-medium">${totalPrice}</span>
            </div>
          </>
        )}
        {selectedServices.length > 0 && (
          <button
            onClick={() => setSelectedCategory(null)}
            className="w-full h-10 rounded-full border border-dashed border-[hsl(var(--platform-accent))]/40 text-[hsl(var(--platform-accent))] font-sans text-sm font-medium hover:bg-[hsl(var(--platform-accent))]/10 active:scale-[0.98] transition-all mb-3"
          >
            + Add Another Service
          </button>
        )}
        <button
          onClick={onContinue}
          disabled={selectedServices.length === 0}
          className="w-full h-12 rounded-full bg-violet-600 text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-violet-500 active:scale-[0.98] transition-all"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

/* ─── Confirm Step ─── */
function ConfirmStepDock({
  client,
  services,
  stylistName,
  locationName,
  date,
  time,
  onTimeChange,
  totalDuration,
  totalPrice,
  notes,
  onNotesChange,
  onConfirm,
  isLoading,
  onAddService,
  teamMembers,
  selectedAssistants,
  onAssistantsChange,
  timeSlots,
}: {
  client: PhorestClient | null;
  services: PhorestService[];
  stylistName: string;
  locationName: string;
  date: string;
  time: string;
  onTimeChange: (t: string) => void;
  totalDuration: number;
  totalPrice: number;
  notes: string;
  onNotesChange: (n: string) => void;
  onConfirm: () => void;
  isLoading: boolean;
  onAddService: () => void;
  teamMembers: { userId: string; name: string; photoUrl: string | null }[];
  selectedAssistants: string[];
  onAssistantsChange: (ids: string[]) => void;
  timeSlots: string[];
}) {
  const [showAssistantPicker, setShowAssistantPicker] = useState(false);
  const selectedNames = teamMembers.filter(m => selectedAssistants.includes(m.userId)).map(m => m.name);

  // Client last-visit quick-view query
  const { data: clientHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['dock-client-quick-view', client?.phorest_client_id],
    queryFn: async () => {
      if (!client?.phorest_client_id) return null;

      // Fetch last visit with stylist + location
      const { data: lastVisitData } = await supabase
        .from('phorest_appointments')
        .select(`
          appointment_date, service_name,
          phorest_staff_mapping!phorest_appointments_phorest_staff_id_fkey(
            employee_profiles!phorest_staff_mapping_user_id_fkey(display_name, full_name)
          ),
          locations!phorest_appointments_location_id_fkey(name)
        `)
        .eq('phorest_client_id', client.phorest_client_id)
        .eq('is_demo', false)
        .in('status', ['confirmed', 'completed', 'checked_in', 'arrived'])
        .order('appointment_date', { ascending: false })
        .limit(1);

      // Count total visits
      const { count } = await supabase
        .from('phorest_appointments')
        .select('id', { count: 'exact', head: true })
        .eq('phorest_client_id', client.phorest_client_id)
        .eq('is_demo', false)
        .in('status', ['confirmed', 'completed', 'checked_in', 'arrived']);

      const last = lastVisitData?.[0] as any;
      if (!last) return { visitCount: 0, lastVisit: null };

      return {
        visitCount: count || 0,
        lastVisit: {
          date: last.appointment_date,
          service: last.service_name,
          stylist: last.phorest_staff_mapping?.employee_profiles?.display_name
            || last.phorest_staff_mapping?.employee_profiles?.full_name
            || null,
          location: last.locations?.name || null,
        },
      };
    },
    enabled: !!client?.phorest_client_id,
    staleTime: 60_000,
  });

  return (
    <div className="flex flex-col">
      <div className="px-7 pb-4 space-y-4">
        {/* Client */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--platform-foreground)/0.04)]">
          <div className="w-10 h-10 rounded-full bg-violet-600/20 flex items-center justify-center">
            <User className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[hsl(var(--platform-foreground))]">{client?.name}</div>
            <div className="text-xs text-[hsl(var(--platform-foreground-muted))]">
              {client?.phone || client?.email || ''}
            </div>
          </div>
          {clientHistory && clientHistory.visitCount === 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 shrink-0">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-400 whitespace-nowrap">New client — first visit</span>
            </div>
          )}
        </div>

        {/* Client Quick-View */}
        {isLoadingHistory ? (
          <div className="h-10 rounded-lg bg-[hsl(var(--platform-foreground)/0.04)] animate-pulse" />
        ) : clientHistory?.lastVisit ? (
          <div className="rounded-xl bg-[hsl(var(--platform-foreground)/0.04)] border border-[hsl(var(--platform-border))] px-3.5 py-2.5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--platform-foreground))]">
              <CalendarIcon className="w-3 h-3 text-violet-400 shrink-0" />
              <span>
                Last visit: {format(new Date(clientHistory.lastVisit.date + 'T12:00:00'), 'MMM d')}
                {' · '}
                <span className="text-[hsl(var(--platform-foreground-muted))]">
                  {formatDistanceToNow(new Date(clientHistory.lastVisit.date + 'T12:00:00'), { addSuffix: true })}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--platform-foreground-muted))]">
              <Scissors className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {clientHistory.lastVisit.service || 'Unknown service'}
                {clientHistory.lastVisit.stylist && ` · with ${clientHistory.lastVisit.stylist}`}
                {clientHistory.lastVisit.location && ` at ${clientHistory.lastVisit.location}`}
              </span>
            </div>
            <div className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.6)]">
              {clientHistory.visitCount} visit{clientHistory.visitCount !== 1 ? 's' : ''} total
            </div>
          </div>
        ) : null}

        {/* Details */}
        <div className="rounded-xl border border-[hsl(var(--platform-border))] divide-y divide-[hsl(var(--platform-border))]">
          <DetailRow icon={<MapPin className="w-4 h-4" />} label="Location" value={locationName} />
          <DetailRow icon={<User className="w-4 h-4" />} label="Stylist" value={stylistName} />
          {/* Assistant row */}
          {teamMembers.length > 0 && (
            <div className="divide-y divide-[hsl(var(--platform-border))]">
              <button
                type="button"
                onClick={() => setShowAssistantPicker(!showAssistantPicker)}
                className="w-full px-3 py-2.5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[hsl(var(--platform-foreground)/0.08)] flex items-center justify-center">
                    <Users className="w-4 h-4 text-[hsl(var(--platform-foreground-muted))]" />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.6)]">Assistant</div>
                    {selectedNames.length > 0 ? (
                      <div className="text-sm text-[hsl(var(--platform-foreground))]">{selectedNames.join(', ')}</div>
                    ) : (
                      <div className="text-sm text-violet-400">+ Add an assistant</div>
                    )}
                  </div>
                </div>
              </button>
              {showAssistantPicker && (
                <div className="px-3 py-2.5 flex flex-wrap gap-1.5">
                  {teamMembers.map(m => {
                    const isSelected = selectedAssistants.includes(m.userId);
                    return (
                      <button
                        key={m.userId}
                        onClick={() => {
                          onAssistantsChange(
                            isSelected
                              ? selectedAssistants.filter(id => id !== m.userId)
                              : [...selectedAssistants, m.userId]
                          );
                        }}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[11px] transition-colors flex items-center gap-1',
                          isSelected
                            ? 'bg-violet-600 text-white'
                            : 'bg-[hsl(var(--platform-foreground)/0.06)] text-[hsl(var(--platform-foreground-muted))] hover:bg-[hsl(var(--platform-foreground)/0.1)]',
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <DetailRow icon={<CalendarIcon className="w-4 h-4" />} label="Date" value={format(new Date(date + 'T12:00:00'), 'EEE, MMM d')} />
          <DetailRow icon={<Clock className="w-4 h-4" />} label="Duration" value={formatMinutesToDuration(totalDuration)} />
        </div>

        {/* Time selector */}
        <div>
          <div className="text-[10px] font-display tracking-wider uppercase text-[hsl(var(--platform-foreground-muted)/0.6)] mb-2">
            Time
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(() => {
              const slots = timeSlots.includes(time) ? timeSlots : [...timeSlots, time].sort();
              const isToday = date === format(new Date(), 'yyyy-MM-dd');
              const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
              const nowRoundedStr = minutesToTime(Math.ceil(nowMins / 15) * 15);
              return slots.map(t => {
                const isNowSlot = isToday && t === nowRoundedStr;
                return (
                <button
                  key={t}
                  onClick={() => onTimeChange(t)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs transition-colors',
                    time === t
                      ? 'bg-violet-600 text-white'
                      : 'bg-[hsl(var(--platform-foreground)/0.06)] text-[hsl(var(--platform-foreground-muted))] hover:bg-[hsl(var(--platform-foreground)/0.1)]',
                  )}
                >
                  {isNowSlot ? `Now · ${formatTime12h(t)}` : formatTime12h(t)}
                </button>
                );
              });
            })()}
          </div>
        </div>

        {/* Services */}
        <div>
          <div className="text-[10px] font-display tracking-wider uppercase text-[hsl(var(--platform-foreground-muted)/0.6)] mb-2">
            Services
          </div>
          <div className="space-y-1">
            {services.map(s => (
              <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[hsl(var(--platform-foreground)/0.04)]">
                <div className="flex items-center gap-2">
                  <Scissors className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-sm text-[hsl(var(--platform-foreground))]">{s.name}</span>
                </div>
                <span className="text-xs text-[hsl(var(--platform-foreground-muted))]">
                  {formatMinutesToDuration(s.duration_minutes)} · ${s.price || 0}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onAddService}
            className="w-full flex items-center justify-center gap-2 py-2.5 mt-2 border border-dashed border-[hsl(var(--platform-border))] rounded-xl text-xs font-sans font-medium text-violet-400 hover:bg-[hsl(var(--platform-foreground)/0.04)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Another Service
          </button>
        </div>

        {/* Notes */}
        <div>
          <div className="text-[10px] font-display tracking-wider uppercase text-[hsl(var(--platform-foreground-muted)/0.6)] mb-2">
            Notes (optional)
          </div>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Special requests..."
            rows={2}
            className="w-full rounded-xl bg-[hsl(var(--platform-foreground)/0.06)] border border-[hsl(var(--platform-border))] text-sm text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-muted)/0.4)] p-3 resize-none focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 px-7 py-4 border-t border-[hsl(var(--platform-border))] bg-[hsl(var(--platform-bg))]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-[hsl(var(--platform-foreground-muted))]">Estimated Total</span>
          <span className="text-lg font-medium text-[hsl(var(--platform-foreground))]">${totalPrice}</span>
        </div>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full h-12 rounded-full bg-violet-600 text-white font-medium text-sm disabled:opacity-60 hover:bg-violet-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Booking...
            </>
          ) : (
            'Confirm Booking'
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── Detail Row ─── */
function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="w-8 h-8 rounded-lg bg-[hsl(var(--platform-foreground)/0.06)] flex items-center justify-center text-[hsl(var(--platform-foreground-muted))]">
        {icon}
      </div>
      <div>
        <div className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.6)]">{label}</div>
        <div className="text-sm text-[hsl(var(--platform-foreground))]">{value}</div>
      </div>
    </div>
  );
}
