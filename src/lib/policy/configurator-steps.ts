/**
 * Policy Configurator step metadata (Wave 28.13)
 *
 * Single source of truth for the 4-step linear flow that replaced the
 * Rules / Applicability / Surfaces / Drafts / Acknowledgments tab strip.
 *
 * Step labels are operator-outcome verbs (Define, Decide, Choose, Approve)
 * — never platform-internal jargon. Acknowledgments is intentionally NOT
 * a step: it's a read-only audit log surfaced from the panel header.
 */

export type StepId = 'rules' | 'applicability' | 'surfaces' | 'drafts';

export interface StepMeta {
  id: StepId;
  /** Short label rendered inside the stepper circle row. */
  label: string;
  /** One-sentence purpose statement rendered under the active step. */
  purpose: string;
  /** Footer CTA label, used only when the panel renders the CTA itself
   * (rules + drafts steps). Applicability + surfaces editors render their
   * own internal Save buttons. */
  cta: string;
}

export const STEP_META: Record<StepId, StepMeta> = {
  rules: {
    id: 'rules',
    label: 'Define rules',
    purpose:
      'The structured decisions that make this policy concrete. AI drafting later turns these into prose; it cannot invent rules.',
    cta: 'Save rules and continue',
  },
  applicability: {
    id: 'applicability',
    label: 'Decide who',
    purpose:
      'Pick the team members and clients this policy governs. Defaults are pre-filled from your business profile.',
    cta: 'Save scope and continue',
  },
  surfaces: {
    id: 'surfaces',
    label: 'Choose where it shows',
    purpose:
      'Where this policy renders — handbook, intake, booking confirmation, public policy page. Internal-only policies skip this step.',
    cta: 'Save surfaces and continue',
  },
  drafts: {
    id: 'drafts',
    label: 'Approve wording',
    purpose:
      'Review the AI-generated prose for each surface and approve the wording your operators and clients will see.',
    cta: 'Approve wording',
  },
};

/** Ordered list of step ids; consumer hides `surfaces` for internal-only policies. */
export const STEP_ORDER: StepId[] = ['rules', 'applicability', 'surfaces', 'drafts'];

/** Build the visible step list for a given policy audience. */
export function getVisibleSteps(audience: 'internal' | 'external' | 'both'): StepMeta[] {
  return STEP_ORDER.filter((id) => (audience === 'internal' ? id !== 'surfaces' : true)).map(
    (id) => STEP_META[id],
  );
}
