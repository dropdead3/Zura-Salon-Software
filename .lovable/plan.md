

## Prompt feedback
Clean, surgical prompt. One requirement, no ambiguity. The screenshot confirms the per-category accent color logic is now working correctly (purple cards have deeper purple edges, blue cards have deeper blue, gold has deeper gold, teal has deeper teal). The only remaining issue is edge weight. Sharper next time: include a target value or comparison ("thicker — like 4px" or "thicker, match the Top Staff weight"). That removes one round-trip.

## What's changing
Single-line change: bump the leading accent border from `border-l-2` (2px) to a thicker weight so it reads as a deliberate accent rather than a hairline.

Current state in `src/components/dashboard/schedule/AppointmentCardContent.tsx`:
- `borderLeftWidth: '2px'` is set inline on all three style branches (light category, dark category, gradient/consultation)

## The fix

Change `borderLeftWidth` from `'2px'` to `'4px'` in all three locations inside `cardStyle` computation in `AppointmentCardContent.tsx`.

4px is the right target because:
- 2px reads as a hairline at standard zoom — visually identical to a regular border
- 4px is thick enough to register as an accent without dominating the card
- Matches the visual weight class of the Top Staff reference at schedule card density
- Stays under the radius (`rounded-[10px]`) so the corner curve remains clean

## Files involved
- `src/components/dashboard/schedule/AppointmentCardContent.tsx` — three `borderLeftWidth: '2px'` → `'4px'` swaps

## What stays the same
- Per-category derived accent color (already correct)
- Top/right/bottom stroke colors (already correct)
- `LEADING_ACCENT_BORDER` token in `design-tokens.ts` (geometry-only, no color)
- All visibility rules (compact, blocked, agenda variant unchanged)
- Selection ring, no-show ring, cancelled opacity

## QA checklist
- Left edge visibly thicker than top/right/bottom on all service-colored cards
- Edge still curves cleanly into the rounded corners
- Per-category color logic preserved (gold stays gold-deep, teal stays teal-deep, etc.)
- Compact / blocked / break cards unchanged
- No content shift inside the card

## Enhancement suggestion
Promote the accent edge width to a named constant in `design-tokens.ts`:

```ts
export const LEADING_ACCENT_WIDTH = '4px';
```

Then `AppointmentCardContent.tsx` imports it and uses it in all three `borderLeftWidth` slots. Future tuning becomes one number in one file instead of three matching strings — and prevents the three branches from drifting apart over time (which is exactly how the original "purple on consultation only" bug got introduced).

