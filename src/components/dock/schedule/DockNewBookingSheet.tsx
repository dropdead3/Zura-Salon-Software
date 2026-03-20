/**
 * DockNewBookingSheet — Mobile-first booking wizard for Dock schedule.
 * 3-step flow: Client → Service → Confirm
 * Pre-selects the logged-in staff member as stylist.
 */

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

import {
  ArrowLeft, X, Search, UserPlus, Clock, Check, Loader2,
  Calendar as CalendarIcon, Scissors, User, MapPin, StickyNote,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useServicesByCategory, type PhorestService } from '@/hooks/usePhorestServices';
import { useLocations } from '@/hooks/useLocations';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DockStaffSession } from '@/pages/Dock';

interface DockNewBookingSheetProps {
  open: boolean;
  onClose: () => void;
  staff: DockStaffSession;
}

interface PhorestClient {
  id: string;
  phorest_client_id: string;
  name: string;
  email: string | null;
  phone: string | null;
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

export function DockNewBookingSheet({ open, onClose, staff }: DockNewBookingSheetProps) {
  const queryClient = useQueryClient();

  // Wizard state
  const [step, setStep] = useState<Step>('client');
  const [selectedClient, setSelectedClient] = useState<PhorestClient | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [notes, setNotes] = useState('');

  // Data
  const { data: locations = [] } = useLocations();
  const { data: servicesByCategory, services = [], isLoading: isLoadingServices } = useServicesByCategory(selectedLocation || undefined);

  // Auto-select location from staff profile
  const { data: staffProfile } = useQuery({
    queryKey: ['dock-staff-profile', staff.userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_profiles')
        .select('location_id, location_ids, organization_id')
        .eq('user_id', staff.userId)
        .single();
      return data;
    },
  });

  // Set default location on load
  useState(() => {
    if (staffProfile?.location_id && !selectedLocation) {
      setSelectedLocation(staffProfile.location_id);
    }
  });

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
  });

  // Client search
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['dock-booking-clients', clientSearch],
    queryFn: async () => {
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
    () => services.filter(s => selectedServices.includes(s.phorest_service_id)),
    [services, selectedServices],
  );
  const totalDuration = selectedServiceDetails.reduce((s, v) => s + v.duration_minutes, 0);
  const totalPrice = selectedServiceDetails.reduce((s, v) => s + (v.price || 0), 0);

  // Create booking
  const createBooking = useMutation({
    mutationFn: async () => {
      if (!selectedClient) throw new Error('No client selected');
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
      toast.success('Appointment booked');
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
    onClose();
  };

  const handleBack = () => {
    if (step === 'service') setStep('client');
    else if (step === 'confirm') setStep('service');
  };

  const stepTitle = step === 'client' ? 'Select Client' : step === 'service' ? 'Choose Services' : 'Confirm Booking';

  // Auto-set location when profile loads
  if (staffProfile?.location_id && !selectedLocation) {
    setSelectedLocation(staffProfile.location_id);
  }

  return createPortal(
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            key="dock-booking-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING}
            className="fixed inset-x-0 bottom-0 z-[61] flex flex-col bg-[hsl(var(--platform-bg))] border-t border-[hsl(var(--platform-border))] rounded-t-2xl"
            style={{ maxHeight: '92vh' }}
          >
            {/* Drag handle */}
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-[hsl(var(--platform-foreground-muted)/0.3)] shrink-0" />

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
                <ClientStepDock
                  clients={clients}
                  isLoading={isLoadingClients}
                  searchQuery={clientSearch}
                  onSearchChange={setClientSearch}
                  onSelectClient={(c) => {
                    setSelectedClient(c);
                    setStep('service');
                  }}
                />
              )}

              {step === 'service' && (
                <ServiceStepDock
                  locations={locations}
                  selectedLocation={selectedLocation}
                  onLocationChange={setSelectedLocation}
                  servicesByCategory={servicesByCategory}
                  allServices={services}
                  selectedServices={selectedServices}
                  onToggleService={(id) => {
                    setSelectedServices(prev =>
                      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id],
                    );
                  }}
                  totalDuration={totalDuration}
                  totalPrice={totalPrice}
                  isLoading={isLoadingServices}
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
    </AnimatePresence>,
    document.body,
  );
}

