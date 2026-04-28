/**
 * Shape of organization.settings.defaults (locale, currency, timezone, materiality).
 * Used by platform AccountSettingsTab and dashboard formatting (formatCurrency, etc.).
 * Fallbacks when missing: currency USD, timezone America/New_York, locale en.
 */
export interface OrgMaterialityDefaults {
  /** USD floor below which delta comparisons are suppressed as noise. */
  execSummaryMinVolumeUsd?: number;
  /** ± % delta within which a comparison is rendered as "Flat". */
  execSummaryFlatDeltaPct?: number;
}

export interface OrgDefaults {
  currency?: string;
  timezone?: string;
  locale?: string;
  materiality?: OrgMaterialityDefaults;
}

export const ORG_DEFAULTS_FALLBACKS: Required<Omit<OrgDefaults, 'materiality'>> & {
  materiality: Required<OrgMaterialityDefaults>;
} = {
  currency: 'USD',
  timezone: 'America/New_York',
  locale: 'en',
  // Owner-tier defaults — used only when no org context AND no inferred tier.
  // Tier inference (solo/owner/multi) lives in useMaterialityThresholds.
  materiality: {
    execSummaryMinVolumeUsd: 500,
    execSummaryFlatDeltaPct: 2,
  },
};

export function getOrgDefaults(settings: unknown): OrgDefaults {
  if (!settings || typeof settings !== 'object') return {};
  const d = (settings as Record<string, unknown>).defaults;
  if (!d || typeof d !== 'object') return {};
  const defs = d as Record<string, unknown>;

  const materialityRaw = defs.materiality;
  let materiality: OrgMaterialityDefaults | undefined;
  if (materialityRaw && typeof materialityRaw === 'object') {
    const m = materialityRaw as Record<string, unknown>;
    materiality = {
      execSummaryMinVolumeUsd:
        typeof m.execSummaryMinVolumeUsd === 'number' ? m.execSummaryMinVolumeUsd : undefined,
      execSummaryFlatDeltaPct:
        typeof m.execSummaryFlatDeltaPct === 'number' ? m.execSummaryFlatDeltaPct : undefined,
    };
  }

  return {
    currency: typeof defs.currency === 'string' ? defs.currency : undefined,
    timezone: typeof defs.timezone === 'string' ? defs.timezone : undefined,
    locale: typeof defs.locale === 'string' ? defs.locale : undefined,
    materiality,
  };
}
