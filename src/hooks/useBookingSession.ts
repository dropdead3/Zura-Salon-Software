import { useState, useCallback, useMemo } from 'react';
import type { BookingClientInfo } from '@/components/booking-surface/BookingClientForm';

export type FlowStep = 'location' | 'service' | 'stylist' | 'datetime' | 'details' | 'confirm';

export const FLOW_STEPS: Record<string, FlowStep[]> = {
  'category-first': ['service', 'stylist', 'datetime', 'details', 'confirm'],
  'stylist-first': ['stylist', 'service', 'datetime', 'details', 'confirm'],
  'location-first': ['location', 'service', 'stylist', 'datetime', 'details', 'confirm'],
};

export const STEP_LABELS: Record<FlowStep, string> = {
  location: 'Location',
  service: 'Service',
  stylist: 'Stylist',
  datetime: 'Date & Time',
  details: 'Your Info',
  confirm: 'Review',
};

export interface BookingSessionState {
  selectedLocation: string | null;
  selectedService: string | null;
  selectedCategory: string | null;
  selectedStylist: string | null;
  selectedDate: string | null;
  selectedTime: string | null;
  clientInfo: BookingClientInfo | null;
  isConfirmed: boolean;
}

interface DeepLinkParams {
  location?: string | null;
  service?: string | null;
  category?: string | null;
  stylist?: string | null;
  consultation?: string | null;
}

export function useBookingSession(flowTemplate: string, deepLinks?: DeepLinkParams) {
  const steps = useMemo(
    () => FLOW_STEPS[flowTemplate] || FLOW_STEPS['category-first'],
    [flowTemplate]
  );

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [direction, setDirection] = useState(1);

  const [state, setState] = useState<BookingSessionState>({
    selectedLocation: deepLinks?.location ?? null,
    selectedService: deepLinks?.service ?? null,
    selectedCategory: deepLinks?.category ?? null,
    selectedStylist: deepLinks?.stylist ?? null,
    selectedDate: null,
    selectedTime: null,
    clientInfo: null,
    isConfirmed: false,
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

  const update = useCallback((partial: Partial<BookingSessionState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => {
    setCurrentStepIdx(0);
    setDirection(1);
    setState({
      selectedLocation: null,
      selectedService: null,
      selectedCategory: null,
      selectedStylist: null,
      selectedDate: null,
      selectedTime: null,
      clientInfo: null,
      isConfirmed: false,
    });
  }, []);

  return {
    steps,
    currentStep,
    currentStepIdx,
    direction,
    state,
    goNext,
    goBack,
    update,
    reset,
  };
}
