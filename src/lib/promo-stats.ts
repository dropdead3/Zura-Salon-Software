/**
 * A/B significance helper — Wald CI on the CTR delta between two arms.
 *
 * Doctrine alignment:
 *   - Materiality first: both arms must clear `MIN_IMPRESSIONS_FOR_RATES`
 *     (the same gate the funnel surfaces use). Below that we return
 *     `insufficient` so the editor can render "Need n more impressions"
 *     copy instead of a misleading "winner" badge.
 *   - Honest silence: when the 95% CI on (p_arm − p_control) straddles 0,
 *     we return `inconclusive`. We never claim a winner the math doesn't
 *     support — operators routinely call tests at n=120 because the UI
 *     showed +18% lift; this gate is the structural guardrail against it.
 *   - Pure: no React, no DB. Tested independently.
 *
 * Math (simple, intentionally not Bayesian):
 *   p_i  = clicks_i / impressions_i
 *   se   = sqrt( p_arm*(1-p_arm)/n_arm + p_control*(1-p_control)/n_control )
 *   ci95 = delta ± 1.96 * se
 *   Significant ⇔ entire CI on one side of zero.
 *
 * Wald CI is well-known to be optimistic at small n; the materiality gate
 * (MIN_IMPRESSIONS_FOR_RATES = 100 per arm) keeps us out of the worst of
 * its failure mode. We intentionally avoid Wilson / Jeffreys here — the
 * extra precision doesn't change the lever copy ("call it" vs. "wait").
 */

export const MIN_PER_ARM_IMPRESSIONS_FOR_SIGNIFICANCE = 100;
export const Z_95 = 1.96;

export type SignificanceState =
  | { kind: 'control' }
  | { kind: 'insufficient'; needed: number }
  | { kind: 'inconclusive'; deltaPct: number }
  | { kind: 'significant-up'; deltaPct: number; ciLowPct: number; ciHighPct: number }
  | { kind: 'significant-down'; deltaPct: number; ciLowPct: number; ciHighPct: number };

export interface ArmStats {
  impressions: number;
  ctaClicks: number;
}

/** Pure. Compares an arm against a designated control arm. */
export function ctrSignificance(
  arm: ArmStats,
  control: ArmStats,
  isControl: boolean,
): SignificanceState {
  if (isControl) return { kind: 'control' };

  const minN = MIN_PER_ARM_IMPRESSIONS_FOR_SIGNIFICANCE;
  const armShort = Math.max(0, minN - arm.impressions);
  const ctrlShort = Math.max(0, minN - control.impressions);
  const needed = Math.max(armShort, ctrlShort);
  if (needed > 0) return { kind: 'insufficient', needed };

  const pArm = arm.ctaClicks / arm.impressions;
  const pCtrl = control.ctaClicks / control.impressions;
  const delta = pArm - pCtrl;
  const se = Math.sqrt(
    (pArm * (1 - pArm)) / arm.impressions +
      (pCtrl * (1 - pCtrl)) / control.impressions,
  );
  const half = Z_95 * se;
  const low = delta - half;
  const high = delta + half;
  const deltaPct = delta * 100;
  const ciLowPct = low * 100;
  const ciHighPct = high * 100;

  if (low > 0) return { kind: 'significant-up', deltaPct, ciLowPct, ciHighPct };
  if (high < 0) return { kind: 'significant-down', deltaPct, ciLowPct, ciHighPct };
  return { kind: 'inconclusive', deltaPct };
}
