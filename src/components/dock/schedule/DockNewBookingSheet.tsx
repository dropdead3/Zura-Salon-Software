/**
 * DockNewBookingSheet — Mobile-first booking wizard for Dock schedule.
 * 3-step flow: Client → Service → Confirm
 * Pre-selects the logged-in staff member as stylist.
 */

import { useState, useMemo } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { format } from 'date-fns';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';

import {
  ArrowLeft, X, Search, UserPlus, Clock, Check, Loader2,
  Calendar as CalendarIcon, Scissors, User, MapPin, StickyNote, Plus,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useServicesByCategory, type PhorestService } from '@/hooks/usePhorestServices';
import { useLocations } from '@/hooks/useLocations';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DockStaffSession } from '@/pages/Dock';
import { useDockDemo } from '@/contexts/DockDemoContext';
import { DockNewClientSheet } from './DockNewClientSheet';
import { DEMO_SERVICES, DEMO_SERVICES_BY_CATEGORY, searchDemoClients, type DemoService } from '@/hooks/dock/dockDemoData';

interface DockNewBookingSheetProps {
  open: boolean;
  onClose: () => void;
  staff: DockStaffSession;
  locationId: string;
}

interface PhorestClient {
  id: string;
  phorest_client_id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface RecentCheckIn {
  clientId: string;
  phorestClientId: string;
  name: string;
  email: string | null;
  phone: string | null;
  checkedInAt: string;
  method: string;
}

type Step = 'client' | 'service' | 'confirm';

const SPRING = { type: 'spring' as const, damping: 28, stiffness: 320, mass: 0.8 };

const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const hour = 8 + Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}).filter(t => parseInt(t.split(':')[0]) < 20);

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

