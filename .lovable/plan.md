
## Prompt review

Strong meta-prompt — you're proposing a UX refinement that addresses a subtle truth-vs-affordance gap: when the trigger shows "Alexis Heasley" in week view, the user can't tell whether *they* picked her or whether the system auto-resolved her. Good instinct to preserve structural honesty while improving discoverability.

Tighter framing for next time: specify the *form* you want (text suffix vs. icon vs. tooltip vs. badge). I'll infer the cleanest path: **muted text suffix** — most legible, no new icon vocabulary, works at small sizes.

## Diagnosis

In `ScheduleHeader.tsx`, the trigger label currently resolves to a plain stylist name when week view auto-resolves:
```tsx
if (view === 'week' && selectedStaffIds.length === 0 && weekViewStylistId) {
  const s = stylists.find(s => s.user_id === weekViewStylistId);
  if (s) return formatFullDisplayName(s.full_name, s.display_name);
}
```
No visual distinction between this auto-resolved state and a user-picked single stylist (`selectedStaffIds.length === 1`).

## Plan

**1. Return structured label from trigger logic**
- Refactor the trigger label computation to return `{ name: string, isAutoResolved: boolean }` instead of a plain string.
- `isAutoResolved = true` only when `view === 'week' && selectedStaffIds.length === 0 && weekViewStylistId` resolves a stylist.

**2. Render muted suffix in trigger**
- In the trigger JSX, render the name normally followed by a muted `(week default)` suffix when `isAutoResolved`.
- Styling: `text-muted-foreground text-xs ml-1.5` (Aeonik Pro, lowercase — body text rule, never uppercase).
- Suffix sits inline so the trigger stays single-line; truncation handled by existing `[&>span]:line-clamp-1`.

**3. Mirror in dropdown row (optional polish)**
- Next to the auto-resolved stylist's row in the dropdown list, append the same muted `(week default)` suffix after the name.
- Reinforces the connection between trigger and list.

**4. Day view unchanged**
- Suffix never appears in day view — `isAutoResolved` is structurally `false` there.

## Acceptance checks

1. Week view with no manual selection → trigger shows `Alexis Heasley (week default)` with the suffix in muted text.
2. Week view, user manually picks Alexis from dropdown → trigger shows `Alexis Heasley` (no suffix — it's now an explicit choice).
3. Week view, user picks a different stylist → trigger shows that name, no suffix.
4. Dropdown opened in auto-resolved state → Alexis's row also shows the muted `(week default)` suffix.
5. Day view → no suffix ever, regardless of selection state.
6. Suffix uses Aeonik Pro, lowercase, muted — no uppercase, no font-display.
