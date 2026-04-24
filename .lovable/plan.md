
## Prompt feedback
Good prompt. You gave the most useful possible symptom: "it's only visible on the New Client Consultation card." That isolates the bug from "accent rendering is broken" to "accent appears only on one rendering path," which is a much stronger debugging signal. Even better next time: pair that observation with one short structural hint like "compare the consultation card path to standard service-colored cards." That would point directly to the actual split in the code.

## What the problem actually is
The accent is not missing randomly.

It only shows on the consultation card because that card goes through the `displayGradient` path, while most other schedule cards go through the `useCategoryColor` path.

In `AppointmentCardContent.tsx`:

- `showLeadingAccent` is true for most non-compact, non-blocked cards
- `LEADING_ACCENT_BORDER` is being applied to the card root
- but `cardStyle` sets an inline `borderColor` whenever `useCategoryColor` is true

That inline `borderColor` overrides the class-based `border-l-primary/70`, so the left accent gets replaced by the same stroke color as the rest of the card border.

Why consultation is different:
- consultation cards use `displayGradient`
- the `displayGradient` style path sets `background` and `color`, but not `borderColor`
- because no inline `borderColor` is applied there, the left accent survives and becomes visible

So the issue is not visibility logic. The issue is CSS precedence:
- class-based left border accent
- overridden by inline full-border color on service-colored cards

## Files involved
- `src/components/dashboard/schedule/AppointmentCardContent.tsx`
- `src/lib/design-tokens.ts`

## Implementation plan

### 1) Keep the accent token, but stop letting inline borderColor wipe it out
Update the service-colored `cardStyle` branches in `AppointmentCardContent.tsx` so they do not override the left border when `showLeadingAccent` is enabled.

Current problematic behavior:
- `borderColor` is applied inline for all sides
- inline style wins over `border-l-*` utility class

### 2) Split border styling into two cases
In the `useCategoryColor` branches, compute border styling conditionally:

#### Case A — accent enabled
For non-compact, non-blocked cards:
- preserve top/right/bottom border color from category styling
- do not set the left border color inline
- allow `LEADING_ACCENT_BORDER` to control the left edge

Implementation direction:
- either move full-border coloring out of inline styles and into class/style composition that supports side-specific borders
- or set side-specific inline values:
  - `borderTopColor`
  - `borderRightColor`
  - `borderBottomColor`
  - omit `borderLeftColor`

#### Case B — accent disabled
For compact or blocked cards:
- keep the existing full border behavior unchanged

### 3) Apply the same fix to both category-color branches
There are two style branches that can override the accent:
- dark themed category cards
- light themed category cards

Both need the same side-aware border treatment.

### 4) Keep the existing accent visibility rules
Do not change:
- compact cards: no accent
- blocked/break cards: no accent
- agenda variant: unchanged

The bug is not in the visibility gate; it is in the border-color override.

### 5) Keep the token source stable
No need to change the org-scoped token choice unless visual tuning is needed. `LEADING_ACCENT_BORDER` can remain the canonical accent token.

If visual parity with Top Staff still needs refinement after the fix, tune only these values in `src/lib/design-tokens.ts`:
- border width
- opacity
- ring opacity

## Expected result after fix
- consultation cards still show the accent
- standard service-colored cards also show the accent
- the accent follows the rounded corners because it remains a native left border
- top/right/bottom border still match the card’s category stroke
- no extra overlay, no inset pill, no SVG, no padding hacks

## Technical detail
The root cause is this combination:

```tsx
showLeadingAccent && LEADING_ACCENT_BORDER
style={cardStyle}
```

with `cardStyle` containing:

```tsx
borderColor: ...
```

Because inline styles outrank Tailwind utility classes, the category stroke replaces the accent on the left side. Gradient consultation cards avoid this because their style object does not include `borderColor`.

## QA checklist
- Confirmed and completed standard appointment cards show the leading accent
- Unconfirmed/service-colored cards show the leading accent
- Consultation gradient cards still show the leading accent
- Compact cards still do not show it
- Block/Break cards still do not show it
- Left edge uses accent color, while top/right/bottom retain category stroke
- Rounded corner wrap remains clean at 100%, 125%, 150%, and 200% zoom
- Selected ring and no-show ring still render correctly
- No layout shift or content overlap introduced

## Enhancement suggestion
After this fix, extract the card stroke decision into a small helper such as `getAppointmentBorderStyle({ useCategoryColor, isDark, showLeadingAccent, catColor, darkStyle })`. That turns the bug-prone style precedence into one canonical decision point and prevents future regressions where a new inline `borderColor` silently kills the accent again.
