import { useState, useMemo } from 'react';
import { format, addWeeks, getDay, addMinutes, parse } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Calendar as CalendarIcon, Clock, User, MapPin, Repeat, AlertCircle, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useSalonServices, useCreateAssistantRequest, RecurrenceType } from '@/hooks/useAssistantRequests';
import { useActiveLocations } from '@/hooks/useLocations';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useActiveAssistants, useLocationsWithAssistants, useAssistantsAtLocation } from '@/hooks/useAssistantAvailability';
import { useStylistPhorestAppointments } from '@/hooks/usePhorestSync';
import { useAuth } from '@/contexts/AuthContext';

interface RequestAssistantDialogProps {
  children: React.ReactNode;
}

const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function RequestAssistantDialog({ children }: RequestAssistantDialogProps) {
  const { formatDate } = useFormatDate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [serviceId, setServiceId] = useState('');
  const [clientName, setClientName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [notes, setNotes] = useState('');
  const [locationId, setLocationId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('weekly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date>();

  const { data: services = [], isLoading: servicesLoading } = useSalonServices();
  const { data: allLocations = [] } = useActiveLocations();
  const { data: profile } = useEmployeeProfile();
  const { data: assistants = [] } = useActiveAssistants();
  const createRequest = useCreateAssistantRequest();

  // Fetch Phorest appointments for conflict detection
  const dateStr = date ? format(date, 'yyyy-MM-dd') : undefined;
  const { data: phorestAppointments = [] } = useStylistPhorestAppointments(user?.id, dateStr);

  const selectedService = services.find(s => s.id === serviceId);

  // Check for Phorest appointment conflicts
  const phorestConflict = useMemo(() => {
    if (!startTime || !selectedService || phorestAppointments.length === 0) return null;
    
    const serviceDuration = selectedService.duration_minutes || 60;
    const requestStart = startTime;
    const requestEndDate = addMinutes(parse(startTime, 'HH:mm', new Date()), serviceDuration);
    const requestEnd = format(requestEndDate, 'HH:mm');

    const conflict = phorestAppointments.find(apt => {
      const aptStart = apt.start_time;
      const aptEnd = apt.end_time;
      // Overlap: requestStart < aptEnd AND requestEnd > aptStart
      return requestStart < aptEnd && requestEnd > aptStart;
    });

    return conflict;
  }, [startTime, selectedService, phorestAppointments]);

  // Get user's assigned locations
  const userLocationIds = profile?.location_ids || [];
  const userLocations = allLocations.filter(loc => userLocationIds.includes(loc.id));

  // Get locations with assistant availability for the selected date
  const locationsWithAssistants = useLocationsWithAssistants(date);
  const availableAssistantsAtLocation = useAssistantsAtLocation(locationId, date);

  // Filter locations: user's locations + has assistant availability
  const availableLocations = useMemo(() => {
    const baseLocations = userLocations.length > 0 ? userLocations : allLocations;
    
    if (!date) return baseLocations;
    
    // Only show locations that have assistants available on the selected day
    return baseLocations.filter(loc => locationsWithAssistants.includes(loc.id));
  }, [userLocations, allLocations, date, locationsWithAssistants]);

  // Reset location if it becomes unavailable
  useMemo(() => {
    if (locationId && date && !locationsWithAssistants.includes(locationId)) {
      setLocationId('');
    }
  }, [date, locationsWithAssistants, locationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !serviceId || !clientName || !startTime) return;

    await createRequest.mutateAsync({
      service_id: serviceId,
      client_name: clientName,
      request_date: format(date, 'yyyy-MM-dd'),
      start_time: startTime,
      notes: notes || undefined,
      location_id: locationId || undefined,
      recurrence_type: isRecurring ? recurrenceType : 'none',
      recurrence_end_date: isRecurring && recurrenceEndDate ? format(recurrenceEndDate, 'yyyy-MM-dd') : undefined,
    });

    // Reset form
    setDate(undefined);
    setServiceId('');
    setClientName('');
    setStartTime('');
    setNotes('');
    setLocationId('');
    setIsRecurring(false);
    setRecurrenceType('weekly');
    setRecurrenceEndDate(undefined);
    setOpen(false);
  };

  // Generate time slots from 8 AM to 8 PM in 15-minute increments
  const timeSlots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let min = 0; min < 60; min += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const displayTime = `${hour > 12 ? hour - 12 : hour}:${min.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
      timeSlots.push({ value: time, label: displayTime });
    }
  }

  // Group services by category
  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, typeof services>);

  // Set default recurrence end date when enabling recurring
  const handleRecurringToggle = (checked: boolean) => {
    setIsRecurring(checked);
    if (checked && date && !recurrenceEndDate) {
      setRecurrenceEndDate(addWeeks(date, 4)); // Default to 4 weeks
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Assistant</DialogTitle>
          <DialogDescription>
            Submit a request for assistant help during a service. An assistant will be automatically assigned.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Date Selection - moved up so location filtering works */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? formatDate(date, 'PPP') : 'Pick a date first'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* No assistants available warning */}
          {date && availableLocations.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No assistants are scheduled to work on {formatDate(date, 'EEEE')}. Please select a different date.
              </AlertDescription>
            </Alert>
          )}

          {/* Location Selection - only show if date selected and locations available */}
          {date && availableLocations.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {availableLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {locationId && availableAssistantsAtLocation.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {availableAssistantsAtLocation.length} assistant{availableAssistantsAtLocation.length !== 1 ? 's' : ''} available
                </p>
              )}
            </div>
          )}

          {/* Service Selection */}
          <div className="space-y-2">
            <Label htmlFor="service">Service Type</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedServices).map(([category, categoryServices]) => (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      {category}
                    </div>
                    {categoryServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} ({service.duration_minutes} min)
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
            {selectedService && (
              <p className="text-xs text-muted-foreground">
                Duration: {selectedService.duration_minutes} minutes
              </p>
            )}
          </div>

          {/* Client Name */}
          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter client name"
                className="pl-9"
                required
              />
            </div>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger>
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Select start time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Phorest Conflict Warning */}
            {phorestConflict && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-sm font-medium">Booking Conflict Detected</AlertTitle>
                <AlertDescription className="text-xs">
                  You have a Phorest appointment ({phorestConflict.service_name || 'Service'}) 
                  with {phorestConflict.client_name || 'a client'} from {phorestConflict.start_time?.slice(0, 5)} - {phorestConflict.end_time?.slice(0, 5)}.
                  Consider choosing a different time.
                </AlertDescription>
              </Alert>
            )}
          </div>


          {/* Recurring Toggle */}
          <div className="flex items-center justify-between py-2 border rounded-lg px-3">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="recurring" className="cursor-pointer">Make this recurring</Label>
            </div>
            <Switch
              id="recurring"
              checked={isRecurring}
              onCheckedChange={handleRecurringToggle}
            />
          </div>

          {/* Recurrence Options */}
          {isRecurring && (
            <div className="space-y-3 pl-4 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label>Repeat</Label>
                <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as RecurrenceType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Until</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !recurrenceEndDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {recurrenceEndDate ? formatDate(recurrenceEndDate, 'PPP') : 'Pick end date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={recurrenceEndDate}
                      onSelect={setRecurrenceEndDate}
                      initialFocus
                      disabled={(d) => !date || d <= date}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions..."
              rows={2}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!date || !serviceId || !clientName || !startTime || createRequest.isPending || (isRecurring && !recurrenceEndDate)}
          >
            {createRequest.isPending ? 'Submitting...' : isRecurring ? 'Submit Recurring Request' : 'Submit Request'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}