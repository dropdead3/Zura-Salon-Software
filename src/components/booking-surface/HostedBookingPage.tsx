import { useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useOrganizationBySlug } from '@/hooks/useOrganizations';
import { usePublicBookingSurfaceConfig, DEFAULT_BOOKING_SURFACE_CONFIG } from '@/hooks/useBookingSurfaceConfig';
import { usePublicServicesForWebsite } from '@/hooks/usePublicServicesForWebsite';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookingThemeProvider } from './BookingThemeProvider';
import { BookingHeader } from './BookingHeader';
import { BookingFlowProgress } from './BookingFlowProgress';
import { BookingServiceBrowser } from './BookingServiceBrowser';
import { BookingStylistPicker, type BookingStylist } from './BookingStylistPicker';
import { BookingLocationPicker, type BookingLocation } from './BookingLocationPicker';
import { BookingDateTimePicker } from './BookingDateTimePicker';
import { BookingClientForm, type BookingClientInfo } from './BookingClientForm';
import { BookingConfirmation } from './BookingConfirmation';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type FlowStep = 'location' | 'service' | 'stylist' | 'datetime' | 'details' | 'confirm';

const FLOW_STEPS: Record<string, FlowStep[]> = {
  'category-first': ['service', 'stylist', 'datetime', 'details', 'confirm'],
  'stylist-first': ['stylist', 'service', 'datetime', 'details', 'confirm'],
  'location-first': ['location', 'service', 'stylist', 'datetime', 'details', 'confirm'],
};

const STEP_LABELS: Record<FlowStep, string> = {
  location: 'Location',
  service: 'Service',
  stylist: 'Stylist',
  datetime: 'Date & Time',
  details: 'Your Info',
  confirm: 'Review',
};

export function HostedBookingPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [searchParams] = useSearchParams();
  const { data: org, isLoading: orgLoading, error: orgError } = useOrganizationBySlug(orgSlug);
  const { data: config } = usePublicBookingSurfaceConfig(org?.id);
  const { categories, levels, isLoading: servicesLoading } = usePublicServicesForWebsite(org?.id);

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(searchParams.get('location'));
  const [selectedService, setSelectedService] = useState<string | null>(searchParams.get('service'));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('category'));
  const [selectedStylist, setSelectedStylist] = useState<string | null>(searchParams.get('stylist'));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState<BookingClientInfo | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const effectiveConfig = config ?? DEFAULT_BOOKING_SURFACE_CONFIG;
  const { theme, flow, hosted } = effectiveConfig;
  const steps = FLOW_STEPS[flow.template] || FLOW_STEPS['category-first'];

  const { data: locations } = useQuery({
    queryKey: ['public-locations', org?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, address, city, state_province')
        .eq('organization_id', org!.id)
        .eq('is_active', true);
      if (error) throw error;
      return (data ?? []).map((l) => ({
        id: l.id, name: l.name, address: l.address, city: l.city, state: l.state_province,
      })) as BookingLocation[];
    },
    enabled: !!org?.id,
  });

  const { data: stylists } = useQuery({
    queryKey: ['public-stylists', org?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('user_id, full_name, photo_url, bio')
        .eq('organization_id', org!.id)
        .eq('is_active', true)
        .eq('is_booking', true);
      if (error) throw error;
      return (data ?? []).map((s) => ({
        id: s.user_id, name: s.full_name || 'Stylist', photoUrl: s.photo_url, bio: s.bio,
      })) as BookingStylist[];
    },
    enabled: !!org?.id,
  });

  const currentStep = steps[currentStepIdx];

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentStepIdx((prev) => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const goBack = useCallback(() => {
    setDirection(-1);
    setCurrentStepIdx((prev) => Math.max(0, prev - 1));
  }, []);

  if (orgLoading || servicesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (orgError || !org) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-xl font-medium text-gray-900 mb-2">Booking page not found</h1>
          <p className="text-gray-500 text-sm">This booking page may no longer be available.</p>
        </div>
      </div>
    );
  }

  const salonName = org.name || 'Our Salon';
  const defaultLevel = levels[0]?.slug;
  const stylistName = selectedStylist === 'any' ? null : stylists?.find(s => s.id === selectedStylist)?.name || null;
  const locationName = locations?.find(l => l.id === selectedLocation)?.name || null;

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'location':
        return <BookingLocationPicker locations={locations ?? []} theme={theme} onSelect={(id) => { setSelectedLocation(id); goNext(); }} />;
      case 'service':
        return <BookingServiceBrowser categories={categories} theme={theme} flow={flow} defaultLevelSlug={defaultLevel} onSelectService={(name, cat) => { setSelectedService(name); setSelectedCategory(cat); goNext(); }} />;
      case 'stylist':
        return <BookingStylistPicker stylists={stylists ?? []} theme={theme} showBios={flow.showStylistBios} onSelect={(id) => { setSelectedStylist(id); goNext(); }} />;
      case 'datetime':
        return <BookingDateTimePicker theme={theme} onSelect={(date, time) => { setSelectedDate(date); setSelectedTime(time); goNext(); }} />;
      case 'details':
        return <BookingClientForm theme={theme} onSubmit={(info) => { setClientInfo(info); goNext(); }} />;
      case 'confirm':
        return clientInfo ? (
          <BookingConfirmation
            theme={theme}
            serviceName={selectedService || '—'}
            categoryName={selectedCategory || '—'}
            stylistName={stylistName}
            locationName={locationName}
            date={selectedDate || '—'}
            time={selectedTime || '—'}
            clientInfo={clientInfo}
            onConfirm={() => setIsConfirmed(true)}
            onBack={goBack}
            isConfirmed={isConfirmed}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <BookingThemeProvider theme={theme}>
      <BookingHeader salonName={salonName} theme={theme} hosted={hosted} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">
        {!isConfirmed && (
          <BookingFlowProgress
            steps={steps.map((s) => STEP_LABELS[s])}
            currentStep={currentStepIdx}
            theme={theme}
          />
        )}

        {currentStepIdx > 0 && !isConfirmed && (
          <button
            onClick={goBack}
            className="text-sm mb-4 transition-colors"
            style={{ color: theme.mutedTextColor }}
          >
            ← Back
          </button>
        )}

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {hosted.policyText && (
          <div className="mt-12 pt-6 border-t" style={{ borderColor: theme.borderColor }}>
            <p className="text-xs leading-relaxed" style={{ color: theme.mutedTextColor }}>
              {hosted.policyText}
            </p>
          </div>
        )}

        {hosted.poweredByVisible && (
          <div className="text-center mt-8">
            <span className="text-xs" style={{ color: theme.mutedTextColor }}>
              Powered by Zura
            </span>
          </div>
        )}
      </div>
    </BookingThemeProvider>
  );
}
