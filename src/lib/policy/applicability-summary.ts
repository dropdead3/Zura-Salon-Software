/**
 * Policy applicability summary helpers — pure, reusable across surfaces.
 *
 * Extracted from `Policies.tsx` so the same grouping logic can power:
 *  - The Library hidden-chip breakdown ("8 extensions · 2 minors")
 *  - Future Command Center "applicability summary" tiles
 *  - Audit/compliance reports
 *
 * No React, no DB — just pure transformations over library entries + profile.
 */
import {
  isApplicableToProfile,
  applicabilityReason,
  type PolicyOrgProfile,
} from '@/hooks/policy/usePolicyOrgProfile';
import type { PolicyLibraryEntry } from '@/hooks/policy/usePolicyData';

export type HiddenByReason = Record<string, { label: string; count: number }>;

/**
 * Group library entries that are hidden by the org profile, keyed by the
 * `applicabilityReason().service` taxonomy ('extensions' | 'retail' |
 * 'packages' | 'minors'). Returns `{}` when profile is null (silence over
 * wrong number — matches `applicabilityReason`'s null-profile contract).
 */
export function computeHiddenByReason(
  library: PolicyLibraryEntry[],
  profile: PolicyOrgProfile | null | undefined,
): HiddenByReason {
  if (!profile) return {};
  const acc: HiddenByReason = {};
  for (const entry of library) {
    if (isApplicableToProfile(entry, profile)) continue;
    const reason = applicabilityReason(entry, profile);
    if (!reason) continue;
    if (!acc[reason.service]) acc[reason.service] = { label: reason.label, count: 0 };
    acc[reason.service].count += 1;
  }
  return acc;
}
