import { useMemo } from 'react';
import { MICRO_FINANCING_USE_CASES, type MicroFinancingUseCase } from '@/config/capital-engine/stylist-financing-config';
import { isMicroFinancingEligible } from '@/lib/capital-engine/stylist-spi-engine';

interface EligibleUseCase {
  key: MicroFinancingUseCase;
  label: string;
  description: string;
  maxAmount: number;
  typicalRange: string;
}

export function useStylistFinancingEligibility(spi: number | null, ors: number | null) {
  const eligibleUseCases = useMemo<EligibleUseCase[]>(() => {
    if (spi === null) return [];

    return (Object.entries(MICRO_FINANCING_USE_CASES) as [MicroFinancingUseCase, typeof MICRO_FINANCING_USE_CASES[MicroFinancingUseCase]][])
      .filter(([, useCase]) => isMicroFinancingEligible(spi, ors, useCase))
      .map(([key, useCase]) => ({
        key,
        label: useCase.label,
        description: useCase.description,
        maxAmount: useCase.maxAmount,
        typicalRange: useCase.typicalRange,
      }));
  }, [spi, ors]);

  return {
    eligibleUseCases,
    hasEligibleFinancing: eligibleUseCases.length > 0,
  };
}
