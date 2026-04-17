

## Goal
Elevate the suggested-script card so it reads as the centerpiece of the rebook flow, and add a "What not to say" anti-pattern reference with a hover tooltip showing the failure mode language.

## Design

### 1. Elevate the script card
- Promote from muted subcard to a primary surface:
  - Border: `border-primary/30` (vs current `border-border/60`)
  - Background: subtle gradient `bg-gradient-to-br from-primary/[0.06] to-primary/[0.02]`
  - Padding bumped from `p-4` → `p-5`
  - Inset accent stripe on the left edge (`before:` pseudo or a `border-l-2 border-l-primary/40`) to draw the eye
- Quote glyph: enlarged from `h-3.5 w-3.5` opacity 50 → `h-5 w-5` `text-primary/40`, tucked top-left
- Script text: bump from `text-sm` → `text-base`, keep italic, keep `leading-relaxed`
- Bound values (weeks / day / time): currently `font-medium` foreground — promote to `text-primary` (still no `font-bold`) so the variables visually pop as the levers being adjusted
- "Suggested Script" eyebrow: keep Termina uppercase, but lighten contrast slightly and move to top-right of the card (acts as a quiet label, not a footer) — OR keep at bottom and add the new "What not to say" link beside it

### 2. "What not to say" anti-pattern button
- Subscript-style ghost link rendered **below** the script card (own row, right-aligned)
- Visual: small chevron-suffixed link `What not to say ›` — `text-xs` `text-muted-foreground` with `hover:text-destructive` transition
- Wrapped in shadcn `Tooltip` (already in project at `src/components/ui/tooltip.tsx`)
- Tooltip content (max-w-xs) shows the rejected language with an X marker and a brief "why":

  > ✗ "Want to rebook? Or do you want me to text you?"
  >
  > Optional + deferred = no commitment. Always anchor to a specific week and time.

- Tooltip uses `side="top"` `align="end"` so it floats above the link without being clipped by the sheet
- `TooltipProvider` is already mounted globally in `App.tsx` (standard shadcn setup) — verify by inspection; if not, wrap locally

### 3. Token compliance
- All new typography stays within canon: `font-display` + uppercase only on the eyebrow; `font-sans` everywhere else; max weight `font-medium`
- Primary tint via `text-primary` / `bg-primary/[0.06]` — uses existing theme tokens, no hardcoded hex
- No `font-bold`, no `font-semibold` introduced

## Files to change
1. `src/components/dashboard/schedule/NextVisitRecommendation.tsx` — restyle the script card, add the anti-pattern tooltip link below it. Single-file change.

## Out of scope
- Logging which stylists hover the anti-pattern (could be a future coaching telemetry signal — noting for the deferral register, not implementing now)
- Adding more anti-pattern variants (single example is the strongest teaching unit)

