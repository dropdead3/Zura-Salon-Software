import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { format, addDays } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  User, 
  Clock, 
  DollarSign,
  Check,
  Loader2,
  Calendar as CalendarIcon,
  Plus,
  UserPlus
} from 'lucide-react';
import { NewClientDialog } from './NewClientDialog';
import { cn, formatDisplayName } from '@/lib/utils';
import { toast } from 'sonner';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useServicesByCategory } from '@/hooks/usePhorestServices';
import { usePhorestAvailability } from '@/hooks/usePhorestAvailability';
import { useLocations } from '@/hooks/useLocations';
import { useServicePrompts } from '@/hooks/useServicePrompts';

interface NewBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  defaultStylistId?: string;
  defaultTime?: string;
}

type Step = 'client' | 'service' | 'datetime' | 'confirm';

interface PhorestClient {
  id: string;
  phorest_client_id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export function NewBookingSheet({
  open,
  onOpenChange,
  defaultDate,
  defaultStylistId,
  defaultTime,
}: NewBookingSheetProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('client');
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  
  // Form state
  const [selectedClient, setSelectedClient] = useState<PhorestClient | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedStylist, setSelectedStylist] = useState(defaultStylistId || '');
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate || new Date());
  const [selectedTime, setSelectedTime] = useState(defaultTime || '');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [notes, setNotes] = useState('');

  const { formatCurrency, formatCurrencyWhole } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const { data: locations = [] } = useLocations();
  const { data: servicesByCategory, services = [] } = useServicesByCategory(selectedLocation || undefined);
  const checkAvailability = usePhorestAvailability();

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['phorest-clients', clientSearch],
    queryFn: async () => {
      let query = supabase
        .from('v_all_clients' as any)
        .select('id, phorest_client_id, name, email, phone')
        .order('name')
        .limit(20);
      
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
  });

  // Fetch stylists
  const { data: stylists = [] } = useQuery({
    queryKey: ['booking-stylists'],
    queryFn: async () => {
      const { data } = await supabase
        .from('v_all_staff' as any)
        .select('phorest_staff_id, user_id, display_name, full_name, photo_url')
        .eq('is_active', true);
      return ((data as any[]) || []).map((s: any) => ({
        ...s,
        employee_profiles: {
          display_name: s.display_name,
          full_name: s.full_name,
          photo_url: s.photo_url,
        },
      }));
    },
  });

  // Calculate totals
  const selectedServiceDetails = useMemo(() => {
    return services.filter(s => selectedServices.includes(s.phorest_service_id));
  }, [services, selectedServices]);

  const totalDuration = useMemo(() => {
    return selectedServiceDetails.reduce((sum, s) => sum + s.duration_minutes, 0);
  }, [selectedServiceDetails]);

  const totalPrice = useMemo(() => {
    return selectedServiceDetails.reduce((sum, s) => sum + (s.price || 0), 0);
  }, [selectedServiceDetails]);

  // Check availability when stylist and date are selected
  const [availableSlots, setAvailableSlots] = useState<{ start_time: string; end_time: string }[]>([]);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  const handleCheckAvailability = async () => {
    if (!selectedStylist || !selectedDate || selectedServices.length === 0) return;
    
    const stylistMapping = stylists.find(s => s.user_id === selectedStylist);
    if (!stylistMapping) return;

    setIsCheckingAvailability(true);
    try {
      const slots = await checkAvailability.mutateAsync({
        branchId: selectedLocation,
        staffId: stylistMapping.phorest_staff_id,
        serviceIds: selectedServices,
        date: format(selectedDate, 'yyyy-MM-dd'),
      });
      setAvailableSlots(slots);
    } catch (error) {
      toast.error('Failed to check availability');
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  // Create booking mutation
  const createBooking = useMutation({
    mutationFn: async () => {
      const stylistMapping = stylists.find(s => s.user_id === selectedStylist);
      if (!stylistMapping || !selectedClient) throw new Error('Missing required data');

      const startDateTime = `${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}:00Z`;

      const response = await supabase.functions.invoke('create-phorest-booking', {
        body: {
          branch_id: undefined,
          location_id: selectedLocation,
          client_id: selectedClient.phorest_client_id || selectedClient.id,
          staff_id: stylistMapping.phorest_staff_id || undefined,
          staff_user_id: selectedStylist,
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
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      toast.success('Booking created successfully!');
      handleClose();
    },
    onError: (error: Error) => {
      toast.error('Failed to create booking', { description: error.message });
    },
  });

  const handleClose = () => {
    setStep('client');
    setSelectedClient(null);
    setClientSearch('');
    setSelectedServices([]);
    setSelectedStylist(defaultStylistId || '');
    setSelectedDate(defaultDate || new Date());
    setSelectedTime('');
    setNotes('');
    setAvailableSlots([]);
    onOpenChange(false);
  };

  const canProceed = () => {
    switch (step) {
      case 'client': return !!selectedClient;
      case 'service': return selectedServices.length > 0;
      case 'datetime': return !!selectedStylist && !!selectedDate && !!selectedTime;
      case 'confirm': return true;
      default: return false;
    }
  };

  const handleNext = () => {
    switch (step) {
      case 'client': setStep('service'); break;
      case 'service': setStep('datetime'); break;
      case 'datetime': setStep('confirm'); break;
      case 'confirm': createBooking.mutate(); break;
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'service': setStep('client'); break;
      case 'datetime': setStep('service'); break;
      case 'confirm': setStep('datetime'); break;
    }
  };

  const formatTime12h = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <PremiumFloatingPanel open={open} onOpenChange={handleClose} maxWidth="520px">
      <div className="p-5 pb-4 border-b border-border/40">
        <h2 className="font-display text-sm tracking-wide uppercase">New Booking</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {step === 'client' && 'Select or search for a client'}
          {step === 'service' && 'Choose services for this appointment'}
          {step === 'datetime' && 'Pick a stylist, date, and time'}
          {step === 'confirm' && 'Review and confirm the booking'}
        </p>
        
        {/* Step Indicators */}
        <div className="flex items-center gap-2 mt-4">
          {(['client', 'service', 'datetime', 'confirm'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                step === s ? 'bg-primary text-primary-foreground' :
                (['client', 'service', 'datetime', 'confirm'].indexOf(step) > i) ? 'bg-primary/20 text-primary' :
                'bg-muted text-muted-foreground'
              )}>
                {i + 1}
              </div>
              {i < 3 && <div className="w-8 h-0.5 bg-muted mx-1" />}
            </div>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        {/* Step 1: Client Selection */}
        {step === 'client' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or email..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setShowNewClientDialog(true)}
                title="Add new client"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-primary hover:text-primary hover:bg-primary/5"
              onClick={() => setShowNewClientDialog(true)}
            >
              <Plus className="h-4 w-4" />
              Add New Client
            </Button>

            <div className="space-y-2">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className={cn(
                    'p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedClient?.id === client.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  )}
                  onClick={() => setSelectedClient(client)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{client.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {client.phone || client.email || 'No contact info'}
                        </div>
                      </div>
                    </div>
                    {selectedClient?.id === client.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
              ))}

              {clients.length === 0 && clientSearch && (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No clients found</p>
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={() => setShowNewClientDialog(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Create this client
                  </Button>
                </div>
              )}
            </div>

            <NewClientDialog
              open={showNewClientDialog}
              onOpenChange={setShowNewClientDialog}
              defaultLocationId={selectedLocation}
              onClientCreated={(client) => {
                setSelectedClient({
                  id: client.id,
                  phorest_client_id: client.phorest_client_id,
                  name: client.name,
                  email: client.email,
                  phone: client.phone,
                });
              }}
            />
          </div>
        )}

        {/* Step 2: Service Selection */}
        {step === 'service' && (
          <div className="space-y-4">
            <div>
              <Label>Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLocation && servicesByCategory && Object.entries(servicesByCategory).map(([category, categoryServices]) => (
              <div key={category}>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">{category}</h4>
                <div className="space-y-2">
                  {categoryServices.map((service) => (
                    <div
                      key={service.id}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-colors',
                        selectedServices.includes(service.phorest_service_id)
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      )}
                      onClick={() => {
                        setSelectedServices(prev =>
                          prev.includes(service.phorest_service_id)
                            ? prev.filter(id => id !== service.phorest_service_id)
                            : [...prev, service.phorest_service_id]
                        );
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{service.name}</div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {service.duration_minutes} min
                            </span>
                            {service.price && (
                              <span className="flex items-center gap-1">
                                {formatCurrency(service.price)}
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedServices.includes(service.phorest_service_id) && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {selectedServices.length > 0 && (
              <div className="p-3 bg-muted/50 rounded-lg mt-4">
                <div className="flex justify-between text-sm">
                  <span>Total Duration:</span>
                  <span className="font-medium">{totalDuration} min</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Estimated Total:</span>
                  <span className="font-medium">{formatCurrencyWhole(totalPrice)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Date/Time Selection */}
        {step === 'datetime' && (
          <div className="space-y-4">
            <div>
              <Label>Stylist</Label>
              <Select value={selectedStylist} onValueChange={(val) => { setSelectedStylist(val); setAvailableSlots([]); setSelectedTime(''); }}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select a stylist" />
                </SelectTrigger>
                <SelectContent>
                  {stylists.map((s: any) => (
                    <SelectItem key={s.user_id} value={s.user_id}>
                      {formatDisplayName(s.employee_profiles?.full_name || '', s.employee_profiles?.display_name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date</Label>
              <div className="mt-1.5 border rounded-lg p-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => { if (date) { setSelectedDate(date); setAvailableSlots([]); setSelectedTime(''); } }}
                  disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                />
              </div>
            </div>

            <Button 
              onClick={handleCheckAvailability}
              disabled={!selectedStylist || isCheckingAvailability}
              variant="outline"
              className="w-full"
            >
              {isCheckingAvailability ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking...</>
              ) : (
                'Check Availability'
              )}
            </Button>

            {availableSlots.length > 0 && (
              <div className="space-y-2">
                <Label>Available Times</Label>
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.start_time}
                      variant={selectedTime === slot.start_time ? 'default' : 'outline'}
                      className="text-sm"
                      onClick={() => setSelectedTime(slot.start_time)}
                    >
                      {formatTime12h(slot.start_time)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {availableSlots.length === 0 && !isCheckingAvailability && selectedStylist && (
              <div>
                <Label>Manual Time</Label>
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{selectedClient?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedClient?.email || selectedClient?.phone}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Services</h4>
                {selectedServiceDetails.map((service) => (
                  <div key={service.id} className="flex justify-between text-sm py-1">
                    <span>{service.name}</span>
                    <span>{formatCurrency(service.price || 0)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{formatDate(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                  <p className="text-sm text-muted-foreground">at {selectedTime ? formatTime12h(selectedTime) : 'TBD'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <p className="font-medium">{formatCurrencyWhole(totalPrice)} estimated</p>
              </div>
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for this appointment..."
                className="mt-1.5"
              />
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-5 pt-0 border-t border-border/40 flex justify-between gap-3 mt-auto">
        {step !== 'client' ? (
          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        ) : (
          <div />
        )}
        <Button
          onClick={handleNext}
          disabled={!canProceed() || createBooking.isPending}
        >
          {createBooking.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
          ) : step === 'confirm' ? (
            'Confirm Booking'
          ) : (
            <>Next <ChevronRight className="h-4 w-4 ml-1" /></>
          )}
        </Button>
      </div>
    </PremiumFloatingPanel>
  );
}
