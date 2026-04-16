import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import {
  Search, 
  Clock, 
  DollarSign,
  Check,
  Coffee,
  Loader2,
  UserPlus,
  X,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Scissors,
  Info,
  User,
  Sparkles,
  Users,
  FileText,
} from 'lucide-react';
import { cn, formatDisplayName } from '@/lib/utils';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAllServicesByCategory } from '@/hooks/usePhorestServices';
import { useLocations } from '@/hooks/useLocations';
import { NewClientDialog } from './NewClientDialog';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useAuth } from '@/contexts/AuthContext';
import { useServiceCategoryColorsMap } from '@/hooks/useServiceCategoryColors';
import { getCategoryColor, isGradientMarker, getGradientFromMarker } from '@/utils/categoryColors';
import { getLevelSlug, getLevelNumber } from '@/utils/levelPricing';
import { useBookingLevelPricing } from '@/hooks/useServiceLevelPricing';
import { useQualifiedStaffForServices } from '@/hooks/useStaffServiceQualifications';
import { useStaffQualifiedServices } from '@/hooks/useStaffServiceQualifications';
import { BannedClientBadge } from '@/components/dashboard/clients/BannedClientBadge';
import { AddTimeBlockForm } from './AddTimeBlockForm';
import { BannedClientWarningDialog } from '@/components/dashboard/clients/BannedClientWarningDialog';
import { ServiceAddonToast } from './ServiceAddonToast';
import { useAddonAssignmentMaps } from '@/hooks/useServiceAddonAssignments';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useEstimatedProductCharge } from '@/hooks/color-bar/useEstimatedProductCharge';
import { useAssistantsAtLocation } from '@/hooks/useAssistantAvailability';
import { AssistantAvailabilityNote } from './AssistantAvailabilityNote';
import { useSaveDraft, useDeleteDraft } from '@/hooks/useDraftBookings';
import { useServiceCategoryColors } from '@/hooks/useServiceCategoryColors';
import { useServiceAddons } from '@/hooks/useServiceAddons';
import type { ServiceAddon } from '@/hooks/useServiceAddons';
import { useRedoPolicySettings, REDO_REASONS } from '@/hooks/useRedoPolicySettings';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, AlertCircle } from 'lucide-react';

type QuickBookingMode = 'popover' | 'panel';

interface QuickBookingPopoverProps {
  date: Date;
  time: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
  defaultLocationId?: string;
  mode?: QuickBookingMode;
  defaultStylistId?: string;
  draftId?: string;
  onBookingComplete?: (date: Date) => void;
  initialDraftData?: {
    locationId?: string;
    clientId?: string | null;
    clientName?: string | null;
    staffUserId?: string | null;
    staffName?: string | null;
    selectedServices?: string[];
    notes?: string;
    stepReached?: string;
    isRedo?: boolean;
    redoMetadata?: Record<string, unknown> | null;
  };
}

import { ClientProfileView, ExtendedPhorestClient } from './booking/ClientProfileView';

interface PhorestClient {
  id: string;
  phorest_client_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  preferred_stylist_id: string | null;
  visit_count?: number;
  last_visit?: string | null;
  total_spend?: number | null;
  is_vip?: boolean;
  branch_name?: string | null;
  is_banned?: boolean;
  ban_reason?: string | null;
}

type Step = 'service' | 'location' | 'client' | 'stylist' | 'confirm';

const STEPS: Step[] = ['service', 'location', 'client', 'stylist', 'confirm'];

const ADDONS_CATEGORY = '__addons__';

