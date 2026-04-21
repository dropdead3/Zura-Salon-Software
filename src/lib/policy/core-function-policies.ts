/**
 * Core Function Policies — the empirical subset of `required` policies whose
 * values are read at runtime by edge functions or production surfaces (POS,
 * public booking, dispute submission, etc.).
 *
 * Doctrine (per `mem://features/policy-os-applicability-doctrine`):
 *  - These policies do NOT block POS or booking. Platform defaults always
 *    render so the software works out of the box.
 *  - The Policies page surfaces this tier as a soft nudge — operators can see
 *    which 6 levers actually move POS/booking outputs vs. the broader
 *    governance set.
 *  - Selection rule: a policy belongs here only if at least one edge function
 *    or production surface reads its values at runtime. Opinion does not
 *    qualify a policy for this list.
 *
 * If you add a key here, also add it to `policy_library` with
 * `recommendation = 'required'` — the dev-time guard test enforces this.
 */
export const CORE_FUNCTION_POLICY_KEYS = [
  'booking_policy',
  'deposit_policy',
  'cancellation_policy',
  'no_show_policy',
  'payment_policy',
  'chargeback_dispute',
] as const;

export type CoreFunctionPolicyKey = (typeof CORE_FUNCTION_POLICY_KEYS)[number];

/**
 * One-line consumer label rendered on each Core Function policy card.
 * Names what the platform DOES with the policy values — not what the policy
 * "is about." Keeps copy neutral and verb-led.
 */
export const CORE_FUNCTION_CONSUMERS: Record<CoreFunctionPolicyKey, string> = {
  booking_policy: 'Powers the public booking page',
  deposit_policy: 'Drives deposit collection at booking',
  cancellation_policy: 'Drives the fee charged when a client cancels late',
  no_show_policy: 'Drives the fee charged when a client no-shows',
  payment_policy: 'Renders on receipts and the public booking page',
  chargeback_dispute: 'Pre-loads dispute evidence in PaymentOps',
};

export const CORE_FUNCTION_DEFAULT_FALLBACK_LABEL =
  'Using platform default — configure to make it yours.';

export function isCoreFunctionPolicy(key: string): key is CoreFunctionPolicyKey {
  return (CORE_FUNCTION_POLICY_KEYS as readonly string[]).includes(key);
}
