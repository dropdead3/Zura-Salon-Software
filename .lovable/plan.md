# PR 4 — Goal-Based Auto-Suppression

**Prompt feedback:** Tight pick. "Goal-based auto-suppression" earns its place because it solves a real operator failure mode (over-redeeming a capacity-constrained promo overnight) and pairs naturally with the funnel data we already have. Even better next time: hint at the *suppression mechanic* you prefer — soft pause (visitor sees nothing, operator sees a banner) vs hard disable (toggle flips off). I've defaulted to soft pause below since it preserves the experiment + schedule state, but flag it now if you want hard disable instead.

## What ships

A `goal` block on the popup wrapper config that lets operators set a redemption-count cap (and optionally a calendar deadline). When the live redemption count for the wrapper's `offerCode` hits the cap, the popup auto-suppresses for new visitors. The wrapper card surfaces a progress gauge and a banner explaining the suppressed state. Operators can raise the cap or clear the goal in one click to re-arm.

Three doctrine ties:
- **Honest silence** — when goal is hit, public-side returns `null` (no popup), not a fake "expired" state. Operators see the suppression in-editor; visitors just don't see the popup.
- **Visibility contracts** — the goal block is opt-in. When goal is unset, the card stays out of the way (collapsed/empty state).
- **Materiality** — progress copy only renders when the operator has set a goal AND the popup has an `offerCode`. Unattributable popups can't be goal-tracked.

## Surfaces

```text
Editor                                     Public site
┌─────────────────────────────────┐        ┌─────────────────────────┐
│ PromotionalPopupEditor          │        │ PromotionalPopup        │
│  ├─ Wrapper card                │        │  ├─ usePromoLifecycle   │
│  ├─ PopupAnalyticsCard          │        │  │   isGoalSuppressed?  │
│  ├─ PromoScheduleCard           │        │  └─ returns null when   │
│  ├─ PromoExperimentCard         │        │      suppressed         │
│  └─ PromoGoalCard      ← NEW    │        └─────────────────────────┘
└─────────────────────────────────┘
```

## Files

**New**
- `src/lib/promo-goal.ts` — pure `evaluateGoal({ goal, redemptions, now })` returning `{ status: 'unset' | 'active' | 'reached-count' | 'reached-deadline'; progressPct; remaining }`. Plus `clampGoalCap` (1–10000) and `isGoalSuppressing` helper.
- `src/lib/promo-goal.test.ts` — 6+ unit tests covering: unset, active mid-run, hits cap exactly, exceeds cap (still suppressed), past deadline, deadline + count both set (whichever fires first wins).
- `src/components/dashboard/website-editor/promotional-popup/PromoGoalCard.tsx` — editor card. Cap input (number), optional deadline (datetime-local), live progress bar, "Goal reached — popup paused" banner with **Raise cap** + **Clear goal** actions. Pulls live redemption count from the existing global funnel hook.

**Edited**
- `src/hooks/usePromotionalPopup.ts` — extend `PromotionalPopupSettings` with optional `goal?: { capRedemptions?: number | null; deadline?: string | null }`. `isPopupActive` stays unchanged (goal evaluation needs live redemption data, so it lives in the lifecycle hook, not the pure config validator — same split as schedule resolution).
- `src/components/public/promo/usePromoLifecycle.ts` — fetch goal status (read live redemption count for the offerCode, same query the funnel uses but lighter — head-only count). When suppressed, `lifecycle.active` returns false; preview mode bypasses suppression so operators can still QA. Suppression decision memoized + refreshed on a 60s `staleTime` (no polling).
- `src/components/dashboard/website-editor/PromotionalPopupEditor.tsx` — mount `PromoGoalCard` between the wrapper card and `PopupAnalyticsCard` (goal is a wrapper-level concern, not analytics).
- `src/components/dashboard/website-editor/promotional-popup/PopupAnalyticsCard.tsx` — surface a small "Goal" chip in the header when goal is set + reached, so operators scanning analytics see the suppression state without scrolling to the goal card.

## Logic

```ts
// promo-goal.ts (sketch)
export interface PromoGoal {
  capRedemptions?: number | null;   // null/undefined = no count cap
  deadline?: string | null;          // ISO; null/undefined = no deadline
}

export type GoalStatus =
  | { kind: 'unset' }
  | { kind: 'active'; progressPct: number; remaining: number | null;
      deadlineDaysLeft: number | null }
  | { kind: 'reached-count'; cap: number; redemptions: number }
  | { kind: 'reached-deadline'; deadline: string };

export function evaluateGoal(args: {
  goal: PromoGoal | null | undefined;
  redemptions: number;
  now?: Date;
}): GoalStatus { /* pure */ }

export function isGoalSuppressing(status: GoalStatus): boolean {
  return status.kind === 'reached-count' || status.kind === 'reached-deadline';
}
```

```ts
// usePromoLifecycle.ts (delta)
const { data: redempCount } = useQuery({
  queryKey: ['promo-goal-count', orgId, cfg.offerCode],
  queryFn: () => supabase.from('promotion_redemptions')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('promo_code_used', cfg.offerCode)
    .eq('surface', 'promotional_popup'),
  enabled: !!orgId && !!cfg.offerCode && !!cfg.goal && !isPreview,
  staleTime: 60_000,
});
const goalStatus = evaluateGoal({ goal: cfg.goal, redemptions: redempCount ?? 0 });
const goalSuppressed = !isPreview && isGoalSuppressing(goalStatus);
// active = isPopupActive(cfg, surface) && !goalSuppressed
```

## Why no schema change

Storing `goal` on the existing `site_settings.promotional_popup` JSONB row is correct because:
- It's a wrapper-level config, not telemetry.
- Read-then-update via `writeSiteSettingDraft` matches the [Site Settings Persistence](mem://tech-decisions/site-settings-persistence-standard) canon.
- Redemption count is already queryable from `promotion_redemptions` — no new write path.

## Out of scope (deliberately)

- **Push notification when goal hit** — would belong in alert governance layer, separate PR.
- **Per-rotation or per-arm goals** — wrapper-level only for v1. Multi-goal would compound with experiment + schedule precedence in ways that need their own design pass.
- **Hard-disable on goal hit** — soft suppression preserves operator state. If you want hard-disable instead, say so and I'll flip the suppression to `setFormData({ enabled: false })` with toast confirmation.

## Tests

- `promo-goal.test.ts` — 6+ pure unit tests on the resolver (above).
- `PromoGoalCard.test.tsx` (small) — renders progress at 50%, surfaces "Goal reached" banner at 100%, Raise-cap action mutates correctly, Clear-goal removes the block.
- Existing `usePromotionalPopupFunnel` tests untouched.

## Further enhancements you'll likely want next

- **Goal forecast** — extrapolate days-to-hit-cap from current daily redemption velocity (we have 14-day trend already), surface as "On pace to hit goal in ~6 days".
- **Auto-extend deadline** — when count cap hits but deadline hasn't, suggest raising the cap by N% based on the velocity.
- **Goal history log** — when goal is hit, archive `{ cap, hit_at, days_taken }` so operators see "Last 3 free-haircut promos all hit cap in <48h — consider raising cap to 100".
