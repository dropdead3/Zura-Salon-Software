import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useActiveLocations } from '@/hooks/useLocations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Clock, 
  User, 
  Scissors, 
  MapPin, 
  Check, 
  ChevronRight,
  ChevronLeft,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { toast } from 'sonner';

// Step definitions
type BookingStep = 'service' | 'location' | 'stylist' | 'datetime' | 'details' | 'confirm';

interface SelectedService {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number | null;
}

interface BookingState {
  services: SelectedService[];
  locationId: string | null;
  locationName: string | null;
  stylistId: string | null;
  stylistName: string | null;
  date: Date | null;
  time: string | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes: string;
}

const INITIAL_STATE: BookingState = {
  services: [],
  locationId: null,
  locationName: null,
  stylistId: null,
  stylistName: null,
  date: null,
  time: null,
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  notes: '',
};

export default function PublicBooking() {
  const [step, setStep] = useState<BookingStep>('service');
  const [booking, setBooking] = useState<BookingState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const { data: locations = [] } = useActiveLocations();
  
  // Fetch services grouped by category
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['public-booking-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_services')
        .select('id, phorest_service_id, name, category, duration_minutes, price')
        .eq('is_active', true)
        .order('category')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Group services by category
  const servicesByCategory = useMemo(() => {
    const grouped = new Map<string, typeof services>();
    services.forEach(service => {
      const category = service.category || 'Other';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(service);
    });
    return grouped;
  }, [services]);

  // Fetch stylists for selected location
  const { data: stylists = [] } = useQuery({
    queryKey: ['public-booking-stylists', booking.locationId],
    queryFn: async () => {
      if (!booking.locationId) return [];
      
      const location = locations.find(l => l.id === booking.locationId);
      if (!location?.phorest_branch_id) return [];

      const { data, error } = await supabase
        .from('phorest_staff_mapping')
        .select(`
          user_id,
          phorest_staff_id,
          employee_profiles!phorest_staff_mapping_user_id_fkey(
            display_name,
            full_name,
            photo_url
          )
        `)
        .eq('is_active', true)
        .eq('show_on_calendar', true)
        .eq('phorest_branch_id', location.phorest_branch_id);
      
      if (error) throw error;
      return data?.map((s: any) => ({
        id: s.user_id,
        phorestId: s.phorest_staff_id,
        name: s.employee_profiles?.display_name || s.employee_profiles?.full_name || 'Unknown',
        photoUrl: s.employee_profiles?.photo_url,
      })) || [];
    },
    enabled: !!booking.locationId,
  });

  // Generate available time slots
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 9; hour < 19; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  // Generate next 14 days for date selection
  const availableDates = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      // Skip Sundays
      if (date.getDay() !== 0) {
        dates.push(date);
      }
    }
    return dates;
  }, []);

  const handleServiceToggle = (service: typeof services[0]) => {
    setBooking(prev => {
      const exists = prev.services.find(s => s.id === service.id);
      if (exists) {
        return { ...prev, services: prev.services.filter(s => s.id !== service.id) };
      }
      return {
        ...prev,
        services: [...prev.services, {
          id: service.id,
          name: service.name,
          category: service.category || 'Other',
          duration: service.duration_minutes,
          price: service.price,
        }],
      };
    });
  };

  const handleLocationSelect = (locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    setBooking(prev => ({
      ...prev,
      locationId,
      locationName: location?.name || null,
      stylistId: null,
      stylistName: null,
    }));
  };

  const handleStylistSelect = (stylistId: string | 'any') => {
    if (stylistId === 'any') {
      setBooking(prev => ({ ...prev, stylistId: null, stylistName: 'First Available' }));
    } else {
      const stylist = stylists.find(s => s.id === stylistId);
      setBooking(prev => ({ ...prev, stylistId, stylistName: stylist?.name || null }));
    }
  };

  const handleDateSelect = (date: Date) => {
    setBooking(prev => ({ ...prev, date, time: null }));
  };

  const handleTimeSelect = (time: string) => {
    setBooking(prev => ({ ...prev, time }));
  };

  const totalDuration = booking.services.reduce((sum, s) => sum + s.duration, 0);
  const totalPrice = booking.services.reduce((sum, s) => sum + (s.price || 0), 0);

  const canProceed = () => {
    switch (step) {
      case 'service': return booking.services.length > 0;
      case 'location': return !!booking.locationId;
      case 'stylist': return booking.stylistId !== null || booking.stylistName === 'First Available';
      case 'datetime': return !!booking.date && !!booking.time;
      case 'details': return booking.clientName && booking.clientEmail && booking.clientPhone;
      case 'confirm': return true;
    }
  };

  const nextStep = () => {
    const steps: BookingStep[] = ['service', 'location', 'stylist', 'datetime', 'details', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: BookingStep[] = ['service', 'location', 'stylist', 'datetime', 'details', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Call the create-phorest-booking edge function
      const location = locations.find(l => l.id === booking.locationId);
      
      const response = await supabase.functions.invoke('create-phorest-booking', {
        body: {
          branch_id: location?.phorest_branch_id,
          staff_id: booking.stylistId ? stylists.find(s => s.id === booking.stylistId)?.phorestId : null,
          service_ids: booking.services.map(s => s.id),
          date: format(booking.date!, 'yyyy-MM-dd'),
          time: booking.time,
          client: {
            name: booking.clientName,
            email: booking.clientEmail,
            phone: booking.clientPhone,
          },
          notes: booking.notes,
        },
      });

      if (response.error) throw response.error;

      setIsComplete(true);
      toast.success('Appointment booked successfully!');
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error('Failed to book appointment. Please try again or call us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime12h = (time: string) => {
    const [hours] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${time.split(':')[1]} ${ampm}`;
  };

  if (isComplete) {
    return (
      <Layout>
        <SEO 
          title="Booking Confirmed"
          description="Your appointment has been booked"
        />
        <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
          <Card className="max-w-lg w-full p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="font-display text-2xl mb-2">BOOKING CONFIRMED</h1>
            <p className="text-muted-foreground mb-6">
              We've sent a confirmation email to {booking.clientEmail}
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{format(booking.date!, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">{formatTime12h(booking.time!)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">{booking.locationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Services</span>
                <span className="font-medium">{booking.services.map(s => s.name).join(', ')}</span>
              </div>
            </div>

            <Button onClick={() => window.location.href = '/'} className="w-full">
              Return to Homepage
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO 
        title="Book an Appointment"
        description="Book your next salon appointment online"
      />
      <div className="min-h-[60vh] px-4 py-8 md:py-16 max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['service', 'location', 'stylist', 'datetime', 'details', 'confirm'].map((s, idx) => (
            <div key={s} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                step === s ? "bg-primary text-primary-foreground" : 
                ['service', 'location', 'stylist', 'datetime', 'details', 'confirm'].indexOf(step) > idx 
                  ? "bg-primary/20 text-primary" 
                  : "bg-muted text-muted-foreground"
              )}>
                {idx + 1}
              </div>
              {idx < 5 && (
                <div className={cn(
                  "w-8 h-0.5 mx-1",
                  ['service', 'location', 'stylist', 'datetime', 'details', 'confirm'].indexOf(step) > idx
                    ? "bg-primary/40"
                    : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <Card className="p-6 md:p-8">
          {/* Service Selection */}
          {step === 'service' && (
            <div>
              <h2 className="font-display text-2xl mb-2">SELECT SERVICES</h2>
              <p className="text-muted-foreground mb-6">Choose one or more services for your appointment</p>
              
              {servicesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : (
                <div className="space-y-6">
                  {Array.from(servicesByCategory.entries()).map(([category, categoryServices]) => (
                    <div key={category}>
                      <h3 className="font-medium text-sm text-muted-foreground mb-3">{category}</h3>
                      <div className="grid gap-2">
                        {categoryServices.map(service => {
                          const isSelected = booking.services.some(s => s.id === service.id);
                          return (
                            <div
                              key={service.id}
                              onClick={() => handleServiceToggle(service)}
                              className={cn(
                                "p-4 rounded-lg border cursor-pointer transition-all",
                                isSelected 
                                  ? "border-primary bg-primary/5" 
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{service.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {service.duration_minutes} min
                                    {service.price && ` • $${service.price}`}
                                  </p>
                                </div>
                                {isSelected && (
                                  <Check className="w-5 h-5 text-primary" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {booking.services.length > 0 && (
                <div className="mt-6 pt-4 border-t flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {booking.services.length} service{booking.services.length > 1 ? 's' : ''} selected
                    </p>
                    <p className="font-medium">
                      {totalDuration} min • ${totalPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Location Selection */}
          {step === 'location' && (
            <div>
              <h2 className="font-display text-2xl mb-2">CHOOSE LOCATION</h2>
              <p className="text-muted-foreground mb-6">Select which salon location you'd like to visit</p>
              
              <div className="grid gap-3">
                {locations.map(location => (
                  <div
                    key={location.id}
                    onClick={() => handleLocationSelect(location.id)}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-all",
                      booking.locationId === location.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{location.name}</p>
                          {location.address && (
                            <p className="text-sm text-muted-foreground">{location.address}</p>
                          )}
                        </div>
                      </div>
                      {booking.locationId === location.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stylist Selection */}
          {step === 'stylist' && (
            <div>
              <h2 className="font-display text-2xl mb-2">SELECT STYLIST</h2>
              <p className="text-muted-foreground mb-6">Choose your preferred stylist or first available</p>
              
              <div className="grid gap-3">
                <div
                  onClick={() => handleStylistSelect('any')}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer transition-all",
                    booking.stylistName === 'First Available'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">First Available</p>
                        <p className="text-sm text-muted-foreground">We'll assign the next available stylist</p>
                      </div>
                    </div>
                    {booking.stylistName === 'First Available' && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </div>

                {stylists.map(stylist => (
                  <div
                    key={stylist.id}
                    onClick={() => handleStylistSelect(stylist.id)}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-all",
                      booking.stylistId === stylist.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                          {stylist.photoUrl ? (
                            <img src={stylist.photoUrl} alt={stylist.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <p className="font-medium">{stylist.name}</p>
                      </div>
                      {booking.stylistId === stylist.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date/Time Selection */}
          {step === 'datetime' && (
            <div>
              <h2 className="font-display text-2xl mb-2">SELECT DATE & TIME</h2>
              <p className="text-muted-foreground mb-6">Pick your preferred appointment slot</p>
              
              <div className="mb-6">
                <Label className="text-sm text-muted-foreground mb-3 block">Select Date</Label>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                  {availableDates.map(date => (
                    <button
                      key={date.toISOString()}
                      onClick={() => handleDateSelect(date)}
                      className={cn(
                        "p-3 rounded-lg border text-center transition-all",
                        booking.date?.toDateString() === date.toDateString()
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <p className="text-xs text-muted-foreground">{format(date, 'EEE')}</p>
                      <p className="font-medium">{format(date, 'd')}</p>
                    </button>
                  ))}
                </div>
              </div>

              {booking.date && (
                <div>
                  <Label className="text-sm text-muted-foreground mb-3 block">Select Time</Label>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {timeSlots.map(time => (
                      <button
                        key={time}
                        onClick={() => handleTimeSelect(time)}
                        className={cn(
                          "p-2 rounded-lg border text-sm transition-all",
                          booking.time === time
                            ? "border-primary bg-primary/5 font-medium"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        {formatTime12h(time)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Client Details */}
          {step === 'details' && (
            <div>
              <h2 className="font-display text-2xl mb-2">YOUR DETAILS</h2>
              <p className="text-muted-foreground mb-6">Enter your contact information</p>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={booking.clientName}
                    onChange={(e) => setBooking(prev => ({ ...prev, clientName: e.target.value }))}
                    placeholder="Jane Doe"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={booking.clientEmail}
                    onChange={(e) => setBooking(prev => ({ ...prev, clientEmail: e.target.value }))}
                    placeholder="jane@example.com"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={booking.clientPhone}
                    onChange={(e) => setBooking(prev => ({ ...prev, clientPhone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Special Requests (optional)</Label>
                  <Input
                    id="notes"
                    value={booking.notes}
                    onChange={(e) => setBooking(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any special requests or notes..."
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Confirmation */}
          {step === 'confirm' && (
            <div>
              <h2 className="font-display text-2xl mb-2">CONFIRM BOOKING</h2>
              <p className="text-muted-foreground mb-6">Review your appointment details</p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Scissors className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Services</p>
                    <p className="font-medium">{booking.services.map(s => s.name).join(', ')}</p>
                    <p className="text-sm text-muted-foreground">{totalDuration} min • ${totalPrice}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{booking.locationName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Stylist</p>
                    <p className="font-medium">{booking.stylistName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date & Time</p>
                    <p className="font-medium">
                      {format(booking.date!, 'EEEE, MMMM d, yyyy')} at {formatTime12h(booking.time!)}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-1">
                  <p className="font-medium">{booking.clientName}</p>
                  <p className="text-sm text-muted-foreground">{booking.clientEmail}</p>
                  <p className="text-sm text-muted-foreground">{booking.clientPhone}</p>
                  {booking.notes && (
                    <p className="text-sm text-muted-foreground mt-2">Notes: {booking.notes}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            {step !== 'service' ? (
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step === 'confirm' ? (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    Confirm Booking
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={nextStep} disabled={!canProceed()}>
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
