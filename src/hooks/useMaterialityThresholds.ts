import { useMemo } from 'react';
import { useOrgDefaults } from './useOrgDefaults';
import { useLocations } from './useLocations';
import type { OrgMaterialityDefaults } from '@/types/orgDefaults';

/**
 * Persona-tiered materiality thresholds for analytics gates (e.g. Executive Summary
 * delta suppression). A $500 floor is correct for a multi-location owner and absurd
 * for a solo stylist on $200 days, so the gate scales with operator size.
 *
 * Resolution order (first non-null wins):
 *   1. Explicit override on `organization.settings.defaults.materiality`
 *   2. Tier inferred from active location count
 *   3. Owner-tier fallback from ORG_DEFAULTS_FALLBACKS
 *
 * Tier table:
 *   solo   (≤1 active location)  → $100 / 2%
 *   owner  (2–3 active locations) → $500 / 2%
 *   multi  (≥4 active locations)  → $2,000 / 2%
 */
const TIER_DEFAULTS: Record<'solo' | 'owner' | 'multi', Required<OrgMaterialityDefaults>> = {
  solo: { execSummaryMinVolumeUsd: 100, execSummaryFlatDeltaPct: 2 },
  owner: { execSummaryMinVolumeUsd: 500, execSummaryFlatDeltaPct: 2 },
  multi: { execSummaryMinVolumeUsd: 2000, execSummaryFlatDeltaPct: 2 },
};

export type MaterialityTier = keyof typeof TIER_DEFAULTS;

function inferTierFromLocationCount(activeCount: number): MaterialityTier {
  if (activeCount <= 1) return 'solo';
  if (activeCount <= 3) return 'owner';
  return 'multi';
}

export interface UseMaterialityThresholdsResult extends Required<OrgMaterialityDefaults> {
  /** Inferred tier (or 'owner' when an explicit override fully covers the values). */
  tier: MaterialityTier;
  /** True when values came from organization.settings rather than inference. */
  isExplicit: boolean;
}

export function useMaterialityThresholds(): UseMaterialityThresholdsResult {
  const { raw } = useOrgDefaults();
  const { data: locations } = useLocations();

  return useMemo(() => {
    const activeCount = (locations ?? []).filter(l => l.is_active).length;
    const tier = inferTierFromLocationCount(activeCount);
    const tierDefaults = TIER_DEFAULTS[tier];

    const override = raw.materiality;
    const minVolume = override?.execSummaryMinVolumeUsd ?? tierDefaults.execSummaryMinVolumeUsd;
    const flatPct = override?.execSummaryFlatDeltaPct ?? tierDefaults.execSummaryFlatDeltaPct;

    const isExplicit =
      typeof override?.execSummaryMinVolumeUsd === 'number' ||
      typeof override?.execSummaryFlatDeltaPct === 'number';

    return {
      execSummaryMinVolumeUsd: minVolume,
      execSummaryFlatDeltaPct: flatPct,
      tier,
      isExplicit,
    };
  }, [raw.materiality, locations]);
}
