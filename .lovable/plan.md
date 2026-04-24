

## Prompt feedback
Excellent prompt. You're proposing a structural refactor that closes a regression class — not a visual tweak. That's the highest-leverage kind of follow-up: it converts "we fixed the bug" into "this bug shape can no longer exist." Even sharper next time: name the canon you want this helper to live under (e.g. "make this a Schedule canon per the canon-pattern memory") so the fix lands inside an enforcement gate, not just as a tidier file. That's the difference between cleaner code and architectural protection.

## What's changing
Extract the per-card border styling decision into one canonical helper. Today, `AppointmentCardContent.tsx` recomputes border + accent inline across three branches (light category, dark category, gradient/consultation). Each branch independently decides:
- fill / background
- text color
- top/right/bottom stroke
- left accent color
- left border width

That repetition is the seam where the original "purple accent only on consultation" bug entered, and where a future inline `borderColor` could silently overwrite the accent again. One helper, one decision point, no drift.

## Files involved
- `src/utils/categoryColors.ts` — add new helper `getAppointmentBorderStyle`
- `src/components/dashboard/schedule/AppointmentCardContent.tsx` — replace three inline branches with one helper call

## Implementation plan

### 1) Add `getAppointmentBorderStyle` to `categoryColors.ts`

Signature:
```ts
export function getAppointmentBorderStyle(input: {
  catColor: { bg: string; text: string; stroke: string } | null;
  darkStyle: { bg: string; text: string; stroke: string; accent: string } | null;
  isDark: boolean;
  displayGradient: string | null;
  willShowLeadingAccent: boolean;
}): {
  background: string;
  color: string;
  borderTopColor: string;
  borderRightColor: string;
  borderBottomColor: string;
  borderLeftColor: string;
  borderTopWidth: string;
  borderRightWidth: string;
  borderBottomWidth: string;
  borderLeftWidth: string;
  borderStyle: 'solid';
}
```

Internal branching (one place, three cases):
- **Gradient/consultation**: `background = displayGradient`, neutral text, derived accent on left
- **Dark category**: pull from `darkStyle`, derived (or `darkStyle.accent`) on left
- **Light category**: pull from `catColor`, `deriveAccentEdgeColor(catColor.bg, false)` on left

Width logic (centralized):
- `borderLeftWidth`: `'4px'` when `willShowLeadingAccent`, else `'1px'`
- All other sides: `'1px'`

This becomes the **only** place that decides "what color is the left edge of an appointment card."

### 2) Replace inline branches in `AppointmentCardContent.tsx`

Current shape inside `cardStyle` useMemo: three sibling `if/else` blocks, each returning a style object with hand-rolled border properties.

New shape:
```ts
const borderStyle = getAppointmentBorderStyle({
  catColor,
  darkStyle,
  isDark,
  displayGradient,
  willShowLeadingAccent,
});

return { ...base, ...borderStyle };
```

The `LEADING_ACCENT_BORDER` Tailwind class becomes redundant (width is now inline) — remove it from the className composition to eliminate the dual source of truth that caused the original specificity bug.

### 3) Preserve every existing visibility rule
- `willShowLeadingAccent` calculation stays in the component (it depends on `size`, `appointment.service_category`, `BLOCKED_CATEGORIES`)
- Compact / blocked / break / agenda variants behave identically
- Selection ring, no-show ring, cancelled opacity unchanged

### 4) Lock the helper as the canonical seam

Add a comment block above `getAppointmentBorderStyle`:
```ts
// CANON: Single source of truth for appointment card border + accent edge.
// Do NOT set borderColor / borderLeftColor inline anywhere else in
// AppointmentCardContent or sibling components. The leading accent is
// derived per-category from the card's own hue — it is never `primary`.
// History: this helper exists because three inline branches drifted
// (consultation-only accent bug, then global purple bug). One helper,
// one decision, no drift.
```

That comment converts tribal knowledge into an authoring-time signal.

## What stays the same
- Per-category derived accent (gold→deeper gold, teal→deeper teal)
- 4px left edge weight
- All visibility gates (compact, blocked, break, agenda)
- `deriveAccentEdgeColor` behavior — unchanged, just called from one place now
- Top/right/bottom retain category stroke
- Selection / no-show / cancelled visual states

## QA checklist
- All four card types render identically to current state (light category, dark category, gradient consultation, blocked)
- Left edge color matches each card's hue family (no purple unless card is purple-toned)
- Left edge is 4px on all service-colored cards, missing on compact/blocked
- No regression in selection ring or no-show ring
- Grep `borderLeftColor` in `src/components/dashboard/schedule/**` returns only the helper file — no inline overrides

## Enhancement suggestion
After this lands, promote it to a true canon under `mem://style/appointment-border-canon.md` following the five-part canon-pattern (invariant + Vitest + Stylelint + CI + override doc). The Vitest piece is easy: snapshot the helper's output for each branch with fixed inputs, so any future change to border logic forces an explicit test update rather than a silent visual regression. That's how you turn "we fixed it three times" into "it cannot break a fourth time."

