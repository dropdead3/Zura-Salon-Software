/**
 * Shared questionnaire preset library (Wave 28.14)
 *
 * Curated answer anchors used by the Policy Configurator's questionnaire mode.
 * Each preset list represents a sensible starting point — never the only option.
 * Schemas reference these by spreading them into a field's `presets` array so
 * the same "12h / 24h / 48h" rhythm renders consistently across cancellation,
 * no-show, and deposit-window questions.
 *
 * Doctrine: Recommendations are derived, not opinionated — `recommended: true`
 * marks the industry-standard pick. Operators can always pick another preset
 * or enter a custom value (the underlying input remains).
 */
import type { RuleField } from './configurator-schemas';

export type RulePreset = NonNullable<RuleField['presets']>[number];

/** Notice windows for cancellation / reschedule / deposit forfeit decisions. */
export const NOTICE_WINDOW_PRESETS: RulePreset[] = [
  { value: 12, label: '12 hours', sublabel: 'Faster table turn' },
  { value: 24, label: '24 hours', sublabel: 'Industry standard', recommended: true },
  { value: 48, label: '48 hours', sublabel: 'High-end / specialty' },
];

/** Cancellation fee size as a percentage of the service total. */
export const CANCELLATION_FEE_PCT_PRESETS: RulePreset[] = [
  { value: 25, label: '25%', sublabel: 'Light protection' },
  { value: 50, label: '50%', sublabel: 'Industry standard', recommended: true },
  { value: 100, label: '100%', sublabel: 'Full forfeit' },
];

/** No-show fee size as a percentage of the service total. */
export const NO_SHOW_FEE_PCT_PRESETS: RulePreset[] = [
  { value: 50, label: '50%', sublabel: 'Partial recovery' },
  { value: 100, label: '100%', sublabel: 'Industry standard', recommended: true },
];

/** Deposit size as a percentage of the service total. */
export const DEPOSIT_PCT_PRESETS: RulePreset[] = [
  { value: 15, label: '15%', sublabel: 'Light commitment' },
  { value: 25, label: '25%', sublabel: 'Industry standard', recommended: true },
  { value: 50, label: '50%', sublabel: 'High-cost services' },
];

/** Service-recovery / redo windows in days. */
export const REDO_WINDOW_PRESETS: RulePreset[] = [
  { value: 3, label: '3 days', sublabel: 'Tight window' },
  { value: 7, label: '7 days', sublabel: 'Industry standard', recommended: true },
  { value: 14, label: '14 days', sublabel: 'Generous window' },
];

/** Retail return windows in days. */
export const RETURN_WINDOW_PRESETS: RulePreset[] = [
  { value: 7, label: '7 days', sublabel: 'Tight window' },
  { value: 14, label: '14 days', sublabel: 'Industry standard', recommended: true },
  { value: 30, label: '30 days', sublabel: 'Generous window' },
];

/** Standard role anchors for "who can waive / approve / enforce" questions. */
export const AUTHORITY_ROLE_PRESETS: RulePreset[] = [
  { value: 'lead_stylist', label: 'Lead Stylist', sublabel: 'Floor-level call' },
  { value: 'manager', label: 'Manager', sublabel: 'Industry standard', recommended: true },
  { value: 'owner', label: 'Owner', sublabel: 'Owner-only call' },
];

/** Escalation roles — slightly different anchor than authority roles. */
export const ESCALATION_ROLE_PRESETS: RulePreset[] = [
  { value: 'manager', label: 'Manager', sublabel: 'Standard escalation' },
  { value: 'owner', label: 'Owner', sublabel: 'Industry standard', recommended: true },
];
