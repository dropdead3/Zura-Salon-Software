/**
 * Wave 28.7 — Policy ↔ Handbook section mapping helpers.
 *
 * The canonical mapping lives in the database (`policy_handbook_section_map`),
 * but we ship a deterministic in-code copy so the wizard can render hints
 * before its data has loaded. The DB is the source of truth — code falls back
 * silently if a mapping is missing.
 */

export interface PolicySectionLink {
  policyLibraryKey: string;
  handbookSectionKey: string;
  variantType: 'internal' | 'client' | 'disclosure' | 'manager_note';
}

export const POLICY_SECTION_LINKS: PolicySectionLink[] = [
  { policyLibraryKey: 'cancellation_fees', handbookSectionKey: 'attendance_policy', variantType: 'internal' },
  { policyLibraryKey: 'no_show_policy', handbookSectionKey: 'attendance_policy', variantType: 'internal' },
  { policyLibraryKey: 'late_arrival', handbookSectionKey: 'attendance_policy', variantType: 'internal' },
  { policyLibraryKey: 'refund_policy', handbookSectionKey: 'service_guarantees', variantType: 'internal' },
  { policyLibraryKey: 'redo_policy', handbookSectionKey: 'service_guarantees', variantType: 'internal' },
  { policyLibraryKey: 'tipping_policy', handbookSectionKey: 'compensation', variantType: 'internal' },
  { policyLibraryKey: 'commission_structure', handbookSectionKey: 'compensation', variantType: 'internal' },
  { policyLibraryKey: 'dress_code', handbookSectionKey: 'workplace_conduct', variantType: 'internal' },
  { policyLibraryKey: 'social_media', handbookSectionKey: 'workplace_conduct', variantType: 'internal' },
  { policyLibraryKey: 'client_communication', handbookSectionKey: 'workplace_conduct', variantType: 'internal' },
  { policyLibraryKey: 'color_correction', handbookSectionKey: 'service_standards', variantType: 'internal' },
  { policyLibraryKey: 'extension_care', handbookSectionKey: 'service_standards', variantType: 'internal' },
  { policyLibraryKey: 'product_returns', handbookSectionKey: 'retail_operations', variantType: 'internal' },
  { policyLibraryKey: 'chair_rental', handbookSectionKey: 'booth_rental', variantType: 'internal' },
  { policyLibraryKey: 'pto_policy', handbookSectionKey: 'time_off', variantType: 'internal' },
  { policyLibraryKey: 'sick_leave', handbookSectionKey: 'time_off', variantType: 'internal' },
  { policyLibraryKey: 'shift_swaps', handbookSectionKey: 'scheduling', variantType: 'internal' },
  { policyLibraryKey: 'overtime_policy', handbookSectionKey: 'scheduling', variantType: 'internal' },
];

const SECTION_TO_POLICIES = new Map<string, PolicySectionLink[]>();
const POLICY_TO_SECTIONS = new Map<string, PolicySectionLink[]>();
for (const link of POLICY_SECTION_LINKS) {
  if (!SECTION_TO_POLICIES.has(link.handbookSectionKey)) SECTION_TO_POLICIES.set(link.handbookSectionKey, []);
  SECTION_TO_POLICIES.get(link.handbookSectionKey)!.push(link);
  if (!POLICY_TO_SECTIONS.has(link.policyLibraryKey)) POLICY_TO_SECTIONS.set(link.policyLibraryKey, []);
  POLICY_TO_SECTIONS.get(link.policyLibraryKey)!.push(link);
}

/** Returns the set of policy library_keys that can back a given handbook section. */
export function policiesForSection(handbookSectionKey: string): PolicySectionLink[] {
  return SECTION_TO_POLICIES.get(handbookSectionKey) ?? [];
}

/** Returns handbook sections a given policy can be wired into. */
export function sectionsForPolicy(policyLibraryKey: string): PolicySectionLink[] {
  return POLICY_TO_SECTIONS.get(policyLibraryKey) ?? [];
}

/** Quick boolean: does a section have any candidate policy backing? */
export function sectionHasPolicyOption(handbookSectionKey: string): boolean {
  return SECTION_TO_POLICIES.has(handbookSectionKey);
}
