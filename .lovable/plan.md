

## Prompt review

Clear intent backed by a screenshot — you correctly noticed the ADD EVENT drawer feels less premium than the BookingWizard. Teaching note: naming the *specific* visual delta you want propagated ("the darker, dimmer backdrop and bolder glass contrast from the booking wizard") would have skipped a discovery step. Micro-improvement: when asking for cross-surface consistency, mention whether you want the change at the **shared component level** (one place) or **per consumer** (multiple places). Shared is almost always better and is what we'll do here.

## Diagnosis

All drawers already use the same `PremiumFloatingPanel` shell, which provides:
- `bg-card/80 backdrop-blur-xl` — the glass panel itself
- `border border-border shadow-2xl` — the frame

So the **panel glass is already identical** across BookingWizard, ScheduleEntryDrawer, MeetingSchedulerWizard, ProviderDetailSheet, AIChatPanel, mobile sheets, etc.

The only meaningful delta is the **backdrop dimming**:
- Default: `bg-black/20 backdrop-blur-sm` — light, washy
- BookingWizard override: `bg-black/40` — noticeably darker, makes the glass pop

That's why the ADD EVENT drawer in your screenshot feels "lighter" than the booking wizard — the page behind it isn't dimmed enough, so the glass edge contrast is weaker.

## Fix

Promote the BookingWizard's backdrop treatment to be the **canonical default** in `PremiumFloatingPanel`, so every drawer inherits the same premium dim + blur.

### 1. `src/components/ui/premium-floating-panel.tsx`
- Change default backdrop from `bg-black/20 backdrop-blur-sm` → `bg-black/40 backdrop-blur-md`
  - Darker dim (matches booking)
  - Slightly stronger blur (`md` vs `sm`) for a more premium depth feel
- Keep `backdropClassName` prop so any consumer can still override if needed

### 2. `src/components/dashboard/schedule/booking/BookingWizard.tsx`
- Remove the now-redundant `backdropClassName="bg-black/40"` override (it'll be the default)
- This proves the unification — booking wizard renders identically with zero per-consumer config

### 3. No changes needed to the 30+ other consumers
They all automatically pick up the upgraded backdrop because they use the shared component without overriding `backdropClassName`.

## Acceptance checks

1. ADD EVENT drawer (ScheduleEntryDrawer) backdrop matches BookingWizard exactly — same dim, same blur strength.
2. BookingWizard looks identical to before (since the new default equals its prior override).
3. All other drawers (Meeting wizard, Provider sheet, AI chat panel, mobile sheets, scheduled reports history, sidebar mobile) feel one tier more premium with the deeper dim.
4. The God Mode bar offset on the backdrop still works (untouched logic).
5. No regressions in mobile (full-screen panels — backdrop is hidden behind the panel anyway).

## Out of scope

- Restyling the panel surface itself (already unified at `bg-card/80 backdrop-blur-xl`).
- Touching individual drawer headers, padding, or content layout.
- Animation tuning (spring physics already shared).
- Dialog/Drawer primitives outside `PremiumFloatingPanel` (e.g., shadcn Dialog) — those are governed by `drilldownDialogStyles.ts` separately.

## Files to touch

- `src/components/ui/premium-floating-panel.tsx` — upgrade default backdrop class.
- `src/components/dashboard/schedule/booking/BookingWizard.tsx` — drop now-redundant `backdropClassName` prop.

## Further enhancement suggestions

- Add a `tokens.panel.backdrop` and `tokens.panel.glass` entry to `design-tokens.ts` so the canonical drawer treatment is declared once and referenced by name.
- Consider a quick visual sweep of shadcn `Dialog`/`Sheet` usage to align *those* backdrops with the same `bg-black/40 backdrop-blur-md` treatment for cross-primitive consistency.
- Add a Storybook-style "Drawer Gallery" page in dev-only routes so future drawers can be eyeballed against the canonical reference at a glance.

