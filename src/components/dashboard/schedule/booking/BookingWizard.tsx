import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn, formatDisplayName } from '@/lib/utils';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useServicesByCategory } from '@/hooks/usePhorestServices';
import { useLocations } from '@/hooks/useLocations';
import { useAuth } from '@/contexts/AuthContext';
import { useQualifiedStaffForServices } from '@/hooks/useStaffServiceQualifications';
import { toast } from 'sonner';

import { BookingHeader } from './BookingHeader';
import { ClientStep } from './ClientStep';
import { ServiceStep } from './ServiceStep';
import { StylistStep } from './StylistStep';
import { ConfirmStep } from './ConfirmStep';
import { NewClientStep } from './NewClientStep';
import type { RecurrenceRule } from './RecurrenceSelector';

export interface PhorestClient {
  id: string;
  phorest_client_id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export type BookingStep = 'service' | 'client' | 'newClient' | 'stylist' | 'confirm';

interface BookingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  defaultTime?: string;
  defaultStylistId?: string;
}

export function BookingWizard({
  open,
  onOpenChange,
  defaultDate = new Date(),
  defaultTime = '09:00',
  defaultStylistId,
}: BookingWizardProps) {
  const queryClient = useQueryClient();
  const { formatDate } = useFormatDate();
  const { user, roles } = useAuth();

  // Step state
  const [step, setStep] = useState<BookingStep>('service');

  // Form state
  const [selectedClient, setSelectedClient] = useState<PhorestClient | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedStylist, setSelectedStylist] = useState(defaultStylistId || '');
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate);
  const [selectedTime, setSelectedTime] = useState(defaultTime);
  const [notes, setNotes] = useState('');
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);

  // Data fetching
  const { data: locations = [] } = useLocations();
  const { data: servicesByCategory, services = [], isLoading: isLoadingServices } = useServicesByCategory(selectedLocation || undefined);

  const canViewAllClients = roles.some(r => ['admin', 'manager', 'super_admin', 'receptionist'].includes(r));

  // Fetch clients
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['booking-clients', clientSearch, activeLetter, user?.id, canViewAllClients],
    queryFn: async () => {
      let query = supabase
        .from('v_all_clients' as any)
        .select('id, phorest_client_id, name, email, phone, preferred_stylist_id')
        .eq('is_duplicate', false)
        .order('name')
        .limit(activeLetter ? 500 : 50);

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
      } else if (activeLetter) {
        query = query.ilike('name', `${activeLetter}%`);
      }

      const { data } = await query;
      return data as unknown as PhorestClient[];
    },
    enabled: !!user?.id,
  });

  // Fetch stylists
  const { data: stylists = [] } = useQuery({
    queryKey: ['booking-stylists', selectedLocation],
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

  // Fetch qualification data for selected services
  const { data: qualificationData } = useQualifiedStaffForServices(selectedServices, selectedLocation);

  // Filter stylists by qualification if qualification data exists
  const filteredStylists = useMemo(() => {
    if (!qualificationData?.hasQualificationData) {
      // No qualification data synced yet - show all stylists
      return stylists;
    }
    
    // Filter to only show qualified stylists
    return stylists.filter(stylist => 
      qualificationData.qualifiedStaffIds.includes(stylist.phorest_staff_id)
    );
  }, [stylists, qualificationData]);

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

      // If recurrence is set, create recurring appointments
      if (recurrenceRule && response.data.appointment_id) {
        const recResponse = await supabase.functions.invoke('create-recurring-appointments', {
          body: {
            first_appointment_id: response.data.appointment_id,
            recurrence_rule: recurrenceRule,
          },
        });

        if (recResponse.data?.success) {
          const { created_count, skipped_count, total_requested } = recResponse.data;
          if (skipped_count > 0) {
            toast.info(
              `Created ${created_count} of ${total_requested} recurring appointments. ${skipped_count} skipped due to conflicts.`
            );
          }
        }
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phorest-appointments'] });
      toast.success('Appointment booked successfully');
      handleClose();
    },
    onError: (error: Error) => {
      toast.error('Failed to create booking', { description: error.message });
    },
  });

  const handleClose = () => {
    setStep('service');
    setSelectedClient(null);
    setClientSearch('');
    setSelectedLocation('');
    setSelectedServices([]);
    setSelectedStylist(defaultStylistId || '');
    setSelectedDate(defaultDate);
    setSelectedTime(defaultTime);
    setNotes('');
    setRecurrenceRule(null);
    onOpenChange(false);
  };

  const handleServicesComplete = () => {
    setStep('client');
  };

  const handleSelectClient = (client: PhorestClient) => {
    setSelectedClient(client);
    setStep('stylist');
  };

  const handleStylistComplete = () => {
    setStep('confirm');
  };

  const handleBack = () => {
    switch (step) {
      case 'client':
        setStep('service');
        break;
      case 'newClient':
        setStep('client');
        break;
      case 'stylist':
        setStep('client');
        break;
      case 'confirm':
        setStep('stylist');
        break;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'client':
        return 'Select Client';
      case 'newClient':
        return 'Add New Client';
      case 'service':
        return 'Choose Services';
      case 'stylist':
        return 'Pick Stylist & Time';
      case 'confirm':
        return 'Confirm Booking';
    }
  };

  const getStylistName = () => {
    const stylist = stylists.find(s => s.user_id === selectedStylist);
    return stylist?.employee_profiles ? formatDisplayName(stylist.employee_profiles.full_name || '', stylist.employee_profiles.display_name) : '';
  };

  return (
    <>
      <PremiumFloatingPanel
        open={open}
        onOpenChange={(v) => { if (!v) handleClose(); }}
        maxWidth="448px"
        
        showCloseButton={false}
      >
              <BookingHeader
                step={step}
                title={getStepTitle()}
                subtitle={
                  step === 'newClient'
                    ? 'Create a client to continue'
                    : step !== 'service' && selectedServices.length > 0
                      ? `${selectedServices.length} service${selectedServices.length > 1 ? 's' : ''} selected`
                      : formatDate(selectedDate, 'EEEE, MMM d') + ' at ' + formatTime12h(selectedTime)
                }
                onClose={handleClose}
                onBack={step !== 'service' ? handleBack : undefined}
              />

              <div className="flex-1 overflow-hidden">
                {step === 'client' && (
                  <ClientStep
                    clients={clients}
                    isLoading={isLoadingClients}
                    searchQuery={clientSearch}
                    onSearchChange={setClientSearch}
                    onSelectClient={handleSelectClient}
                    onNewClient={() => setStep('newClient')}
                  />
                )}

                {step === 'newClient' && (
                  <NewClientStep
                    defaultLocationId={selectedLocation}
                    onCancel={() => setStep('client')}
                    onCreated={(client) => {
                      setSelectedClient({
                        id: client.id,
                        phorest_client_id: client.phorest_client_id,
                        name: client.name,
                        email: client.email,
                        phone: client.phone,
                      });
                      setStep('stylist');
                    }}
                  />
                )}

                {step === 'service' && (
                  <ServiceStep
                    locations={locations}
                    selectedLocation={selectedLocation}
                    onLocationChange={setSelectedLocation}
                    servicesByCategory={servicesByCategory}
                    allServices={services}
                    selectedServices={selectedServices}
                    onToggleService={(serviceId) => {
                      setSelectedServices(prev =>
                        prev.includes(serviceId)
                          ? prev.filter(id => id !== serviceId)
                          : [...prev, serviceId]
                      );
                    }}
                    totalDuration={totalDuration}
                    totalPrice={totalPrice}
                    onContinue={handleServicesComplete}
                    canContinue={!!selectedLocation}
                    isLoadingServices={isLoadingServices}
                  />
                )}

                {step === 'stylist' && (
                  <StylistStep
                    stylists={filteredStylists}
                    selectedStylist={selectedStylist}
                    onStylistChange={setSelectedStylist}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    selectedTime={selectedTime}
                    onTimeChange={setSelectedTime}
                    onContinue={handleStylistComplete}
                    canContinue={!!selectedStylist && !!selectedTime}
                    qualificationInfo={qualificationData?.hasQualificationData ? {
                      totalQualified: filteredStylists.length,
                      hasData: true
                    } : undefined}
                  />
                )}

                {step === 'confirm' && (
                  <ConfirmStep
                    client={selectedClient}
                    services={selectedServiceDetails}
                    stylistName={getStylistName()}
                    date={selectedDate}
                    time={selectedTime}
                    totalDuration={totalDuration}
                    totalPrice={totalPrice}
                    notes={notes}
                    onNotesChange={setNotes}
                    onConfirm={() => createBooking.mutate()}
                    isLoading={createBooking.isPending}
                    locationName={locations.find(l => l.id === selectedLocation)?.name || ''}
                    recurrenceRule={recurrenceRule}
                    onRecurrenceChange={setRecurrenceRule}
                  />
                )}
              </div>
      </PremiumFloatingPanel>
    </>
  );
}

import { formatTime12h } from '@/lib/schedule-utils';
