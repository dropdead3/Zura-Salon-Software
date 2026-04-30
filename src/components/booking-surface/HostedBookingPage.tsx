import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useParams, useSearchParams } from 'react-router-dom';
import { useOrganizationBySlug } from '@/hooks/useOrganizations';
import { usePublicBookingSurfaceConfig, DEFAULT_BOOKING_SURFACE_CONFIG } from '@/hooks/useBookingSurfaceConfig';
import { usePublicServicesForWebsite } from '@/hooks/usePublicServicesForWebsite';
import { useEligibleStylists } from '@/hooks/useBookingAvailability';
import { useBookingEligibleServices } from '@/hooks/useBookingEligibleServices';
import { BookingThemeProvider } from './BookingThemeProvider';
import { BookingHeader } from './BookingHeader';
import { BookingFlowProgress } from './BookingFlowProgress';
import { BookingServiceBrowser } from './BookingServiceBrowser';
import { BookingStylistPicker } from './BookingStylistPicker';
import { BookingLocationPicker, type BookingLocation } from './BookingLocationPicker';
import { BookingDateTimePicker } from './BookingDateTimePicker';
import { BookingClientForm } from './BookingClientForm';
import { BookingConfirmation } from './BookingConfirmation';
import { BookingPromoBanner } from './BookingPromoBanner';
import { useBookingSession, STEP_LABELS } from '@/hooks/useBookingSession';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  sendBookingReady,
  sendBookingResize,
  sendStepChange,
  sendBookingComplete,
} from '@/lib/booking-embed-messages';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRequiredFormsForService } from '@/hooks/useServiceFormRequirements';
import { PublicFormSigningModal } from './PublicFormSigningModal';