export function DockNewBookingSheet({ open, onClose, staff, locationId }: DockNewBookingSheetProps) {
  const queryClient = useQueryClient();
  const { isDemoMode, usesRealData, organizationId } = useDockDemo();

  // Drag controls for pull-to-dismiss
  const dragControls = useDragControls();

  // Wizard state
  const [step, setStep] = useState<Step>('client');
  const [selectedClient, setSelectedClient] = useState<PhorestClient | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(locationId || '');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  const [showNewClientSheet, setShowNewClientSheet] = useState(false);

  // Recent check-ins for today at this location
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data: recentCheckIns = [], isLoading: isLoadingCheckIns } = useQuery({
    queryKey: ['dock-recent-checkins', locationId, todayStr, organizationId],
    queryFn: async () => {
      // Query appointment_check_ins joined with phorest_clients
      const startOfDay = `${todayStr}T00:00:00Z`;
      const { data: checkIns } = await supabase
        .from('appointment_check_ins')
        .select('phorest_client_id, client_id, checked_in_at, check_in_method')
        .eq('location_id', locationId)
        .gte('checked_in_at', startOfDay)
        .order('checked_in_at', { ascending: false })
        .limit(30);

      if (!checkIns || checkIns.length === 0) return [] as RecentCheckIn[];

      // Collect unique phorest_client_ids and client_ids
      const phorestIds = [...new Set(checkIns.map(c => c.phorest_client_id).filter(Boolean))] as string[];
      const clientIds = [...new Set(checkIns.map(c => c.client_id).filter(Boolean))] as string[];

      // Fetch phorest client names
      const phorestMap = new Map<string, { id: string; name: string; email: string | null; phone: string | null }>();
      if (phorestIds.length > 0) {
        const { data: pClients } = await supabase
          .from('phorest_clients')
          .select('id, phorest_client_id, name, email, phone')
          .in('phorest_client_id', phorestIds);
        (pClients || []).forEach(pc => phorestMap.set(pc.phorest_client_id, { id: pc.id, name: pc.name, email: pc.email, phone: pc.phone }));
      }

      // Fetch local client names as fallback
      const clientMap = new Map<string, { id: string; name: string; email: string | null; phone: string | null }>();
      if (clientIds.length > 0) {
        const { data: lClients } = await supabase
          .from('clients')
          .select('id, first_name, last_name, email, mobile')
          .in('id', clientIds);
        (lClients || []).forEach(lc => clientMap.set(lc.id, { id: lc.id, name: `${lc.first_name} ${lc.last_name}`.trim(), email: lc.email, phone: lc.mobile }));
      }

      // Deduplicate by phorest_client_id or client_id, keep most recent
      const seen = new Set<string>();
      const results: RecentCheckIn[] = [];
      for (const ci of checkIns) {
        const key = ci.phorest_client_id || ci.client_id || '';
        if (!key || seen.has(key)) continue;
        seen.add(key);

        const pClient = ci.phorest_client_id ? phorestMap.get(ci.phorest_client_id) : null;
        const lClient = ci.client_id ? clientMap.get(ci.client_id) : null;
        const resolved = pClient || lClient;
        if (!resolved) continue;

        results.push({
          clientId: resolved.id,
          phorestClientId: ci.phorest_client_id || '',
          name: resolved.name,
          email: resolved.email,
          phone: resolved.phone,
          checkedInAt: ci.checked_in_at,
          method: ci.check_in_method as 'kiosk' | 'front_desk' | 'manual' | string,
        });
      }
      return results;
    },
    enabled: !!locationId,
    staleTime: 30_000,
    refetchInterval: 60_000, // Auto-refresh every minute
  });

  // Data — scope queries by organization
  const { data: locations = [] } = useLocations(staff.organizationId || undefined);
  const { data: servicesByCategory, services = [], isLoading: isLoadingServices } = useServicesByCategory(selectedLocation || undefined);

  // Real data queries for org-scoped demo mode
  const { data: realServicesByCategory, isLoading: isLoadingRealServices } = useQuery({
    queryKey: ['dock-demo-real-services', organizationId],
    queryFn: async () => {
      // Get locations for this org
      const { data: orgLocations } = await supabase
        .from('locations')
        .select('phorest_branch_id')
        .eq('organization_id', organizationId);
      const branchIds = (orgLocations || []).map(l => l.phorest_branch_id).filter(Boolean) as string[];
      if (branchIds.length === 0) return { grouped: {} as Record<string, PhorestService[]>, all: [] as PhorestService[] };

      const { data: svcData } = await supabase
        .from('phorest_services')
        .select('*')
        .eq('is_active', true)
        .in('phorest_branch_id', branchIds)
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
        .select('id, phorest_client_id, name, email, phone')
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
        // Simulate booking in demo mode
        await new Promise(resolve => setTimeout(resolve, 800));
        return { success: true, demo: true };
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dock-appointments'] });
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
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    setSelectedTime('09:00');
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
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) {
                handleClose();
              }
            }}
            className="absolute inset-x-0 bottom-0 z-[61] flex flex-col bg-[hsl(var(--platform-bg))] border-t border-[hsl(var(--platform-border))] rounded-t-2xl"
            style={{ maxHeight: '92%' }}
          >
            {/* Drag handle */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-[hsl(var(--platform-foreground-muted)/0.3)] shrink-0 cursor-grab active:cursor-grabbing touch-none"
            />

            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-4 pb-3">
              {step !== 'client' ? (
                <button onClick={handleBack} className="p-1.5 -ml-1.5 rounded-full hover:bg-[hsl(var(--platform-foreground)/0.1)] transition-colors">
                  <ArrowLeft className="w-5 h-5 text-[hsl(var(--platform-foreground))]" />
                </button>
              ) : null}
              <h2 className="font-display text-base tracking-wide uppercase text-[hsl(var(--platform-foreground))] flex-1">
                {stepTitle}
              </h2>
              <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-[hsl(var(--platform-foreground)/0.1)] transition-colors">
                <X className="w-5 h-5 text-[hsl(var(--platform-foreground-muted))]" />
              </button>
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
                    recentCheckIns={recentCheckIns}
                    isLoadingCheckIns={isLoadingCheckIns}
                  />
                  <DockNewClientSheet
                    open={showNewClientSheet}
                    onClose={() => setShowNewClientSheet(false)}
                    locationId={locationId}
                    organizationId={organizationId}
                    onClientCreated={(c) => {
                      setSelectedClient(c);
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
                  stylistName={staff.displayName}
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
                />
              )}
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
  recentCheckIns,
  isLoadingCheckIns,
}: {
  clients: PhorestClient[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectClient: (c: PhorestClient) => void;
  onNewClient: () => void;
  recentCheckIns: RecentCheckIn[];
  isLoadingCheckIns: boolean;
}) {
  const isSearching = searchQuery.length >= 2;

  const handleSelectCheckIn = (ci: RecentCheckIn) => {
    onSelectClient({
      id: ci.clientId,
      phorest_client_id: ci.phorestClientId,
      name: ci.name,
      email: ci.email,
      phone: ci.phone,
    });
  };

  const getMethodLabel = (method: string) => {
    if (method === 'kiosk') return 'Kiosk';
    if (method === 'front_desk' || method === 'manual') return 'Front Desk';
    return method;
  };

  const getMethodClasses = (method: string) => {
    if (method === 'kiosk') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25';
    return 'bg-blue-500/15 text-blue-400 border-blue-500/25';
  };

  return (
    <div className="px-5 pb-6">
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

      {/* Search results overlay */}
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
      ) : (
        /* Default view: Recent Check-Ins */
        <>
          {isLoadingCheckIns ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            </div>
          ) : recentCheckIns.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-sans text-[hsl(var(--platform-foreground-muted))] uppercase tracking-wide">
                  Today&apos;s Check-Ins
                </span>
              </div>
              <div className="space-y-1 mb-4">
                {recentCheckIns.map((ci) => (
                  <button
                    key={ci.clientId}
                    onClick={() => handleSelectCheckIn(ci)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-[hsl(var(--platform-foreground)/0.06)] active:bg-[hsl(var(--platform-foreground)/0.1)] transition-colors"
                  >
                    <div className="relative w-10 h-10 rounded-full bg-emerald-600/15 flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-emerald-400">{getInitials(ci.name)}</span>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[hsl(var(--platform-bg))]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[hsl(var(--platform-foreground))] truncate">{ci.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[hsl(var(--platform-foreground-muted))]">
                          {formatDistanceToNowStrict(new Date(ci.checkedInAt), { addSuffix: true })}
                        </span>
                        <span className={cn(
                          'inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border',
                          getMethodClasses(ci.method),
                        )}>
                          {getMethodLabel(ci.method)}
                        </span>
                      </div>
                    </div>
                    <Check className="w-4 h-4 text-[hsl(var(--platform-foreground-muted)/0.3)] shrink-0" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                No check-ins yet today
              </p>
            </div>
          )}

          {/* Bottom prompt */}
          <div className="pt-2 border-t border-[hsl(var(--platform-border)/0.3)]">
            <button
              onClick={onNewClient}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-sans text-[hsl(var(--platform-foreground-muted))] hover:text-violet-400 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Don&apos;t see them? Create new client
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Reusable client row ─── */
function ClientRow({ client, onSelect }: { client: PhorestClient; onSelect: (c: PhorestClient) => void }) {
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

  // Category icon map
  const getCategoryIcon = (cat: string) => {
    if (/blond|highlight|foil|balayage/i.test(cat)) return '✨';
    if (/color/i.test(cat)) return '🎨';
    if (/cut|haircut/i.test(cat)) return '✂️';
    if (/extension/i.test(cat)) return '💇‍♀️';
    if (/style|blowout|updo/i.test(cat)) return '💫';
    if (/extra|treatment/i.test(cat)) return '🧴';
    if (/consult/i.test(cat)) return '📋';
    return '💈';
  };

  const drillDownSpring = { type: 'spring' as const, damping: 26, stiffness: 300, mass: 0.8 };

  return (
    <div className="flex flex-col">
      <div className="px-5 pb-4">
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
                        className="relative flex flex-col items-start gap-2 p-4 rounded-xl bg-[hsl(var(--platform-foreground)/0.04)] border border-[hsl(var(--platform-border)/0.5)] hover:bg-[hsl(var(--platform-foreground)/0.08)] active:scale-[0.97] transition-all text-left"
                      >
                        <span className="text-xl">{getCategoryIcon(cat)}</span>
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
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-lg">{getCategoryIcon(selectedCategory)}</span>
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
                          'w-full flex items-center justify-between p-3 rounded-xl text-left transition-all',
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
                              {s.duration_minutes}m
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
      <div className="sticky bottom-0 px-5 py-4 border-t border-[hsl(var(--platform-border))] bg-[hsl(var(--platform-bg))]">
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
                {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} · {totalDuration}m
              </span>
              <span className="text-[hsl(var(--platform-foreground))] font-medium">${totalPrice}</span>
            </div>
          </>
        )}
        <button
          onClick={onContinue}
          disabled={selectedServices.length === 0}
          className="w-full h-12 rounded-xl bg-violet-600 text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-violet-500 active:scale-[0.98] transition-all"
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
}) {
  return (
    <div className="flex flex-col">
      <div className="px-5 pb-4 space-y-4">
        {/* Client */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--platform-foreground)/0.04)]">
          <div className="w-10 h-10 rounded-full bg-violet-600/20 flex items-center justify-center">
            <User className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-[hsl(var(--platform-foreground))]">{client?.name}</div>
            <div className="text-xs text-[hsl(var(--platform-foreground-muted))]">
              {client?.phone || client?.email || ''}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-xl border border-[hsl(var(--platform-border))] divide-y divide-[hsl(var(--platform-border))]">
          <DetailRow icon={<MapPin className="w-4 h-4" />} label="Location" value={locationName} />
          <DetailRow icon={<User className="w-4 h-4" />} label="Stylist" value={stylistName} />
          <DetailRow icon={<CalendarIcon className="w-4 h-4" />} label="Date" value={format(new Date(date + 'T12:00:00'), 'EEE, MMM d')} />
          <DetailRow icon={<Clock className="w-4 h-4" />} label="Duration" value={`${totalDuration}m`} />
        </div>

        {/* Time selector */}
        <div>
          <div className="text-[10px] font-display tracking-wider uppercase text-[hsl(var(--platform-foreground-muted)/0.6)] mb-2">
            Time
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TIME_SLOTS.map(t => (
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
                {formatTime12h(t)}
              </button>
            ))}
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
                  {s.duration_minutes}m · ${s.price || 0}
                </span>
              </div>
            ))}
          </div>
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
      <div className="sticky bottom-0 px-5 py-4 border-t border-[hsl(var(--platform-border))] bg-[hsl(var(--platform-bg))]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-[hsl(var(--platform-foreground-muted))]">Estimated Total</span>
          <span className="text-lg font-medium text-[hsl(var(--platform-foreground))]">${totalPrice}</span>
        </div>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full h-12 rounded-xl bg-violet-600 text-white font-medium text-sm disabled:opacity-60 hover:bg-violet-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
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