/* ─── Client Step ─── */
function ClientStepDock({
  clients,
  isLoading,
  searchQuery,
  onSearchChange,
  onSelectClient,
}: {
  clients: PhorestClient[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectClient: (c: PhorestClient) => void;
}) {
  return (
    <div className="px-5 pb-6">
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--platform-foreground-muted))]" />
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-[hsl(var(--platform-foreground)/0.06)] border border-[hsl(var(--platform-border))] text-sm text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-muted)/0.5)] focus:outline-none focus:ring-1 focus:ring-violet-500/50"
        />
      </div>

      {/* Results */}
      {searchQuery.length < 2 ? (
        <p className="text-center text-sm text-[hsl(var(--platform-foreground-muted))] py-12">
          Type at least 2 characters to search
        </p>
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
        </div>
      ) : clients.length === 0 ? (
        <p className="text-center text-sm text-[hsl(var(--platform-foreground-muted))] py-12">
          No clients found
        </p>
      ) : (
        <div className="space-y-1">
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectClient(c)}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-[hsl(var(--platform-foreground)/0.06)] active:bg-[hsl(var(--platform-foreground)/0.1)] transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-violet-600/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-violet-400">{getInitials(c.name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[hsl(var(--platform-foreground))] truncate">{c.name}</div>
                <div className="text-xs text-[hsl(var(--platform-foreground-muted))] truncate">
                  {c.phone || c.email || 'No contact info'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Service Step ─── */
function ServiceStepDock({
  locations,
  selectedLocation,
  onLocationChange,
  servicesByCategory,
  allServices,
  selectedServices,
  onToggleService,
  totalDuration,
  totalPrice,
  isLoading,
  onContinue,
}: {
  locations: { id: string; name: string }[];
  selectedLocation: string;
  onLocationChange: (id: string) => void;
  servicesByCategory: Record<string, PhorestService[]> | undefined;
  allServices: PhorestService[];
  selectedServices: string[];
  onToggleService: (id: string) => void;
  totalDuration: number;
  totalPrice: number;
  isLoading: boolean;
  onContinue: () => void;
}) {
  const hasServices = servicesByCategory && Object.keys(servicesByCategory).length > 0;

  return (
    <div className="flex flex-col">
      {/* Location selector */}
      {locations.length > 1 && (
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-3.5 w-3.5 text-[hsl(var(--platform-foreground-muted))]" />
            <span className="text-xs text-[hsl(var(--platform-foreground-muted))]">Location</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {locations.map(l => (
              <button
                key={l.id}
                onClick={() => onLocationChange(l.id)}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  selectedLocation === l.id
                    ? 'bg-violet-600 text-white'
                    : 'bg-[hsl(var(--platform-foreground)/0.06)] text-[hsl(var(--platform-foreground-muted))] hover:bg-[hsl(var(--platform-foreground)/0.1)]',
                )}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Services */}
      <div className="px-5 pb-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
          </div>
        ) : !hasServices ? (
          <p className="text-center text-sm text-[hsl(var(--platform-foreground-muted))] py-8">
            {selectedLocation ? 'No services available' : 'Select a location'}
          </p>
        ) : (
          Object.entries(servicesByCategory).map(([category, svc]) => (
            <div key={category}>
              <div className="text-[10px] font-display tracking-wider uppercase text-[hsl(var(--platform-foreground-muted)/0.6)] mb-2">
                {category}
              </div>
              <div className="space-y-1">
                {svc.map((s) => {
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
                          <span className="text-xs text-[hsl(var(--platform-foreground-muted))]">
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
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 px-5 py-4 border-t border-[hsl(var(--platform-border))] bg-[hsl(var(--platform-bg))]">
        {selectedServices.length > 0 && (
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-[hsl(var(--platform-foreground-muted))]">
              {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} · {totalDuration}m
            </span>
            <span className="text-[hsl(var(--platform-foreground))] font-medium">${totalPrice}</span>
          </div>
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
            className="w-full rounded-xl bg-[hsl(var(--platform-foreground)/0.06)] border border-[hsl(var(--platform-border))] text-sm text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-muted)/0.4)] p-3 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50"
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
