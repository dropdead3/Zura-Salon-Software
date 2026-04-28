import { useMemo } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import {
  getOrgDefaults,
  ORG_DEFAULTS_FALLBACKS,
  type OrgDefaults,
  type OrgMaterialityDefaults,
} from '@/types/orgDefaults';

export interface UseOrgDefaultsResult {
  currency: string;
  timezone: string;
  locale: string;
  /** Materiality block — note: persona-tier inference lives in useMaterialityThresholds. */
  materiality: Required<OrgMaterialityDefaults>;
  /** Raw defaults from org (no fallbacks, no inference). */
  raw: OrgDefaults;
}

/**
 * Returns the effective org's locale, currency, and timezone with safe fallbacks.
 * Use for formatting (formatCurrency, formatDate) and i18n.
 *
 * For materiality thresholds, prefer `useMaterialityThresholds()` — it layers
 * persona-tier inference on top of the raw override exposed here.
 */
export function useOrgDefaults(): UseOrgDefaultsResult {
  const { effectiveOrganization } = useOrganizationContext();
  return useMemo(() => {
    const raw = effectiveOrganization
      ? getOrgDefaults(effectiveOrganization.settings ?? null)
      : {};
    return {
      currency: raw.currency ?? ORG_DEFAULTS_FALLBACKS.currency,
      timezone: raw.timezone ?? ORG_DEFAULTS_FALLBACKS.timezone,
      locale: raw.locale ?? ORG_DEFAULTS_FALLBACKS.locale,
      materiality: {
        execSummaryMinVolumeUsd:
          raw.materiality?.execSummaryMinVolumeUsd
          ?? ORG_DEFAULTS_FALLBACKS.materiality.execSummaryMinVolumeUsd,
        execSummaryFlatDeltaPct:
          raw.materiality?.execSummaryFlatDeltaPct
          ?? ORG_DEFAULTS_FALLBACKS.materiality.execSummaryFlatDeltaPct,
      },
      raw,
    };
  }, [effectiveOrganization]);
}
