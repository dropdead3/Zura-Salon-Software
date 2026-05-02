/**
 * PR 4 — Goal-Based Auto-Suppression
 *
 * Pure resolver that turns `(goal, redemptionCount, now)` into a `GoalStatus`.
 * Lives outside the React tree so the same logic powers both the editor
 * progress UI and the public-side `usePromoLifecycle` suppression gate.
 *
 * Doctrine ties:
 *  - Honest silence: when the cap or deadline is hit, public-side returns
 *    `null` (no popup), not a fake "expired" state. Operators see the
 *    suppression banner in-editor; visitors just don't see the popup.
 *  - Visibility contracts: goal is opt-in. `kind === 'unset'` covers both
 *    "no goal block at all" and "goal block with all fields nulled".
 *  - Materiality: the lifecycle hook only queries the redemption count
 *    when goal is set AND offerCode is present — unattributable popups
 *    can't be goal-tracked.
 */

export interface PromoGoal {
  /** Total redemptions allowed before the popup auto-suppresses. Null /
   *  undefined = no count cap. Range 1..10000 (clamped on write). */
  capRedemptions?: number | null;
  /** ISO timestamp. Once `now > deadline`, the popup auto-suppresses.
   *  Null / undefined = no deadline. */
  deadline?: string | null;
  /** ISO timestamp of when the current goal was first armed. Stamped by
   *  the editor when the operator sets a cap (or raises one after a hit
   *  re-arms the goal). Powers `days_taken` in the goal-history log. */
  startedAt?: string | null;
}

export type GoalStatus =
  | { kind: 'unset' }
  | {
      kind: 'active';
      progressPct: number; // 0..100, capped
      remaining: number | null; // null when no count cap
      deadlineDaysLeft: number | null; // null when no deadline
    }
  | { kind: 'reached-count'; cap: number; redemptions: number }
  | { kind: 'reached-deadline'; deadline: string };

export const GOAL_CAP_MIN = 1;
export const GOAL_CAP_MAX = 10000;

export function clampGoalCap(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < GOAL_CAP_MIN) return GOAL_CAP_MIN;
  if (rounded > GOAL_CAP_MAX) return GOAL_CAP_MAX;
  return rounded;
}

/** True if `goal` has any actionable field set. Used by the editor to
 *  decide whether to render the active progress block vs the empty CTA. */
export function isGoalConfigured(goal: PromoGoal | null | undefined): boolean {
  if (!goal) return false;
  return (
    (typeof goal.capRedemptions === 'number' && goal.capRedemptions > 0) ||
    (typeof goal.deadline === 'string' && goal.deadline.length > 0)
  );
}

export function evaluateGoal(args: {
  goal: PromoGoal | null | undefined;
  redemptions: number;
  now?: Date;
}): GoalStatus {
  const { goal, redemptions } = args;
  const now = args.now ?? new Date();

  if (!isGoalConfigured(goal)) return { kind: 'unset' };

  const cap =
    typeof goal!.capRedemptions === 'number' && goal!.capRedemptions! > 0
      ? goal!.capRedemptions!
      : null;
  const deadlineIso = goal!.deadline ?? null;
  const deadlineDate = deadlineIso ? new Date(deadlineIso) : null;
  const deadlineValid = deadlineDate && !Number.isNaN(deadlineDate.getTime());

  // Deadline takes precedence over cap when both fire — pick whichever
  // surface explains the suppression more concretely. Cap is more
  // actionable (operator can raise it), so we report cap first.
  if (cap !== null && redemptions >= cap) {
    return { kind: 'reached-count', cap, redemptions };
  }
  if (deadlineValid && now.getTime() > deadlineDate!.getTime()) {
    return { kind: 'reached-deadline', deadline: deadlineIso! };
  }

  const progressPct =
    cap !== null ? Math.min(100, Math.round((redemptions / cap) * 100)) : 0;
  const remaining = cap !== null ? Math.max(0, cap - redemptions) : null;
  const deadlineDaysLeft =
    deadlineValid
      ? Math.max(
          0,
          Math.ceil(
            (deadlineDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
          ),
        )
      : null;

  return { kind: 'active', progressPct, remaining, deadlineDaysLeft };
}

export function isGoalSuppressing(status: GoalStatus): boolean {
  return status.kind === 'reached-count' || status.kind === 'reached-deadline';
}