export function HostedBookingPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [searchParams] = useSearchParams();
  const isEmbedMode = searchParams.get('embed') === 'true';

  const { data: org, isLoading: orgLoading, error: orgError } = useOrganizationBySlug(orgSlug);
  const { data: config } = usePublicBookingSurfaceConfig(org?.id);
  const { categories, levels, isLoading: servicesLoading } = usePublicServicesForWebsite(org?.id);

  const effectiveConfig = config ?? DEFAULT_BOOKING_SURFACE_CONFIG;
  const { theme, flow, hosted } = effectiveConfig;

  const {
    steps, currentStep, currentStepIdx, direction, state,
    goNext, goBack, update,
  } = useBookingSession(flow.template, {
    location: searchParams.get('location'),
    service: searchParams.get('service'),
    category: searchParams.get('category'),
    stylist: searchParams.get('stylist'),
    consultation: searchParams.get('consultation'),
  });

  // ─── Availability-aware data queries ───────────────────────────
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

  // Eligible stylists — filtered by location + service qualifications
  const { data: eligibleStylists } = useEligibleStylists(
    org?.id,
    state.selectedLocation,
    state.selectedService,
  );

  // Eligible services — filtered by location + stylist qualifications
  const { data: eligibleServices } = useBookingEligibleServices(
    org?.id,
    state.selectedLocation,
    state.selectedStylist && state.selectedStylist !== 'any' ? state.selectedStylist : null,
  );

  // ─── Deep link validation ─────────────────────────────────────
  useEffect(() => {
    if (!org?.id || !eligibleStylists || !eligibleServices) return;

    // Validate deep-linked stylist
    if (state.selectedStylist && state.selectedStylist !== 'any') {
      const isValid = eligibleStylists.some((s) => s.id === state.selectedStylist);
      if (!isValid) {
        update({ selectedStylist: null });
      }
    }

    // Validate deep-linked service
    if (state.selectedService) {
      const isValid = eligibleServices.some((s) => s.name === state.selectedService);
      if (!isValid) {
        update({ selectedService: null, selectedCategory: null });
      }
    }
  }, [org?.id, eligibleStylists, eligibleServices, state.selectedStylist, state.selectedService, update]);

  // ─── Embed: auto-resize via ResizeObserver ─────────────────────
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEmbedMode || !rootRef.current) return;
    sendBookingReady();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        sendBookingResize(Math.ceil(entry.contentRect.height));
      }
    });
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, [isEmbedMode]);

  // ─── Embed: broadcast step changes ─────────────────────────────
  useEffect(() => {
    if (isEmbedMode && currentStep) {
      sendStepChange(currentStep, currentStepIdx);
    }
  }, [isEmbedMode, currentStep, currentStepIdx]);

  // ─── Selected service payment info ─────────────────────────────
  const selectedServiceData = eligibleServices?.find(
    (s) => s.name === state.selectedService
  );
  const depositAmount = selectedServiceData?.requiresDeposit
    ? selectedServiceData.depositAmount
    : null;
  const requiresCardOnFile = selectedServiceData?.requireCardOnFile ?? false;
  const afterpayEnabled = (org as any)?.afterpay_enabled ?? false;
  const afterpaySurchargeEnabled = (org as any)?.afterpay_surcharge_enabled ?? false;
  const afterpaySurchargeRate = (org as any)?.afterpay_surcharge_rate ?? null;

  // ─── Payment state ──────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentIntentType, setPaymentIntentType] = useState<'payment' | 'setup' | null>(null);
  const [stripeConfig, setStripeConfig] = useState<{ publishableKey: string; connectedAccountId: string } | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string | null>(null);

  // ─── Wave 9: required-form gating (hybrid sign-now / defer) ─────
  const selectedServiceId = selectedServiceData?.id;
  const { data: requiredForms } = useRequiredFormsForService(selectedServiceId);
  const [signedFormTemplateIds, setSignedFormTemplateIds] = useState<string[]>([]);
  const [showFormSigningDialog, setShowFormSigningDialog] = useState(false);

  // Reset sign state if the chosen service changes mid-flow
  useEffect(() => {
    setSignedFormTemplateIds([]);
  }, [selectedServiceId]);

  // Check if any eligible service needs payment (lazy Stripe config fetch)
  const anyServiceNeedsPayment = useMemo(() => {
    return eligibleServices?.some(s => s.requiresDeposit || s.requireCardOnFile) ?? false;
  }, [eligibleServices]);

  // Lazy fetch Stripe config when needed
  useEffect(() => {
    if (!anyServiceNeedsPayment || !org?.id || stripeConfig) return;

    supabase.functions.invoke('get-booking-stripe-config', {
      body: { organization_id: org.id },
    }).then(({ data, error }) => {
      if (!error && data?.publishable_key && data?.connected_account_id) {
        setStripeConfig({
          publishableKey: data.publishable_key,
          connectedAccountId: data.connected_account_id,
        });
      }
    });
  }, [anyServiceNeedsPayment, org?.id, stripeConfig]);

  const needsPayment = (depositAmount != null && depositAmount > 0) || requiresCardOnFile;

  // ─── Confirm handler ──────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!org?.id || !state.selectedService || !state.clientInfo) return;
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-public-booking', {
        body: {
          organization_id: org.id,
          service_name: state.selectedService,
          stylist_id: state.selectedStylist,
          location_id: state.selectedLocation,
          date: state.selectedDate,
          time: state.selectedTime,
          client: {
            first_name: state.clientInfo.firstName,
            last_name: state.clientInfo.lastName,
            email: state.clientInfo.email,
            phone: state.clientInfo.phone,
            notes: state.clientInfo.notes,
          },
          // Wave 9: Inline-signed forms — empty array means deferred to check-in
          signed_form_template_ids: signedFormTemplateIds,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const appointmentId = data.appointment_id;
      setCreatedAppointmentId(appointmentId);

      // If payment needed and Stripe is configured, create intent
      if (needsPayment && stripeConfig) {
        const { data: intentData, error: intentErr } = await supabase.functions.invoke(
          'create-booking-payment-intent',
          {
            body: {
              organization_id: org.id,
              appointment_id: appointmentId,
              amount: depositAmount && depositAmount > 0 ? depositAmount : 0,
              client_email: state.clientInfo.email,
            },
          }
        );

        if (intentErr) throw intentErr;
        if (intentData?.error) throw new Error(intentData.error);

        setPaymentClientSecret(intentData.client_secret);
        setPaymentIntentType(intentData.intent_type);
        setShowPaymentForm(true);
        setIsSubmitting(false);
        return; // Don't mark confirmed yet — wait for payment
      }

      // No payment needed — confirm immediately
      update({ isConfirmed: true });
      if (isEmbedMode) {
        sendBookingComplete({
          service: state.selectedService,
          stylist: state.selectedStylist,
          date: state.selectedDate,
          time: state.selectedTime,
          appointmentId,
        });
      }
    } catch (err: any) {
      console.error('Booking failed:', err);
      toast.error(err.message || 'Failed to submit booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [org?.id, state, isEmbedMode, update, needsPayment, stripeConfig, depositAmount, signedFormTemplateIds]);

  // ─── Payment complete handler ─────────────────────────────────
  const handlePaymentComplete = useCallback((intentId: string) => {
    setShowPaymentForm(false);
    update({ isConfirmed: true });
    if (isEmbedMode) {
      sendBookingComplete({
        service: state.selectedService || '',
        stylist: state.selectedStylist,
        date: state.selectedDate,
        time: state.selectedTime,
        appointmentId: createdAppointmentId || '',
      });
    }
  }, [isEmbedMode, state, update, createdAppointmentId]);

  // ─── Loading / Error ──────────────────────────────────────────
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
  const stylistName = state.selectedStylist === 'any'
    ? null
    : eligibleStylists?.find(s => s.id === state.selectedStylist)?.name || null;
  const locationName = locations?.find(l => l.id === state.selectedLocation)?.name || null;

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'location':
        return (
          <BookingLocationPicker
            locations={locations ?? []}
            theme={theme}
            onSelect={(id) => { update({ selectedLocation: id }); goNext(); }}
          />
        );
      case 'service':
        return (
          <BookingServiceBrowser
            categories={categories}
            theme={theme}
            flow={flow}
            defaultLevelSlug={defaultLevel}
            eligibleServices={eligibleServices ?? undefined}
            onSelectService={(name, cat) => { update({ selectedService: name, selectedCategory: cat }); goNext(); }}
          />
        );
      case 'stylist':
        return (
          <BookingStylistPicker
            stylists={eligibleStylists ?? []}
            theme={theme}
            showBios={flow.showStylistBios}
            onSelect={(id) => { update({ selectedStylist: id }); goNext(); }}
          />
        );
      case 'datetime':
        return (
          <BookingDateTimePicker
            theme={theme}
            orgId={org.id}
            stylistId={state.selectedStylist}
            locationId={state.selectedLocation}
            serviceName={state.selectedService}
            onSelect={(date, time) => { update({ selectedDate: date, selectedTime: time }); goNext(); }}
          />
        );
      case 'details':
        return <BookingClientForm theme={theme} onSubmit={(info) => { update({ clientInfo: info }); goNext(); }} />;
      case 'confirm':
        return state.clientInfo ? (
          <BookingConfirmation
            theme={theme}
            serviceName={state.selectedService || '—'}
            categoryName={state.selectedCategory || '—'}
            stylistName={stylistName}
            locationName={locationName}
            date={state.selectedDate || '—'}
            time={state.selectedTime || '—'}
            clientInfo={state.clientInfo}
            onConfirm={handleConfirm}
            onBack={goBack}
            isSubmitting={isSubmitting}
            isConfirmed={state.isConfirmed}
            depositAmount={depositAmount}
            organizationId={org.id}
            requiresCardOnFile={requiresCardOnFile}
            depositPolicyText={(hosted as any).depositPolicyText || hosted.policyText || undefined}
            cancellationPolicyText={(hosted as any).cancellationPolicyText || hosted.policyText || undefined}
            paymentClientSecret={paymentClientSecret}
            paymentIntentType={paymentIntentType}
            stripePublishableKey={stripeConfig?.publishableKey}
            stripeConnectedAccountId={stripeConfig?.connectedAccountId}
            onPaymentComplete={handlePaymentComplete}
            showPaymentForm={showPaymentForm}
            afterpayEnabled={afterpayEnabled}
            afterpaySurchargeRate={afterpaySurchargeEnabled ? afterpaySurchargeRate : undefined}
            requiredForms={requiredForms ?? []}
            signedFormTemplateIds={signedFormTemplateIds}
            onSignForms={() => setShowFormSigningDialog(true)}
            onDeferForms={() => setSignedFormTemplateIds([])}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <BookingThemeProvider theme={theme}>
      <div ref={rootRef}>
        {!isEmbedMode && (
          <BookingHeader salonName={salonName} theme={theme} hosted={hosted} />
        )}

        <div className={`max-w-4xl mx-auto pb-16 ${isEmbedMode ? 'px-3 pt-3' : 'px-4 sm:px-6'}`}>
          {/* Promo banner — closes the loop opened by the promotional popup's
              "Claim Offer" CTA. Renders nothing when no recognized ?promo= is
              present (silence is valid output per Visibility Contract). */}
          {!state.isConfirmed && (
            <div className="mb-4">
              <BookingPromoBanner organizationId={org.id} />
            </div>
          )}

          {!state.isConfirmed && (
            <BookingFlowProgress
              steps={steps.map((s) => STEP_LABELS[s])}
              currentStep={currentStepIdx}
              theme={theme}
            />
          )}

          {currentStepIdx > 0 && !state.isConfirmed && (
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

          {!isEmbedMode && hosted.policyText && (
            <div className="mt-12 pt-6 border-t" style={{ borderColor: theme.borderColor }}>
              <p className="text-xs leading-relaxed" style={{ color: theme.mutedTextColor }}>
                {hosted.policyText}
              </p>
            </div>
          )}

          {!isEmbedMode && hosted.poweredByVisible && (
            <div className="text-center mt-8">
              <span className="text-xs" style={{ color: theme.mutedTextColor }}>
                Powered by Zura
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Wave 9: Public-booking inline form signer */}
      {requiredForms && requiredForms.length > 0 && state.clientInfo && (
        <PublicFormSigningModal
          open={showFormSigningDialog}
          onOpenChange={setShowFormSigningDialog}
          forms={requiredForms}
          theme={theme}
          defaultSignerName={`${state.clientInfo.firstName} ${state.clientInfo.lastName}`.trim()}
          onComplete={(ids) => setSignedFormTemplateIds(ids)}
        />
      )}
    </BookingThemeProvider>
  );
}
