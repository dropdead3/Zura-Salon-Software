

## Goal
Promote the session-gate pattern into a reusable hook, add an operator-facing animation intensity toggle, and sweep remaining high-traffic counters with stable keys.

## Layer 1 — `useFirstSessionAnimation(key)` hook

New file: `src/hooks/useFirstSessionAnimation.ts`

```ts
export function useFirstSessionAnimation(key: string | undefined): {
  shouldAnimate: boolean;  // true on first session mount, false after
  markAnimated: () => void; // call when animation completes (or starts)
}
```

Behavior:
- No `key` → always returns `shouldAnimate: true` (current default)
- With `key` → checks `sessionStorage.getItem(\`counter-animated::${key}\`)`. Returns `false` if already marked.
- `markAnimated()` writes the flag (idempotent, try/catch wrapped)

Refactor `AnimatedBlurredAmount`, `AnimatedNumber`, and `use-counter-animation` to use this hook instead of inline `sessionStorage` reads. Removes ~20 lines of duplicated logic across three files. Future counters opt in with one line:
```tsx
const { shouldAnimate, markAnimated } = useFirstSessionAnimation('cc-some-counter');
```

## Layer 2 — Global animation intensity toggle

### Data
Add to `user_preferences` table (already exists, holds `custom_theme`, `custom_typography`):
- New column `animation_intensity text default 'standard'` — values: `'calm' | 'standard' | 'off'`

### Hook
New: `src/hooks/useAnimationIntensity.ts`
- Reads from `user_preferences.animation_intensity`
- Writes a CSS variable on `<html>`: `--animation-intensity-multiplier` (`0`, `1`, `1.5` for off/standard/calm)
- Also sets a class on `<html>`: `animations-off | animations-calm | animations-standard`

### CSS hook
In `src/index.css` add:
```css
.animations-off *, .animations-off *::before, .animations-off *::after {
  animation-duration: 0.001ms !important;
  transition-duration: 0.001ms !important;
}
```
For `'calm'`: counters honor the multiplier by reading the CSS var in JS (or simply respect `prefers-reduced-motion`-like behavior for `'off'`). Counter components check `intensity === 'off'` → snap to value (same code path as reduced-motion).

### UI
Add to **Account Settings → Preferences** (find existing settings page; likely `src/pages/dashboard/admin/Settings.tsx` or a profile preferences sub-page) a 3-button segmented control:
- **Calm** — slower, subtler animations
- **Standard** — default
- **Off** — instant, no animation

Persists immediately on change. Applies app-wide.

### Initialization
Mount logic in a small `<AnimationIntensityInitializer />` component (mirrors `ThemeInitializer` pattern). Loads on auth-ready, applies class to `<html>`, listens for `SIGNED_OUT` to reset.

## Layer 3 — Sweep remaining call sites

Audit all `AnimatedBlurredAmount` and `AnimatedNumber` usages. Add stable `animationKey` to ones that re-mount frequently (dashboard widgets, KPI cards). Confirmed/likely targets:

| Component | Key |
|---|---|
| `TrueProfitCard` | `cc-true-profit` |
| `GoalTrackerCard` (each metric) | `cc-goal-{metric-id}` |
| `SalesStatsCard` (revenue/transactions) | `cc-sales-{metric}` |
| `CoachingSummaryCard` numerals | `cc-coaching-{metric}` |
| `TodaysPrepSection` value totals | `cc-prep-{metric}` |
| Analytics Hub KPI tiles (if AnimatedBlurredAmount-based) | `analytics-{page}-{metric}` |

Will discover the full list via grep during implementation. Key naming convention: `{surface}-{metric}` — stable across mounts, unique across the app.

Out of scope: counters inside *modals/dialogs* (those mount on intentional user action — re-animation is fine), and counters where the same component renders many instances dynamically (e.g., per-row in a table — keys would collide).

## Files to create
1. `src/hooks/useFirstSessionAnimation.ts`
2. `src/hooks/useAnimationIntensity.ts`
3. `src/components/AnimationIntensityInitializer.tsx`

## Files to modify
1. `src/components/ui/AnimatedBlurredAmount.tsx` — adopt hook
2. `src/components/ui/AnimatedNumber.tsx` — adopt hook
3. `src/hooks/use-counter-animation.ts` — adopt hook
4. `src/index.css` — `.animations-off` rule
5. `src/main.tsx` or `App.tsx` — mount `AnimationIntensityInitializer`
6. Account/preferences settings page — add intensity toggle UI
7. ~6–10 counter call sites — add `animationKey` props
8. Migration: add `animation_intensity` column to `user_preferences`

## Verification signal
- New counter component using `useFirstSessionAnimation('foo')` animates once per session, snaps thereafter
- Settings → Preferences → "Animations: Off" → all counters snap to value, page transitions are instant
- Settings → "Calm" → counter durations feel slower/calmer
- Setting persists across login/logout
- All swept counters (TrueProfit, Goals, Sales, Coaching, Prep) animate only on first session land

## Ship order
1. Hook + counter refactor (low risk, removes duplication)
2. Migration + intensity toggle backend + initializer
3. Settings UI + sweep call sites