// Sort categories with consultation first
const sortCategories = (categories: string[]): string[] => {
  return [...categories].sort((a, b) => {
    const aIsConsult = a.toLowerCase().includes('consult');
    const bIsConsult = b.toLowerCase().includes('consult');
    if (aIsConsult && !bIsConsult) return -1;
    if (!aIsConsult && bIsConsult) return 1;
    return a.localeCompare(b);
  });
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
function getFirstNameForSort(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}
function getSortLetterForClient(name: string): string {
  const first = getFirstNameForSort(name);
  const ch = first.charAt(0).toUpperCase();
  return ch >= 'A' && ch <= 'Z' ? ch : '#';
}

function ClientListWithAlphabet({ clients, isLoading, clientSearch, onSelectClient, onViewProfile }: {
  clients: PhorestClient[]; isLoading: boolean; clientSearch: string;
  onSelectClient: (client: PhorestClient) => void; onViewProfile: (client: PhorestClient) => void;
}) {
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const letterRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const sortedClients = useMemo(() => [...clients].sort((a, b) => getFirstNameForSort(a.name).toLowerCase().localeCompare(getFirstNameForSort(b.name).toLowerCase())), [clients]);
  const availableLetters = useMemo(() => { const s = new Set<string>(); sortedClients.forEach(c => s.add(getSortLetterForClient(c.name))); return s; }, [sortedClients]);
  const firstClientPerLetter = useMemo(() => { const m = new Map<string, string>(); sortedClients.forEach(c => { const l = getSortLetterForClient(c.name); if (!m.has(l)) m.set(l, c.id); }); return m; }, [sortedClients]);
  const filteredClients = useMemo(() => { if (!activeLetter) return sortedClients; return sortedClients.filter(c => getSortLetterForClient(c.name) === activeLetter); }, [sortedClients, activeLetter]);
  const handleLetterClick = useCallback((letter: string) => { setActiveLetter(prev => prev === letter ? null : letter); }, []);
  const setLetterRef = useCallback((letter: string, el: HTMLDivElement | null) => { if (el) letterRefs.current.set(letter, el); else letterRefs.current.delete(letter); }, []);
  const gi = (name: string) => { const p = name.trim().split(/\s+/); return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase(); };
  const fp = (phone: string | null) => { if (!phone) return null; const d = phone.replace(/\D/g, ''); if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`; if (d.length === 11 && d[0] === '1') return `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`; return phone; };
  const showStrip = sortedClients.length > 0 && !isLoading;
  const handleTouchMove = useCallback((e: React.TouchEvent) => { const t = e.touches[0]; const el = document.elementFromPoint(t.clientX, t.clientY); const l = el?.getAttribute('data-letter'); if (l && availableLetters.has(l)) handleLetterClick(l); }, [availableLetters, handleLetterClick]);

  return (
    <div className="flex-1 relative min-h-0">
      <ScrollArea className="h-full">
        <div className={cn('p-2', showStrip && 'pr-8')}>
          {isLoading ? (
            <DashboardLoader size="sm" className="py-8" />
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8"><p className="text-muted-foreground text-sm">{activeLetter ? `No clients starting with "${activeLetter}"` : clientSearch ? 'No clients found' : 'Start typing to search'}</p>{activeLetter && <button className="text-primary text-xs mt-1 hover:underline" onClick={() => setActiveLetter(null)}>Clear filter</button>}</div>
          ) : (
            <div className="space-y-0.5">
              {filteredClients.map((client) => {
                const letter = getSortLetterForClient(client.name);
                const isFirst = firstClientPerLetter.get(letter) === client.id;
                return (
                  <div key={client.id}>
                    {isFirst && (<div ref={(el) => setLetterRef(letter, el)} className="px-3 pt-2 pb-1"><span className="font-sans text-[11px] text-muted-foreground tracking-wide">{letter}</span></div>)}
                    <div className={cn('flex items-center gap-2 p-2.5 rounded-lg', 'hover:bg-muted/70 transition-colors', client.is_banned && 'border border-destructive/30 bg-destructive/5')}>
                      <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => onSelectClient(client)}>
                        <Avatar className="h-9 w-9 bg-muted shrink-0"><AvatarFallback className="text-xs font-medium text-muted-foreground bg-muted">{gi(client.name)}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2"><span className="font-medium text-sm truncate">{client.name}</span>{client.is_banned && <BannedClientBadge />}</div>
                          <div className="text-xs text-muted-foreground truncate">{fp(client.phone) || client.email || 'No contact info'}</div>
                        </div>
                      </button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onViewProfile(client); }}><Info className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
      {showStrip && (
        <div className="absolute right-1 top-0 bottom-0 w-5 flex flex-col items-center justify-center z-10 select-none" onTouchMove={handleTouchMove}>
          {ALPHABET.map((letter) => {
            const available = availableLetters.has(letter);
            const active = activeLetter === letter;
            return (<button key={letter} data-letter={letter} className={cn('font-sans leading-none py-[1px] w-full text-center transition-all', available ? active ? 'text-primary font-medium text-[11px]' : 'text-muted-foreground text-[10px] hover:text-foreground' : 'text-muted-foreground/30 text-[10px] pointer-events-none')} onClick={() => available && handleLetterClick(letter)} tabIndex={-1} type="button">{letter}</button>);
          })}
        </div>
      )}
    </div>
  );
}

export function QuickBookingPopover({
  date,
  time,
  open,
  onOpenChange,
  children,
  defaultLocationId,
  mode = 'popover',
  defaultStylistId,
  draftId,
  onBookingComplete,
  initialDraftData,
}: QuickBookingPopoverProps) {
  const queryClient = useQueryClient();
  const { user, roles } = useAuth();
  const { data: redoPolicy } = useRedoPolicySettings();
  const isManagerOrAdmin = roles.some(r => ['admin', 'super_admin', 'manager'].includes(r));
  const saveDraft = useSaveDraft();
  const deleteDraftMutation = useDeleteDraft();

  // Notify FAB about booking popover state
  useEffect(() => {
    if (mode === 'panel') {
      window.dispatchEvent(new CustomEvent('booking-popover-state', { detail: { open } }));
    }
  }, [open, mode]);
  const { formatCurrency, formatCurrencyWhole } = useFormatCurrency();
  const { formatDate: formatDateLocale } = useFormatDate();
  const { getLevelPrice } = useBookingLevelPricing();
  const [step, setStep] = useState<Step>('service');
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [highestStepReached, setHighestStepReached] = useState<number>(0);
  
  // Form state
  const [selectedClient, setSelectedClient] = useState<PhorestClient | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedStylist, setSelectedStylist] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(defaultLocationId || '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [autoSelectReason, setAutoSelectReason] = useState<'previous' | 'self' | 'highest' | null>(null);
  const [viewingClientProfile, setViewingClientProfile] = useState<PhorestClient | null>(null);
  const [pendingBannedClient, setPendingBannedClient] = useState<PhorestClient | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [showBreakForm, setShowBreakForm] = useState(false);
  const [requestAssistant, setRequestAssistant] = useState(false);

  // Redo / Adjustment state
  const [isRedo, setIsRedo] = useState(false);
  const [redoReason, setRedoReason] = useState('');
  const [redoCustomReason, setRedoCustomReason] = useState('');
  const [redoPriceOverride, setRedoPriceOverride] = useState<number | null>(null);
  const [originalAppointmentId, setOriginalAppointmentId] = useState<string | null>(null);
  const [originalAppointmentData, setOriginalAppointmentData] = useState<{
    id: string;
    service_name: string | null;
    appointment_date: string;
    staff_name: string | null;
    total_price: number | null;
  } | null>(null);

  // Query client's recent appointments for redo linking (from both phorest_appointments AND native appointments)
  const { data: clientRecentAppointments = [] } = useQuery({
    queryKey: ['client-recent-appointments', selectedClient?.phorest_client_id, selectedClient?.id, redoPolicy?.redo_window_days],
    queryFn: async () => {
      const windowDays = redoPolicy?.redo_window_days ?? 14;
      const dateFrom = format(new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      
      type RecentAppt = { id: string; service_name: string | null; appointment_date: string; start_time: string; total_price: number | null; staff_name: string };

      const results: RecentAppt[] = [];
      const seenDates = new Set<string>();

      // 1. Query all appointments via the union view
      if (selectedClient?.phorest_client_id) {
        const { data } = await supabase
          .from('v_all_appointments' as any)
          .select('id, service_name, appointment_date, start_time, total_price, stylist_user_id')
          .eq('phorest_client_id', selectedClient.phorest_client_id)
          .gte('appointment_date', dateFrom)
          .not('status', 'in', '("cancelled")')
          .order('appointment_date', { ascending: false })
          .limit(20);

        const rows = (data as any[] || []) as any[];
        if (rows.length) {
          const stylistIds = [...new Set(rows.map((a: any) => a.stylist_user_id).filter(Boolean))] as string[];
          let stylistMap: Record<string, string> = {};
          if (stylistIds.length > 0) {
            const { data: profiles } = await supabase
              .from('employee_profiles')
              .select('user_id, display_name, full_name')
              .in('user_id', stylistIds);
            for (const p of profiles || []) {
              stylistMap[p.user_id] = formatDisplayName(p.full_name || '', p.display_name);
            }
          }
          for (const a of rows) {
            const key = `${a.appointment_date}-${a.service_name}`;
            seenDates.add(key);
            results.push({
              id: a.id,
              service_name: a.service_name,
              appointment_date: a.appointment_date,
              start_time: a.start_time,
              total_price: a.total_price,
              staff_name: a.stylist_user_id ? stylistMap[a.stylist_user_id] || 'Unknown' : 'Unknown',
            });
          }
        }
      }

      // 2. Query native appointments table (for bookings made through create_booking)
      if (selectedClient?.id) {
        const { data: nativeAppts } = await supabase
          .from('appointments')
          .select('id, service_name, appointment_date, start_time, total_price, staff_name')
          .eq('client_id', selectedClient.id)
          .gte('appointment_date', dateFrom)
          .not('status', 'in', '("cancelled")')
          .order('appointment_date', { ascending: false })
          .limit(20);

        for (const a of nativeAppts || []) {
          const key = `${a.appointment_date}-${a.service_name}`;
          if (!seenDates.has(key)) {
            results.push({
              id: a.id,
              service_name: a.service_name,
              appointment_date: a.appointment_date,
              start_time: a.start_time,
              total_price: a.total_price,
              staff_name: a.staff_name || 'Unknown',
            });
          }
        }
      }

      return results.sort((a, b) => b.appointment_date.localeCompare(a.appointment_date));
    },
    enabled: !!(selectedClient?.phorest_client_id || selectedClient?.id) && isRedo && open,
  });

  // Add-on toast state
  const [showAddonToast, setShowAddonToast] = useState(false);
  const [dismissedAddonCategories, setDismissedAddonCategories] = useState<Set<string>>(new Set());

  // Stylist-first mode state
  const [stylistFirstMode, setStylistFirstMode] = useState(false);
  const [preSelectedStylistId, setPreSelectedStylistId] = useState<string | null>(null);
  const [preSelectedStylistPhorestId, setPreSelectedStylistPhorestId] = useState<string | null>(null);
  const [preSelectedStylistName, setPreSelectedStylistName] = useState('');
  const [preSelectedStylistPhoto, setPreSelectedStylistPhoto] = useState<string | null>(null);
  const [preSelectedStylistLevel, setPreSelectedStylistLevel] = useState<string | null>(null);

  // Check if a step has valid input (for forward navigation)
  const isStepCompleted = (stepName: Step): boolean => {
    switch (stepName) {
      case 'service':
        return true; // Services are optional (can skip)
      case 'location':
        return !!selectedLocation;
      case 'client':
        return !!selectedClient;
      case 'stylist':
        return !!selectedStylist || !!preSelectedStylistId;
      case 'confirm':
        return false; // Final step, no forward from here
      default:
        return false;
    }
  };

  // Navigate to a step and update highest reached
  const navigateToStep = (targetStep: Step) => {
    const targetIndex = STEPS.indexOf(targetStep);
    if (targetIndex > highestStepReached) {
      setHighestStepReached(targetIndex);
    }
    setStep(targetStep);
  };

  // Can go forward if we've been to that step before and current step is complete
  const canGoForward = useMemo(() => {
    const currentIndex = STEPS.indexOf(step);
    const nextIndex = currentIndex + 1;
    return nextIndex <= highestStepReached && 
           nextIndex < STEPS.length && 
           isStepCompleted(step);
  }, [step, highestStepReached, selectedLocation, selectedClient, selectedStylist, preSelectedStylistId]);

  // Pre-populate from draft data when opening with a draft
  useEffect(() => {
    if (open && initialDraftData) {
      if (initialDraftData.locationId) setSelectedLocation(initialDraftData.locationId);
      if (initialDraftData.selectedServices?.length) setSelectedServices(initialDraftData.selectedServices);
      if (initialDraftData.notes) { setBookingNotes(initialDraftData.notes); setShowNotes(true); }
      if (initialDraftData.isRedo) setIsRedo(true);
      if (initialDraftData.staffUserId) setSelectedStylist(initialDraftData.staffUserId);
      // Jump to the furthest step reached
      if (initialDraftData.stepReached) {
        const stepIdx = STEPS.indexOf(initialDraftData.stepReached as Step);
        if (stepIdx >= 0) {
          setHighestStepReached(stepIdx);
          setStep(initialDraftData.stepReached as Step);
        }
      }
    }
  }, [open, initialDraftData]);

  // Sync location when popover opens with a new default
  useEffect(() => {
    if (open && defaultLocationId && !initialDraftData?.locationId) {
      setSelectedLocation(defaultLocationId);
    }
  }, [open, defaultLocationId, initialDraftData]);

  const { data: locations = [] } = useLocations();
  const { data: servicesByCategory, services = [], isLoading: isLoadingServices } = useAllServicesByCategory();
  const { colorMap: categoryColors } = useServiceCategoryColorsMap();
  const { data: categoryColorsList = [] } = useServiceCategoryColors();

  // Add-on recommendations (new system)
  const { effectiveOrganization, isImpersonating } = useOrganizationContext();
  const godModeOffset = isImpersonating ? 44 : 0;
  const { data: addonLibrary = [] } = useServiceAddons(effectiveOrganization?.id);
  const { byCategoryId, byServiceId } = useAddonAssignmentMaps(effectiveOrganization?.id);

  // When a category is selected, show add-on toast after 800ms if not dismissed
  useEffect(() => {
    if (!selectedCategory || selectedCategory === ADDONS_CATEGORY) {
      setShowAddonToast(false);
      return;
    }
    if (dismissedAddonCategories.has(selectedCategory)) return;

    const catEntry = categoryColorsList.find(c => c.category_name === selectedCategory);
    if (!catEntry) return;

    const addons = byCategoryId[catEntry.id];
    if (!addons || addons.length === 0) return;

    const timer = setTimeout(() => setShowAddonToast(true), 800);
    return () => clearTimeout(timer);
  }, [selectedCategory, byCategoryId, categoryColorsList, dismissedAddonCategories]);

  // Compute add-on suggestions: category-level + service-level, deduplicated
  const addonSuggestions = useMemo((): ServiceAddon[] => {
    if (!selectedCategory || !showAddonToast) return [];
    const catEntry = categoryColorsList.find(c => c.category_name === selectedCategory);
    if (!catEntry) return [];

    const catAddons = byCategoryId[catEntry.id] || [];
    // Also gather service-level addons for selected services
    const svcAddons = selectedServices.flatMap(svcId => byServiceId[svcId] || []);

    // Deduplicate by addon id, filter out addons already added to the booking
    const seen = new Set<string>();
    const addedServiceNames = new Set(
      services.filter(s => selectedServices.includes(s.phorest_service_id)).map(s => s.name)
    );

    return [...catAddons, ...svcAddons]
      .filter(addon => {
        if (seen.has(addon.id)) return false;
        if (addedServiceNames.has(addon.name)) return false;
        seen.add(addon.id);
        return true;
      })
      .slice(0, 3);
  }, [selectedCategory, showAddonToast, byCategoryId, byServiceId, categoryColorsList, selectedServices, services]);

  // Get selected service details (for totals calculation) — excludes addon: prefixed IDs
  const selectedServiceDetails = useMemo(() => {
    return services.filter(s => selectedServices.filter(id => !id.startsWith('addon:')).includes(s.phorest_service_id));
  }, [services, selectedServices]);

  // Get selected add-on details from the library
  const selectedAddonDetails = useMemo(() => {
    return selectedServices
      .filter(id => id.startsWith('addon:'))
      .map(id => addonLibrary.find(a => `addon:${a.id}` === id))
      .filter(Boolean) as ServiceAddon[];
  }, [selectedServices, addonLibrary]);

  const canViewAllClients = roles.some(r => ['admin', 'manager', 'super_admin', 'receptionist'].includes(r));

  // Fetch clients
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['phorest-clients-booking', clientSearch, user?.id, canViewAllClients],
    queryFn: async () => {
      let query = supabase
        .from('v_all_clients' as any)
        .select('id, phorest_client_id, name, email, phone, preferred_stylist_id, visit_count, last_visit, total_spend, is_vip, branch_name, is_banned, ban_reason, birthday, client_since')
        .eq('is_duplicate', false)
        .order('name')
        .limit(50);
      
      if (!canViewAllClients && user?.id) {
        query = query.eq('preferred_stylist_id', user.id);
      }
      
      if (clientSearch) {
        const hasDigit = /\d/.test(clientSearch);
        const hasAt = clientSearch.includes('@');
        const filters = [`name.ilike.${clientSearch}%`];
        if (hasDigit) filters.push(`phone.ilike.%${clientSearch}%`);
        if (hasAt) filters.push(`email.ilike.%${clientSearch}%`);
        query = query.or(filters.join(','));
      }
      
      const { data } = await query;
      return data as unknown as PhorestClient[];
    },
    enabled: !!user?.id && open,
  });

  // Fetch stylists filtered by selected location (normal mode)
  const { data: stylists = [] } = useQuery({
    queryKey: ['booking-stylists', selectedLocation],
    queryFn: async () => {
      if (!selectedLocation) return [];
      
      const { data } = await supabase
        .from('v_all_staff' as any)
        .select('phorest_staff_id, user_id, phorest_branch_id, location_id, display_name, full_name, photo_url, stylist_level, show_on_calendar')
        .eq('is_active', true)
        .eq('show_on_calendar', true)
        .eq('location_id', selectedLocation);
      
      // Reshape to match existing consumer expectations (employee_profiles nested shape)
      return ((data as any[]) || []).map((s: any) => ({
        ...s,
        employee_profiles: {
          display_name: s.display_name,
          full_name: s.full_name,
          photo_url: s.photo_url,
          stylist_level: s.stylist_level,
        },
      }));
    },
    enabled: open && !!selectedLocation,
  });

  // Fetch ALL stylists across all locations (stylist-first mode)
  const { data: allStylists = [] } = useQuery({
    queryKey: ['booking-stylists-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('v_all_staff' as any)
        .select('phorest_staff_id, user_id, phorest_branch_id, location_id, display_name, full_name, photo_url, stylist_level, show_on_calendar')
        .eq('is_active', true)
        .eq('show_on_calendar', true);
      
      return ((data as any[]) || []).map((s: any) => ({
        ...s,
        employee_profiles: {
          display_name: s.display_name,
          full_name: s.full_name,
          photo_url: s.photo_url,
          stylist_level: s.stylist_level,
        },
      }));
    },
    enabled: open && stylistFirstMode,
  });

  // Deduplicate all-location stylists by user_id (a stylist may appear in multiple branches)
  const uniqueAllStylists = useMemo(() => {
    const seen = new Set<string>();
    return allStylists.filter(s => {
      if (seen.has(s.user_id)) return false;
      seen.add(s.user_id);
      return true;
    });
  }, [allStylists]);

  // Get the pre-selected stylist's locations (branches they work at)
  const preSelectedStylistLocations = useMemo(() => {
    if (!preSelectedStylistId) return [];
    // Get all branch IDs this stylist works at
    const branchIds = allStylists
      .filter(s => s.user_id === preSelectedStylistId)
      .map(s => s.phorest_branch_id);
    // Match to locations
    return locations.filter(loc => branchIds.includes(loc.phorest_branch_id));
  }, [preSelectedStylistId, allStylists, locations]);

  // Get the phorest_branch_id for the selected location
  const selectedLocationBranchId = useMemo(() => {
    const loc = locations.find(l => l.id === selectedLocation);
    return loc?.phorest_branch_id || null;
  }, [locations, selectedLocation]);

  // Fetch qualified services for pre-selected stylist (stylist-first mode)
  const { data: preSelectedStylistQualifiedServices = [] } = useStaffQualifiedServices(
    preSelectedStylistPhorestId || undefined,
    selectedLocationBranchId || undefined
  );

  // Fetch qualification data for selected services (normal mode)
  const { data: qualificationData } = useQualifiedStaffForServices(selectedServices, selectedLocation);

  // Filter stylists by qualification and sort by level (highest first)
  const filteredStylists = useMemo(() => {
    let list = stylists;
    
    if (qualificationData?.hasQualificationData) {
      list = stylists.filter(stylist => 
        qualificationData.qualifiedStaffIds.includes(stylist.phorest_staff_id)
      );
    }
    
    return [...list].sort((a, b) => {
      const levelA = getLevelNumber(a.employee_profiles?.stylist_level) ?? 0;
      const levelB = getLevelNumber(b.employee_profiles?.stylist_level) ?? 0;
      return levelB - levelA;
    });
  }, [stylists, qualificationData]);

  // Auto-select stylist when entering stylist step for the first time
  useEffect(() => {
    // Don't auto-select in stylist-first mode (user picks manually)
    if (stylistFirstMode) return;

    const stylistStepIndex = STEPS.indexOf('stylist');
    const isFirstVisit = step === 'stylist' && 
                         highestStepReached === stylistStepIndex &&
                         !selectedStylist;
    
    if (isFirstVisit && filteredStylists.length > 0) {
      const isStylistRole = roles.some(r => ['stylist', 'stylist_assistant'].includes(r));
      if (isStylistRole && user?.id) {
        const selfStylist = filteredStylists.find(s => s.user_id === user.id);
        if (selfStylist) {
          setSelectedStylist(selfStylist.user_id);
          setAutoSelectReason('self');
          return;
        }
      }
      
      if (selectedClient?.preferred_stylist_id) {
        const preferredStylist = filteredStylists.find(
          s => s.user_id === selectedClient.preferred_stylist_id
        );
        if (preferredStylist) {
          setSelectedStylist(preferredStylist.user_id);
          setAutoSelectReason('previous');
          return;
        }
      }
      
      setSelectedStylist(filteredStylists[0].user_id);
      setAutoSelectReason('highest');
    }
  }, [step, filteredStylists, selectedStylist, roles, user?.id, selectedClient, highestStepReached, stylistFirstMode]);

  const totalDuration = useMemo(() => {
    const serviceDur = selectedServiceDetails.reduce((sum, s) => sum + s.duration_minutes, 0);
    const addonDur = selectedAddonDetails.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
    return serviceDur + addonDur;
  }, [selectedServiceDetails, selectedAddonDetails]);

  const totalPrice = useMemo(() => {
    const servicePrice = selectedServiceDetails.reduce((sum, s) => sum + (s.price || 0), 0);
    const addonPrice = selectedAddonDetails.reduce((sum, a) => sum + a.price, 0);
    return servicePrice + addonPrice;
  }, [selectedServiceDetails, selectedAddonDetails]);

  // Estimated product cost charges for parts_and_labor services
  const selectedServiceIds = useMemo(() => {
    return selectedServiceDetails.map(s => s.id);
  }, [selectedServiceDetails]);

  const { data: estimatedProductCharge } = useEstimatedProductCharge(
    effectiveOrganization?.id,
    selectedServiceIds
  );

  const selectedStylistData = useMemo(() => {
    return stylists.find(s => s.user_id === selectedStylist);
  }, [stylists, selectedStylist]);

  const selectedLevelSlug = useMemo(() => {
    return getLevelSlug(selectedStylistData?.employee_profiles?.stylist_level);
  }, [selectedStylistData]);

  const selectedLevelNumber = useMemo(() => {
    return getLevelNumber(selectedStylistData?.employee_profiles?.stylist_level);
  }, [selectedStylistData]);

  const levelBasedTotalPrice = useMemo(() => {
    const addonTotal = selectedAddonDetails.reduce((sum, a) => sum + a.price, 0);
    if (!selectedLevelSlug) return totalPrice;
    
    return selectedServiceDetails.reduce((sum, service) => {
      const levelPrice = getLevelPrice(service.id, selectedLevelSlug);
      return sum + (levelPrice ?? service.price ?? 0);
    }, 0) + addonTotal;
  }, [selectedServiceDetails, selectedAddonDetails, selectedLevelSlug, totalPrice, getLevelPrice]);

  // Create booking mutation
  const createBooking = useMutation({
    mutationFn: async () => {
      const effectiveStylistId = preSelectedStylistId || selectedStylist;
      const stylistMapping = stylists.find(s => s.user_id === effectiveStylistId) 
        || allStylists.find(s => s.user_id === effectiveStylistId);
      if (!stylistMapping || !selectedClient) throw new Error('Missing required data');

      const startDateTime = `${format(date, 'yyyy-MM-dd')}T${time}:00Z`;

      const response = await supabase.functions.invoke('create-phorest-booking', {
        body: {
          branch_id: selectedLocationBranchId || undefined,
          location_id: selectedLocation,
          client_id: selectedClient.phorest_client_id || selectedClient.id,
          staff_id: stylistMapping.phorest_staff_id || undefined,
          staff_user_id: effectiveStylistId,
          service_ids: selectedServices.filter(id => !id.startsWith('addon:')),
          addon_ids: selectedAddonDetails.map(a => ({ id: a.id, name: a.name, price: a.price, duration: a.duration_minutes })),
          start_time: startDateTime,
          notes: bookingNotes || undefined,
          // Redo / adjustment metadata
          is_redo: isRedo,
          redo_reason: isRedo ? (redoReason === 'Other' ? redoCustomReason : redoReason) || undefined : undefined,
          original_appointment_id: isRedo ? originalAppointmentId || undefined : undefined,
          redo_pricing_override: isRedo ? (() => {
            if (redoPriceOverride != null) return redoPriceOverride;
            const origPrice = originalAppointmentData?.total_price;
            if (origPrice != null && redoPolicy) {
              if (redoPolicy.redo_pricing_policy === 'free') return 0;
              if (redoPolicy.redo_pricing_policy === 'percentage') return origPrice * (redoPolicy.redo_pricing_percentage / 100);
              return origPrice;
            }
            return undefined;
          })() : undefined,
          redo_requires_approval: isRedo ? redoPolicy?.redo_requires_approval : undefined,
          redo_is_manager: isRedo ? isManagerOrAdmin : undefined,
        },
      });

      if (response.error) throw response.error;
      if (!response.data?.success) throw new Error(response.data?.error || 'Booking failed');

      return response.data;
    },
    onSuccess: () => {
      // Delete draft if booking was resumed from one
      if (draftId && effectiveOrganization?.id) {
        deleteDraftMutation.mutate({ id: draftId, orgId: effectiveOrganization.id });
      }

      // Auto-create assistant time block if requested
      if (requestAssistant && effectiveOrganization?.id) {
        const effectiveStylistId = preSelectedStylistId || selectedStylist;
        const bookingDate = format(date, 'yyyy-MM-dd');
        // Calculate end time from start + total duration
        const [startH, startM] = time.split(':').map(Number);
        const endMinutes = startH * 60 + startM + totalDuration;
        const endH = Math.floor(endMinutes / 60);
        const endM = endMinutes % 60;
        const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}:00`;

        supabase.from('assistant_time_blocks').insert({
          organization_id: effectiveOrganization.id,
          location_id: selectedLocation,
          date: bookingDate,
          start_time: `${time}:00`,
          end_time: endTime,
          requesting_user_id: effectiveStylistId,
          assistant_user_id: null,
          status: 'requested',
          created_by: user?.id || effectiveStylistId,
        }).then(({ error }) => {
          if (error) console.warn('[AssistantTimeBlock] Auto-create failed:', error);
        });
      }

      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['assistant-time-blocks'] });
      toast.success('Appointment booked successfully');
      onBookingComplete?.(date);
      handleClose(true);
    },
    onError: (error: Error) => {
      toast.error('Failed to create booking', { description: error.message });
    },
  });

  const handleClose = (skipDraftSave = false) => {
    // Auto-save as draft if meaningful data exists and not a completed booking
    if (!skipDraftSave && effectiveOrganization?.id) {
      const hasData = selectedServices.length > 0 || selectedClient || bookingNotes;
      if (hasData) {
        const serviceDetails = services
          .filter(s => selectedServices.filter(id => !id.startsWith('addon:')).includes(s.phorest_service_id))
          .map(s => ({ id: s.phorest_service_id, name: s.name }));
        const addonDetails = selectedAddonDetails.map(a => ({ id: `addon:${a.id}`, name: a.name }));

        saveDraft.mutate({
          id: draftId || undefined,
          organization_id: effectiveOrganization.id,
          location_id: selectedLocation || undefined,
          appointment_date: format(date, 'yyyy-MM-dd'),
          start_time: time,
          client_id: selectedClient?.id || null,
          client_name: selectedClient?.name || null,
          staff_user_id: selectedStylist || null,
          staff_name: selectedStylistData?.employee_profiles ? formatDisplayName(selectedStylistData.employee_profiles.full_name || '', selectedStylistData.employee_profiles.display_name) : null,
          selected_services: [...serviceDetails, ...addonDetails],
          notes: bookingNotes || undefined,
          step_reached: step,
          is_redo: isRedo,
          redo_metadata: isRedo ? { reason: redoReason, originalAppointmentId } : undefined,
        });
        toast.success('Draft saved', {
          description: `${selectedClient?.name || 'No client'} · ${selectedServices.length} service(s)`,
        });
      }
    }

    setStep('service');
    setHighestStepReached(0);
    setSelectedClient(null);
    setClientSearch('');
    setSelectedServices([]);
    setSelectedStylist('');
    setSelectedLocation('');
    setSelectedCategory(null);
    setServiceSearch('');
    setAutoSelectReason(null);
    setViewingClientProfile(null);
    setBookingNotes('');
    setShowNotes(false);
    setShowBreakForm(false);
    setRequestAssistant(false);
    // Reset redo state
    setIsRedo(false);
    setRedoReason('');
    setRedoCustomReason('');
    setRedoPriceOverride(null);
    setOriginalAppointmentId(null);
    setOriginalAppointmentData(null);
    // Reset add-on toast state
    setShowAddonToast(false);
    setDismissedAddonCategories(new Set());
    // Reset stylist-first mode
    setStylistFirstMode(false);
    setPreSelectedStylistId(null);
    setPreSelectedStylistPhorestId(null);
    setPreSelectedStylistName('');
    setPreSelectedStylistPhoto(null);
    setPreSelectedStylistLevel(null);
    onOpenChange(false);
  };

  const handleSelectClient = (client: PhorestClient) => {
    if (client.is_banned) {
      setPendingBannedClient(client);
      return;
    }
    proceedWithClient(client);
  };

  const proceedWithClient = (client: PhorestClient) => {
    setSelectedClient(client);
    if (client.id !== selectedClient?.id) {
      if (!stylistFirstMode) {
        setSelectedStylist('');
        setAutoSelectReason(null);
      }
    }
    // In stylist-first mode, skip the stylist step (already selected)
    if (stylistFirstMode && preSelectedStylistId) {
      setSelectedStylist(preSelectedStylistId);
      navigateToStep('confirm');
    } else {
      navigateToStep('stylist');
    }
  };

  const handleProceedWithBannedClient = () => {
    if (pendingBannedClient) {
      proceedWithClient(pendingBannedClient);
      setPendingBannedClient(null);
    }
  };

  const handleServicesComplete = () => {
    // In stylist-first mode, skip to client (location + stylist already done)
    if (stylistFirstMode && preSelectedStylistId && selectedLocation) {
      navigateToStep('client');
    } else {
      navigateToStep('location');
    }
  };

  const handleBack = () => {
    const currentIndex = STEPS.indexOf(step);
    if (stylistFirstMode) {
      // Custom back navigation for stylist-first mode
      if (step === 'confirm') {
        setStep('client');
        return;
      }
      if (step === 'client') {
        setStep('service');
        return;
      }
      if (step === 'service' && preSelectedStylistId) {
        // Go back to location (which may go back to stylist)
        setStep('location');
        return;
      }
      if (step === 'location') {
        setStep('stylist');
        return;
      }
      if (step === 'stylist') {
        // Back to service, clear stylist-first mode
        setStylistFirstMode(false);
        setPreSelectedStylistId(null);
        setPreSelectedStylistPhorestId(null);
        setPreSelectedStylistName('');
        setPreSelectedStylistPhoto(null);
        setPreSelectedStylistLevel(null);
        setStep('service');
        return;
      }
    }
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1]);
    }
  };

  const handleForward = () => {
    const currentIndex = STEPS.indexOf(step);
    const nextIndex = currentIndex + 1;
    if (nextIndex <= highestStepReached && nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex]);
    }
  };

  // Handle stylist selection in stylist-first mode
  const handleStylistFirstSelect = (stylist: typeof allStylists[0]) => {
    const fullName = stylist.employee_profiles ? formatDisplayName(stylist.employee_profiles.full_name || '', stylist.employee_profiles.display_name) : 'Unknown';
    setPreSelectedStylistId(stylist.user_id);
    setPreSelectedStylistPhorestId(stylist.phorest_staff_id);
    setPreSelectedStylistName(fullName);
    setPreSelectedStylistPhoto(stylist.employee_profiles?.photo_url || null);
    setPreSelectedStylistLevel(stylist.employee_profiles?.stylist_level || null);
    setSelectedStylist(stylist.user_id);
  };

  // After selecting a stylist in stylist-first mode, navigate to location
  const handleStylistFirstContinue = () => {
    if (!preSelectedStylistId) return;
    
    // Get locations for this stylist
    const branchIds = allStylists
      .filter(s => s.user_id === preSelectedStylistId)
      .map(s => s.phorest_branch_id);
    const stylistLocations = locations.filter(loc => branchIds.includes(loc.phorest_branch_id));
    
    if (stylistLocations.length === 1) {
      // Auto-select and skip location step
      setSelectedLocation(stylistLocations[0].id);
      navigateToStep('service');
    } else {
      navigateToStep('location');
    }
  };

  // Clear pre-selected stylist
  const clearPreSelectedStylist = () => {
    setStylistFirstMode(false);
    setPreSelectedStylistId(null);
    setPreSelectedStylistPhorestId(null);
    setPreSelectedStylistName('');
    setPreSelectedStylistPhoto(null);
    setPreSelectedStylistLevel(null);
    setSelectedStylist('');
    setSelectedLocation('');
  };

  // Check if a service is qualified for the pre-selected stylist
  const isServiceQualifiedForPreSelected = (phorestServiceId: string): boolean => {
    if (!preSelectedStylistPhorestId) return true;
    if (preSelectedStylistQualifiedServices.length === 0) return true; // No qualification data
    return preSelectedStylistQualifiedServices.includes(phorestServiceId);
  };

  // Handle selecting a service that's unqualified for the pre-selected stylist
  const handleServiceToggle = (phorestServiceId: string) => {
    // Add-on IDs skip qualification checks
    if (phorestServiceId.startsWith('addon:')) {
      setSelectedServices(prev =>
        prev.includes(phorestServiceId)
          ? prev.filter(id => id !== phorestServiceId)
          : [...prev, phorestServiceId]
      );
      return;
    }
    
    const isQualified = isServiceQualifiedForPreSelected(phorestServiceId);
    
    if (!isQualified && !selectedServices.includes(phorestServiceId)) {
      // Selecting an unqualified service — warn and clear pre-selected stylist
      toast.warning(`This service is not offered by ${preSelectedStylistName}. Stylist selection has been cleared.`);
      clearPreSelectedStylist();
    }
    
    setSelectedServices(prev =>
      prev.includes(phorestServiceId)
        ? prev.filter(id => id !== phorestServiceId)
        : [...prev, phorestServiceId]
    );
  };

  const formatTime12h = (t: string) => {
    const [hours, minutes] = t.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatPhone = (phone: string | null): string | null => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}${digits.slice(3, 6)}${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits[0] === '1') {
      return `${digits.slice(1, 4)}${digits.slice(4, 7)}${digits.slice(7)}`;
    }
    return phone;
  };

  const currentStepIndex = STEPS.indexOf(step);
  const effectiveStylistSelected = !!selectedStylist || !!preSelectedStylistId;
  const redoReasonValid = !isRedo || !redoPolicy?.redo_reason_required || (redoReason && (redoReason !== 'Other' || redoCustomReason.trim()));
  const redoOriginalLinked = !isRedo || !!originalAppointmentId;
  const canBook = selectedClient && selectedServices.length > 0 && effectiveStylistSelected && selectedLocation && redoReasonValid && redoOriginalLinked;

  const getStylistName = () => {
    if (preSelectedStylistName) return preSelectedStylistName;
    const stylist = stylists.find(s => s.user_id === selectedStylist);
    return stylist?.employee_profiles?.display_name || stylist?.employee_profiles?.full_name || '';
  };

  // ─── Shared inner content (header + steps) ─────────────────────
  const innerContent = (
    <>
      {/* Header */}
      <div className="bg-card border-b border-border rounded-t-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {step !== 'service' || viewingClientProfile || (stylistFirstMode && step === 'service') ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => {
                  if (viewingClientProfile) {
                    setViewingClientProfile(null);
                  } else {
                    handleBack();
                  }
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <CalendarPlus className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div>
              {viewingClientProfile ? (
                <>
                  <h2 className="font-medium text-sm truncate max-w-[180px]">{viewingClientProfile.name}</h2>
                  <p className="text-xs text-muted-foreground">Client Profile</p>
                </>
              ) : (
                <>
                  <h2 className="font-medium text-sm">New Booking</h2>
                  <p className="text-xs text-muted-foreground">
                    {formatDateLocale(date, 'EEE, MMM d')} at {formatTime12h(time)}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!viewingClientProfile && step !== 'client' && step !== 'confirm' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => {
                      setShowNewClientDialog(true);
                    }}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New Client</TooltipContent>
              </Tooltip>
            )}
            {canGoForward && !viewingClientProfile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={handleForward}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-muted"
              onClick={() => handleClose()}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex px-4 pb-3 gap-1">
          {STEPS.map((s, i) => {
            const isClickable = i <= highestStepReached && i !== currentStepIndex;
            const stepLabel = s.charAt(0).toUpperCase() + s.slice(1);
            const isCurrent = i === currentStepIndex;
            const isCompleted = isStepCompleted(s);
            const isVisited = i <= highestStepReached;
            const isStylistPreFilled = stylistFirstMode && s === 'stylist' && preSelectedStylistId;
            
            const getSegmentStyle = () => {
              if (isStylistPreFilled && !isCurrent) return 'bg-primary/50';
              if (isCurrent) return 'bg-primary';
              if (i < currentStepIndex && isCompleted) return 'bg-primary';
              if (i > currentStepIndex && isVisited && isCompleted) return 'bg-primary/50';
              if (isVisited && !isCompleted) return 'bg-primary/30';
              return 'bg-muted';
            };
            
            return (
              <div key={s} className="flex-1 group relative">
                <button
                  onClick={() => isClickable && setStep(s)}
                  disabled={!isClickable}
                  className={cn(
                    'w-full h-1.5 rounded-full transition-all',
                    getSegmentStyle(),
                    isClickable && 'cursor-pointer hover:opacity-70 hover:scale-y-150',
                    !isClickable && 'cursor-default'
                  )}
                />
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <span className="text-[10px] font-medium text-muted-foreground bg-popover px-1.5 py-0.5 rounded shadow-sm border border-border whitespace-nowrap flex items-center gap-1">
                    {stepLabel}
                    {isStylistPreFilled && <Check className="h-2.5 w-2.5 text-green-500" />}
                    {isVisited && isCompleted && !isStylistPreFilled && (
                      <Check className="h-2.5 w-2.5 text-green-500" />
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step: Client Selection */}
      {step === 'client' && (
        viewingClientProfile ? (
          <ClientProfileView
            client={viewingClientProfile}
            onBack={() => setViewingClientProfile(null)}
            onSelect={(client) => {
              setViewingClientProfile(null);
              handleSelectClient(client);
            }}
          />
        ) : (
          <div className={cn("flex flex-col", mode === 'panel' ? 'flex-1 min-h-0' : '')} style={mode === 'popover' ? { height: '550px' } : undefined}>
            <div className="p-3 border-b border-border">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setShowNewClientDialog(true)}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ClientListWithAlphabet
              clients={clients}
              isLoading={isLoadingClients}
              clientSearch={clientSearch}
              onSelectClient={handleSelectClient}
              onViewProfile={setViewingClientProfile}
            />
          </div>
        )
      )}

      {/* Step: Service Selection */}
      {step === 'service' && (
        <div className={cn("flex flex-col", mode === 'panel' ? 'flex-1 min-h-0' : '')} style={mode === 'popover' ? { height: '550px' } : undefined}>
          {showBreakForm ? (
            <AddTimeBlockForm
              date={date}
              time={time}
              onBack={() => setShowBreakForm(false)}
              onComplete={() => {
                setShowBreakForm(false);
                onOpenChange(false);
              }}
              defaultStylistId={preSelectedStylistId || defaultStylistId}
            />
          ) : (
            <>
          {stylistFirstMode && preSelectedStylistId && !selectedCategory && (
            <div className="px-3 pt-3 pb-0">
              <div className="flex items-center gap-2.5 p-2 rounded-lg bg-accent/50 border border-accent">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={preSelectedStylistPhoto || undefined} />
                  <AvatarFallback className="bg-muted text-xs font-medium">
                    {preSelectedStylistName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{preSelectedStylistName}</div>
                  {preSelectedStylistLevel && (
                    <div className="text-[10px] text-muted-foreground">{preSelectedStylistLevel}</div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={clearPreSelectedStylist}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          {selectedCategory && (
            <div className="sticky top-0 z-10 bg-popover border-b border-border px-3 py-2">
              <button
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setSelectedCategory(null)}
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back to categories</span>
              </button>
            </div>
          )}
          <ScrollArea className="flex-1">
            <div className="p-3">
              {isLoadingServices ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !selectedCategory ? (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search for a service"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      className="pl-9 h-9 bg-muted/50 border border-border"
                    />
                  </div>
                  {!stylistFirstMode && !serviceSearch && (
                    <button
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
                      onClick={() => {
                        setStylistFirstMode(true);
                        navigateToStep('stylist');
                      }}
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>Know your stylist? Select first</span>
                    </button>
                  )}
                  {serviceSearch ? (
                    <div className="space-y-1">
                      {services
                        .filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
                        .slice(0, 15)
                        .map((service) => {
                          const isSelected = selectedServices.includes(service.phorest_service_id);
                          const isQualified = isServiceQualifiedForPreSelected(service.phorest_service_id);
                          return (
                            <button
                              key={service.id}
                              className={cn(
                                'w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all',
                                isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/70',
                                !isQualified && !isSelected && 'opacity-40'
                              )}
                              onClick={() => handleServiceToggle(service.phorest_service_id)}
                            >
                              <div className="flex-1 min-w-0 mr-2">
                                <div className="font-medium text-sm truncate">{service.name}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                                    <Clock className="h-3 w-3" />{service.duration_minutes}m
                                  </span>
                                  {service.price !== null && (
                                    <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                                      {formatCurrencyWhole(service.price)}
                                    </span>
                                  )}
                                  {!isQualified && (
                                    <span className="text-[10px] text-destructive">
                                      Not offered by {preSelectedStylistName.split(' ')[0]}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className={cn(
                                'w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                                isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'
                              )}>
                                {isSelected && <Check className="h-2.5 w-2.5" />}
                              </div>
                            </button>
                          );
                        })}
                      {/* Add-on search results */}
                      {addonLibrary
                        .filter(a => a.name.toLowerCase().includes(serviceSearch.toLowerCase()))
                        .map((addon) => {
                          const addonKey = `addon:${addon.id}`;
                          const isSelected = selectedServices.includes(addonKey);
                          return (
                            <button
                              key={addonKey}
                              className={cn(
                                'w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all',
                                isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/70'
                              )}
                              onClick={() => handleServiceToggle(addonKey)}
                            >
                              <div className="flex-1 min-w-0 mr-2">
                                <div className="flex items-center gap-1.5 font-medium text-sm truncate">
                                  <Sparkles className="h-3 w-3 text-accent-foreground shrink-0" />
                                  {addon.name}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {addon.duration_minutes && (
                                    <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                                      <Clock className="h-3 w-3" />+{addon.duration_minutes}m
                                    </span>
                                  )}
                                  <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                                    {formatCurrencyWhole(addon.price)}
                                  </span>
                                </div>
                              </div>
                              <div className={cn(
                                'w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                                isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'
                              )}>
                                {isSelected && <Check className="h-2.5 w-2.5" />}
                              </div>
                            </button>
                          );
                        })}
                      {services.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase())).length === 0 &&
                       addonLibrary.filter(a => a.name.toLowerCase().includes(serviceSearch.toLowerCase())).length === 0 && (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No services match "{serviceSearch}"
                        </div>
                      )}
                    </div>
                  ) : servicesByCategory && Object.keys(servicesByCategory).length > 0 ? (
                    <div className="space-y-1">
                      {Object.keys(servicesByCategory).map((category) => {
                        const catColor = getCategoryColor(category, categoryColors);
                        const isGradient = isGradientMarker(catColor.bg);
                        const gradient = isGradient ? getGradientFromMarker(catColor.bg) : null;
                        const selectedCount = (servicesByCategory[category] || []).filter(
                          s => selectedServices.includes(s.phorest_service_id)
                        ).length;
                        return (
                          <button
                            key={category}
                            className="w-full flex items-center gap-3 text-left transition-all -mx-3 w-[calc(100%+1.5rem)] px-4 py-3 hover:bg-muted/60"
                            onClick={() => setSelectedCategory(category)}
                          >
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                              style={{
                                background: gradient ? gradient.background : catColor.bg,
                                color: gradient ? gradient.textColor : catColor.text,
                              }}
                            >
                              {catColor.abbr}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-sm font-medium truncate">{category}</span>
                            </div>
                            {selectedCount > 0 && (
                              <span className="shrink-0 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                                {selectedCount} selected
                              </span>
                            )}
                          </button>
                        );
                      })}
                      {/* Virtual Add-Ons category */}
                      {addonLibrary.length > 0 && (
                        (() => {
                          const addonSelectedCount = selectedServices.filter(id => id.startsWith('addon:')).length;
                          return (
                            <button
                              key={ADDONS_CATEGORY}
                              className="w-full flex items-center gap-3 text-left transition-all -mx-3 w-[calc(100%+1.5rem)] px-4 py-3 hover:bg-muted/60"
                              onClick={() => setSelectedCategory(ADDONS_CATEGORY)}
                            >
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium shrink-0 bg-accent text-accent-foreground"
                              >
                                <Sparkles className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-sm font-medium truncate">Add-Ons & Extras</span>
                              </div>
                              {addonSelectedCount > 0 && (
                                <span className="shrink-0 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                                  {addonSelectedCount} selected
                                </span>
                              )}
                            </button>
                          );
                        })()
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 space-y-2">
                      <Scissors className="h-8 w-8 mx-auto text-muted-foreground/50" />
                      <p className="text-muted-foreground text-sm">No services synced yet</p>
                      <p className="text-xs text-muted-foreground/70">
                        Services will appear after syncing from Phorest
                      </p>
                    </div>
                  )}
                </>
              ) : selectedCategory === ADDONS_CATEGORY ? (
                <>
                  <div className="bg-muted -mx-3 px-3 py-1.5 mb-2">
                    <h4 className="text-[10px] font-medium text-muted-foreground font-display uppercase tracking-wider">
                      Add-Ons & Extras
                    </h4>
                  </div>
                  <div className="space-y-1">
                    {addonLibrary.map((addon) => {
                      const addonKey = `addon:${addon.id}`;
                      const isSelected = selectedServices.includes(addonKey);
                      return (
                        <button
                          key={addon.id}
                          className={cn(
                            'w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all',
                            isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/70'
                          )}
                          onClick={() => handleServiceToggle(addonKey)}
                        >
                          <div className="flex-1 min-w-0 mr-2">
                            <div className="font-medium text-sm truncate">{addon.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {addon.duration_minutes && (
                                <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                                  <Clock className="h-3 w-3" />+{addon.duration_minutes}m
                                </span>
                              )}
                              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                                {formatCurrencyWhole(addon.price)}
                              </span>
                            </div>
                          </div>
                          <div className={cn(
                            'w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                            isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'
                          )}>
                            {isSelected && <Check className="h-2.5 w-2.5" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-muted -mx-3 px-3 py-1.5 mb-2">
                    <h4 className="text-[10px] font-medium text-muted-foreground font-display uppercase tracking-wider">
                      {selectedCategory}
                    </h4>
                  </div>
                  <div className="space-y-1">
                    {servicesByCategory?.[selectedCategory]?.map((service) => {
                      const isSelected = selectedServices.includes(service.phorest_service_id);
                      const isQualified = isServiceQualifiedForPreSelected(service.phorest_service_id);
                      return (
                        <button
                          key={service.id}
                          className={cn(
                            'w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all',
                            isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/70',
                            !isQualified && !isSelected && 'opacity-40'
                          )}
                          onClick={() => handleServiceToggle(service.phorest_service_id)}
                        >
                          <div className="flex-1 min-w-0 mr-2">
                            <div className="font-medium text-sm truncate">{service.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                                <Clock className="h-3 w-3" />{service.duration_minutes}m
                              </span>
                              {service.price !== null && (
                                <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                                  {formatCurrencyWhole(service.price)}
                                </span>
                              )}
                              {!isQualified && (
                                <span className="text-[10px] text-destructive">
                                  Not offered by {preSelectedStylistName.split(' ')[0]}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={cn(
                            'w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                            isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'
                          )}>
                            {isSelected && <Check className="h-2.5 w-2.5" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-border bg-card">
            {/* Add-on toast — lives above the footer buttons */}
            <ServiceAddonToast
              visible={showAddonToast && addonSuggestions.length > 0}
              categoryName={selectedCategory || ''}
              suggestions={addonSuggestions}
              onAdd={(addonId) => {
                const addon = addonSuggestions.find(a => a.id === addonId);
                if (addon) {
                  // Try linked_service_id first, then fall back to name-matching
                  let matchedService = addon.linked_service_id
                    ? services.find(s => s.phorest_service_id === addon.linked_service_id)
                    : null;
                  if (!matchedService) {
                    matchedService = services.find(s => s.name === addon.name);
                  }
                  if (matchedService) {
                    handleServiceToggle(matchedService.phorest_service_id);
                  } else {
                    toast.warning(`Could not find matching service for "${addon.name}"`);
                  }
                  // Record add-on acceptance event
                  const effectiveStylistId = preSelectedStylistId || selectedStylist;
                  if (effectiveOrganization?.id && effectiveStylistId) {
                    supabase.from('booking_addon_events' as any).insert({
                      organization_id: effectiveOrganization.id,
                      staff_user_id: effectiveStylistId,
                      addon_id: addon.id,
                      addon_name: addon.name,
                      addon_price: addon.price,
                      addon_cost: addon.cost,
                      status: 'accepted',
                    });
                  }
                }
                if (addonSuggestions.length <= 1) {
                  setShowAddonToast(false);
                }
              }}
              onDismiss={() => {
                setShowAddonToast(false);
                if (selectedCategory) {
                  setDismissedAddonCategories(prev => new Set(prev).add(selectedCategory));
                }
                // Log dismissed suggestions for attachment rate tracking
                const effectiveStylistId = preSelectedStylistId || selectedStylist;
                if (effectiveOrganization?.id && effectiveStylistId && addonSuggestions.length > 0) {
                  const dismissEvents = addonSuggestions.map(addon => ({
                    organization_id: effectiveOrganization.id,
                    staff_user_id: effectiveStylistId,
                    addon_id: addon.id,
                    addon_name: addon.name,
                    addon_price: addon.price,
                    addon_cost: addon.cost,
                    status: 'dismissed',
                  }));
                  supabase.from('booking_addon_events' as any).insert(dismissEvents);
                }
              }}
            />

            <div className="p-3 space-y-2">
              {selectedServices.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="rounded-full text-xs px-2.5 py-0.5">
                        {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{totalDuration}m</span>
                    </div>
                    <span className="text-base font-medium">{formatCurrencyWhole(totalPrice)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedServiceDetails.map(s => (
                      <Badge key={s.id} variant="outline" className="text-xs font-normal px-2 py-0.5 pr-1 gap-1 cursor-pointer hover:bg-destructive/10 hover:border-destructive/30 transition-colors" onClick={() => setSelectedServices(prev => prev.filter(id => id !== s.phorest_service_id))}>
                        {s.name}
                        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </Badge>
                    ))}
                    {selectedAddonDetails.map(a => (
                      <Badge key={a.id} variant="outline" className="text-xs font-normal px-2 py-0.5 pr-1 gap-1 cursor-pointer hover:bg-destructive/10 hover:border-destructive/30 transition-colors border-accent" onClick={() => setSelectedServices(prev => prev.filter(id => id !== `addon:${a.id}`))}>
                        <Sparkles className="h-2.5 w-2.5 text-accent-foreground" />
                        {a.name}
                        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedCategory && selectedServices.length > 0 && (
                <Button
                  variant="ghost"
                  className="w-full h-9 text-xs text-muted-foreground border border-dashed border-border hover:bg-muted/50 hover:text-foreground"
                  onClick={() => setSelectedCategory(null)}
                >
                  + Add service from another category
                </Button>
              )}
              {!selectedCategory && (
                <Button
                  variant="outline"
                  className="w-full h-9 gap-2"
                  onClick={() => setShowBreakForm(true)}
                >
                  <Coffee className="h-4 w-4" />
                   Add Break / Block
                </Button>
              )}
              <Button className="w-full h-9" onClick={handleServicesComplete}>
                {selectedServices.length === 0 ? 'Skip Services' : 'Continue'}
              </Button>
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {/* Step: Location Selection */}
      {step === 'location' && (
        <div className={cn("flex flex-col", mode === 'panel' ? 'flex-1 min-h-0' : '')} style={mode === 'popover' ? { height: '550px' } : undefined}>
          <ScrollArea className="flex-1">
            <div className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Select Location</span>
              </div>
              <div className="space-y-1">
                {(stylistFirstMode && preSelectedStylistLocations.length > 0
                  ? preSelectedStylistLocations
                  : locations
                ).map((loc) => {
                  const isSelected = selectedLocation === loc.id;
                  return (
                    <button
                      key={loc.id}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg text-left transition-all',
                        isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/70'
                      )}
                      onClick={() => setSelectedLocation(loc.id)}
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="font-medium text-sm">{loc.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{[loc.address, loc.city].filter(Boolean).join(', ')}</div>
                      </div>
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                        isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'
                      )}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-border bg-card space-y-2">
            {selectedServices.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-full text-xs px-2.5 py-0.5">
                      {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{totalDuration}m</span>
                  </div>
                  <span className="text-base font-medium">{formatCurrencyWhole(totalPrice)}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedServiceDetails.map(s => (
                    <Badge key={s.id} variant="outline" className="text-xs font-normal px-2 py-0.5 pr-1 gap-1 cursor-pointer hover:bg-destructive/10 hover:border-destructive/30 transition-colors" onClick={() => setSelectedServices(prev => prev.filter(id => id !== s.phorest_service_id))}>
                      {s.name}
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <Button
              className="w-full h-9"
              disabled={!selectedLocation}
              onClick={() => {
                if (stylistFirstMode && preSelectedStylistId) {
                  navigateToStep('service');
                } else {
                  navigateToStep('client');
                }
              }}
            >
              Confirm location
            </Button>
          </div>
        </div>
      )}

      {/* Step: Stylist Selection */}
      {step === 'stylist' && (
        <div className={cn("flex flex-col", mode === 'panel' ? 'flex-1 min-h-0' : '')} style={mode === 'popover' ? { height: '550px' } : undefined}>
          <ScrollArea className="flex-1">
            <div className="p-4">
              {!stylistFirstMode && autoSelectReason === 'previous' && selectedClient && (
                <div className="flex items-center gap-2 p-2.5 mb-3 bg-accent/50 text-accent-foreground rounded-lg text-xs border border-accent">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>Auto-selected {selectedClient.name.split(' ')[0]}'s previous stylist</span>
                </div>
              )}
              {stylistFirstMode && (
                <div className="flex items-center gap-2 p-2.5 mb-3 bg-accent/50 text-accent-foreground rounded-lg text-xs border border-accent">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span>Select your stylist first — we'll filter locations and services for you</span>
                </div>
              )}
              <h4 className="text-sm font-display font-medium text-foreground uppercase tracking-wider mb-4">
                {stylistFirstMode ? 'All Stylists' : 'Available Stylists'}
                {!stylistFirstMode && qualificationData?.hasQualificationData && selectedServices.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    ({filteredStylists.length} qualified)
                  </span>
                )}
              </h4>
              <div className="flex flex-col gap-3">
                {(stylistFirstMode ? uniqueAllStylists : filteredStylists).map((stylist) => {
                  const fullName = stylist.employee_profiles?.display_name || stylist.employee_profiles?.full_name || 'Unknown';
                  const nameParts = fullName.split(' ');
                  const firstName = nameParts[0];
                  const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1].charAt(0) + '.' : '';
                  const displayName = `${firstName} ${lastInitial}`.trim();
                  const isSelected = stylistFirstMode 
                    ? preSelectedStylistId === stylist.user_id 
                    : selectedStylist === stylist.user_id;
                  const isPreviousStylist = selectedClient?.preferred_stylist_id === stylist.user_id;
                  const stylistLevelNum = getLevelNumber(stylist.employee_profiles?.stylist_level);
                  const stylistLevelSlug = getLevelSlug(stylist.employee_profiles?.stylist_level);
                  const stylistTotalPrice = !stylistFirstMode && stylistLevelSlug 
                    ? selectedServiceDetails.reduce((sum, service) => {
                        const levelPrice = getLevelPrice(service.id, stylistLevelSlug);
                        return sum + (levelPrice ?? service.price ?? 0);
                      }, 0)
                    : totalPrice;
                  
                  return (
                    <button
                      key={stylist.user_id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl transition-all text-left',
                        isSelected ? 'bg-primary/10 ring-2 ring-primary shadow-sm' : 'bg-muted/40 hover:bg-muted/70'
                      )}
                      onClick={() => {
                        if (stylistFirstMode) {
                          handleStylistFirstSelect(stylist);
                        } else {
                          setSelectedStylist(stylist.user_id);
                        }
                      }}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-12 w-12 ring-2 ring-background shadow-md">
                          <AvatarImage src={stylist.employee_profiles?.photo_url || undefined} />
                          <AvatarFallback className="bg-muted text-sm font-medium">
                            {fullName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {isSelected && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-success flex items-center justify-center ring-2 ring-success-foreground/50">
                            <Check className="h-3 w-3 text-success-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground truncate">{displayName}</span>
                          {!stylistFirstMode && isPreviousStylist && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-normal bg-accent/50 text-accent-foreground border-accent shrink-0">
                              Previously Seen
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pr-2 justify-end">
                        {stylistLevelNum && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal whitespace-nowrap">
                            Level {stylistLevelNum}
                          </Badge>
                        )}
                        {!stylistFirstMode && selectedServices.length > 0 && (
                          <span className="text-sm font-medium text-foreground tabular-nums min-w-[70px] text-right">
                            {formatCurrency(stylistTotalPrice)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-border bg-card space-y-2">
            {!stylistFirstMode && selectedServices.length > 0 && selectedStylist && selectedLevelNumber && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-full text-xs px-2.5 py-0.5">
                      {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{totalDuration}m</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-medium">{formatCurrencyWhole(levelBasedTotalPrice)}</span>
                    <span className="text-sm text-muted-foreground ml-1.5">• Level {selectedLevelNumber}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedServiceDetails.map(s => (
                    <Badge key={s.id} variant="outline" className="text-xs font-normal px-2 py-0.5 pr-1 gap-1 cursor-pointer hover:bg-destructive/10 hover:border-destructive/30 transition-colors" onClick={() => setSelectedServices(prev => prev.filter(id => id !== s.phorest_service_id))}>
                      {s.name}
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <Button
              className="w-full h-10"
              disabled={stylistFirstMode ? !preSelectedStylistId : !selectedStylist}
              onClick={() => {
                if (stylistFirstMode) {
                  handleStylistFirstContinue();
                } else {
                  navigateToStep('confirm');
                }
              }}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step: Confirmation */}
      {step === 'confirm' && (
        <div className={cn("flex flex-col", mode === 'panel' ? 'flex-1 min-h-0' : '')} style={mode === 'popover' ? { height: '550px' } : undefined}>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {selectedClient?.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">{selectedClient?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedClient?.phone || selectedClient?.email}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg divide-y divide-border">
                <div className="flex items-center gap-2.5 p-2.5">
                  <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Location</div>
                    <div className="font-medium text-xs">{locations.find(l => l.id === selectedLocation)?.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5">
                  <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                    <CalendarPlus className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Date & Time</div>
                    <div className="font-medium text-xs">{formatDateLocale(date, 'EEE, MMM d')} at {formatTime12h(time)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5">
                  <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Duration</div>
                    <div className="font-medium text-xs">{totalDuration} minutes</div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-medium text-muted-foreground font-display uppercase tracking-wider mb-1.5">Services</h4>
                <div className="bg-card border border-border rounded-lg divide-y divide-border">
                  {selectedServiceDetails.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                          <Scissors className="h-3 w-3 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-xs">{service.name}</div>
                          <div className="text-[10px] text-muted-foreground">{service.duration_minutes}m</div>
                        </div>
                      </div>
                      {service.price !== null && (
                        <span className="font-medium text-xs">{formatCurrencyWhole(service.price)}</span>
                      )}
                    </div>
                  ))}
                  {selectedAddonDetails.map((addon) => (
                    <div key={addon.id} className="flex items-center justify-between p-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-accent/30 flex items-center justify-center">
                          <Sparkles className="h-3 w-3 text-accent-foreground" />
                        </div>
                        <div>
                          <div className="font-medium text-xs">{addon.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {addon.duration_minutes ? `+${addon.duration_minutes}m` : 'Add-on'}
                          </div>
                        </div>
                      </div>
                      <span className="font-medium text-xs">{formatCurrencyWhole(addon.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-medium text-muted-foreground font-display uppercase tracking-wider mb-1.5">Stylist</h4>
                <div className="bg-card border border-border rounded-lg p-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={
                        preSelectedStylistPhoto || 
                        stylists.find(s => s.user_id === selectedStylist)?.employee_profiles?.photo_url || 
                        undefined
                      } />
                      <AvatarFallback className="bg-muted text-xs">
                        {getStylistName().slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{getStylistName()}</span>
                  </div>
                </div>
              </div>
              {/* Estimated Product Cost (parts_and_labor services) */}
              {estimatedProductCharge?.isEnabled && (
                <div>
                  <h4 className="text-[10px] font-medium text-muted-foreground font-display uppercase tracking-wider mb-1.5">
                    Estimated Product Cost
                  </h4>
                  <div className="bg-card border border-border rounded-lg divide-y divide-border">
                    {estimatedProductCharge.serviceBreakdown.map((est) => (
                      <div key={est.serviceId} className="flex items-center justify-between p-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-medium text-xs">{est.serviceName}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {est.hasBaselines
                                ? `${est.markupPct.toFixed(0)}% markup`
                                : 'Estimate unavailable'}
                            </div>
                          </div>
                        </div>
                        {est.hasBaselines ? (
                          <span className="font-medium text-xs tabular-nums">
                            {formatCurrencyWhole(est.chargeAmount)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">
                            Fee applies
                          </span>
                        )}
                      </div>
                    ))}
                    {estimatedProductCharge.totalEstimatedCharge > 0 && (
                      <div className="flex items-center justify-between p-2.5 text-xs">
                        <span className="text-muted-foreground">Est. Product Total</span>
                        <span className="font-medium tabular-nums">
                          {formatCurrencyWhole(estimatedProductCharge.totalEstimatedCharge)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Redo / Adjustment Section */}
              <div className="bg-card border border-border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label className="text-xs font-medium cursor-pointer" htmlFor="redo-toggle">
                      Redo / Adjustment
                    </Label>
                  </div>
                  <Switch
                    id="redo-toggle"
                    checked={isRedo}
                    onCheckedChange={(checked) => {
                      setIsRedo(checked);
                      if (!checked) {
                        setOriginalAppointmentId(null);
                        setOriginalAppointmentData(null);
                        setRedoPriceOverride(null);
                      }
                    }}
                    className="scale-90"
                  />
                </div>
                {isRedo && (
                  <div className="space-y-2.5 pt-1">
                    {/* Reason */}
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">
                        Reason {redoPolicy?.redo_reason_required && <span className="text-destructive">*</span>}
                      </Label>
                      <Select value={redoReason} onValueChange={setRedoReason}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select reason..." />
                        </SelectTrigger>
                        <SelectContent>
                          {REDO_REASONS.map(r => (
                            <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {redoReason === 'Other' && (
                        <Input
                          placeholder="Describe the reason..."
                          value={redoCustomReason}
                          onChange={(e) => setRedoCustomReason(e.target.value)}
                          className="h-8 text-xs"
                        />
                      )}
                    </div>

                    {/* Original Appointment Picker */}
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">
                        Original Appointment
                      </Label>
                      {!selectedClient ? (
                        <p className="text-[10px] text-muted-foreground italic">Select a client first</p>
                      ) : clientRecentAppointments.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground italic">No recent appointments found within redo window</p>
                      ) : (
                        <div className="space-y-1 max-h-[120px] overflow-y-auto">
                          {clientRecentAppointments.map((apt) => {
                            const isSelected = originalAppointmentId === apt.id;
                            return (
                              <button
                                key={apt.id}
                                type="button"
                                className={cn(
                                  'w-full flex items-center justify-between p-2 rounded-md text-left text-xs transition-all',
                                  isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/70 bg-muted/30'
                                )}
                                onClick={() => {
                                  setOriginalAppointmentId(apt.id);
                                  setOriginalAppointmentData(apt);
                                }}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium truncate">{apt.service_name || 'Service'}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {apt.appointment_date} · {apt.staff_name || 'Unknown'}
                                  </div>
                                </div>
                                {apt.total_price != null && (
                                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                    {formatCurrencyWhole(apt.total_price)}
                                  </span>
                                )}
                                {isSelected && <Check className="h-3 w-3 text-primary shrink-0 ml-1" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Computed redo pricing */}
                    {(() => {
                      const origPrice = originalAppointmentData?.total_price;
                      let computedRedoPrice: number | null = null;
                      if (origPrice != null && redoPolicy) {
                        if (redoPolicy.redo_pricing_policy === 'free') computedRedoPrice = 0;
                        else if (redoPolicy.redo_pricing_policy === 'percentage') computedRedoPrice = origPrice * (redoPolicy.redo_pricing_percentage / 100);
                        else computedRedoPrice = origPrice;
                      }
                      const displayPrice = redoPriceOverride ?? computedRedoPrice;
                      return (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Redo pricing</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {redoPolicy?.redo_pricing_policy === 'free' && 'Complimentary'}
                              {redoPolicy?.redo_pricing_policy === 'percentage' && `${redoPolicy.redo_pricing_percentage}% of original`}
                              {redoPolicy?.redo_pricing_policy === 'full_price' && 'Full price'}
                            </Badge>
                            {displayPrice != null && (
                              <span className="font-medium tabular-nums">{formatCurrencyWhole(displayPrice)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Manager override */}
                    {isManagerOrAdmin && (
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">
                          Price Override (optional)
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Leave empty to use policy"
                          value={redoPriceOverride ?? ''}
                          onChange={(e) => setRedoPriceOverride(e.target.value ? parseFloat(e.target.value) : null)}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}

                    {/* Approval warning */}
                    {redoPolicy?.redo_requires_approval && !isManagerOrAdmin && (
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>This redo will require manager approval before confirming.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                {!showNotes ? (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowNotes(true)}
                  >
                    + Add special notes
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-medium text-muted-foreground font-display uppercase tracking-wider">Notes</h4>
                    <Textarea
                      placeholder="Special instructions, pricing notes, promo codes..."
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      className="min-h-[60px] text-xs resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Request Assistant Coverage toggle */}
              <div className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label htmlFor="request-assistant" className="text-xs cursor-pointer">Request Assistant Coverage</Label>
                      {requestAssistant && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          An assistant time block will be created for this appointment's duration.
                        </p>
                      )}
                    </div>
                  </div>
                  <Switch
                    id="request-assistant"
                    checked={requestAssistant}
                    onCheckedChange={setRequestAssistant}
                  />
                </div>
                {requestAssistant && <AssistantAvailabilityNote locationId={selectedLocation} date={date} />}
              </div>
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-border bg-card space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              {(() => {
                if (!isRedo) return <span className="text-lg font-medium">{formatCurrency(totalPrice)}</span>;
                // Calculate redo-adjusted price
                const origPrice = originalAppointmentData?.total_price;
                let computedRedoPrice: number | null = null;
                if (origPrice != null && redoPolicy) {
                  if (redoPolicy.redo_pricing_policy === 'free') computedRedoPrice = 0;
                  else if (redoPolicy.redo_pricing_policy === 'percentage') computedRedoPrice = origPrice * (redoPolicy.redo_pricing_percentage / 100);
                  else computedRedoPrice = origPrice;
                }
                const finalPrice = redoPriceOverride ?? computedRedoPrice ?? totalPrice;
                return (
                  <div className="flex items-center gap-2">
                    {finalPrice !== totalPrice && (
                      <span className="text-sm text-muted-foreground line-through">{formatCurrency(totalPrice)}</span>
                    )}
                    <span className="text-lg font-medium text-amber-600 dark:text-amber-400">{formatCurrency(finalPrice)}</span>
                  </div>
                );
              })()}
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground/70">
                Any discounts or promotions will be calculated at checkout.
              </p>
              <div className="flex items-center gap-1">
                <p className="text-[10px] text-muted-foreground/70">
                  Exact price may vary after overages & adjustments.
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground/50 cursor-help hover:text-muted-foreground transition-colors shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    <p>Price may change due to product overages, timing adjustments, or additional services added during the appointment.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="flex-1 h-10 gap-2"
                disabled={saveDraft.isPending || createBooking.isPending}
                onClick={() => {
                  if (!effectiveOrganization?.id) return;
                  const serviceDetails = services
                    .filter(s => selectedServices.filter(id => !id.startsWith('addon:')).includes(s.phorest_service_id))
                    .map(s => ({ id: s.phorest_service_id, name: s.name }));
                  const addonDetails = selectedAddonDetails.map(a => ({ id: `addon:${a.id}`, name: a.name }));
                  saveDraft.mutate({
                    id: draftId || undefined,
                    organization_id: effectiveOrganization.id,
                    location_id: selectedLocation || undefined,
                    appointment_date: format(date, 'yyyy-MM-dd'),
                    start_time: time,
                    client_id: selectedClient?.id || null,
                    client_name: selectedClient?.name || null,
                    staff_user_id: selectedStylist || null,
                    staff_name: selectedStylistData?.employee_profiles?.display_name || selectedStylistData?.employee_profiles?.full_name || null,
                    selected_services: [...serviceDetails, ...addonDetails],
                    notes: bookingNotes || undefined,
                    step_reached: step,
                    is_redo: isRedo,
                    redo_metadata: isRedo ? { reason: redoReason, originalAppointmentId } : undefined,
                  }, {
                    onSuccess: () => {
                      toast.success('Draft saved', {
                        description: `${selectedClient?.name || 'No client'} · ${selectedServices.length} service(s)`,
                      });
                      handleClose(true);
                    },
                  });
                }}
              >
                {saveDraft.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Save for Later
              </Button>
              <Button
                className="flex-1 h-10 font-medium"
                disabled={!canBook || createBooking.isPending}
                onClick={() => createBooking.mutate()}
              >
                {createBooking.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  'Confirm Booking'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ─── Dialogs shared by both modes ─────────────────────────────
  const dialogs = (
    <>
      <NewClientDialog
        open={showNewClientDialog}
        onOpenChange={setShowNewClientDialog}
        defaultLocationId={selectedLocation}
        onClientCreated={(client) => {
          handleSelectClient({
            id: client.id,
            phorest_client_id: client.phorest_client_id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            preferred_stylist_id: null,
          });
          setShowNewClientDialog(false);
        }}
      />
      <BannedClientWarningDialog
        open={!!pendingBannedClient}
        onOpenChange={(open) => !open && setPendingBannedClient(null)}
        clientName={pendingBannedClient?.name || ''}
        banReason={pendingBannedClient?.ban_reason}
        onProceed={handleProceedWithBannedClient}
        onCancel={() => setPendingBannedClient(null)}
      />
    </>
  );

  // ─── Panel mode (floating bento card) ─────────────────────────
  if (mode === 'panel') {
    return (
      <>
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
                style={{ top: godModeOffset }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => handleClose()}
                aria-hidden="true"
              />
              <motion.div
                className="fixed z-50 right-3 bottom-3 w-full sm:max-w-md rounded-xl bg-card/80 backdrop-blur-xl border border-border shadow-2xl flex flex-col overflow-hidden"
                style={{ top: godModeOffset + 12 }}
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              >
                {innerContent}
              </motion.div>
            </>
          )}
        </AnimatePresence>
        {dialogs}
      </>
    );
  }

  // ─── Popover mode (centered modal — original) ─────────────────
  return (
    <>
      {open && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        />
      )}
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          {children}
        </PopoverTrigger>
      </Popover>
      {open && (
        <div 
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[440px] p-0 shadow-xl border border-border rounded-xl overflow-hidden bg-popover animate-enter"
        >
          {innerContent}
        </div>
      )}
      {dialogs}
    </>
  );
}
