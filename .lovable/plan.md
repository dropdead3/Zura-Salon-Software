
## Prompt feedback
Strong prompt: blunt plus a screenshot made the failure mode obvious. Even better next time: name the exact symptom, e.g. “the side stroke hard-stops instead of tapering, and the corner transition feels mechanical.” That tells me whether the problem is geometry, color, thickness, or fade behavior.

## Why it still looks wrong
The current accent is not a true corner-led accent. It is a **full rounded border with a hard vertical mask cutoff**:

- In `src/components/dashboard/schedule/AppointmentCardContent.tsx`, both accent paths use a bordered `div` plus  
  `maskImage: linear-gradient(to bottom, black 0px, black 14px, transparent 14px)`.
- That means the accent does follow the rounded top corners, but it **stops abruptly at exactly 14px** down the sides.
- Because the mask is a hard cut, there is **no taper/easing**, so the corners feel clipped instead of melting into the card edge.
- On status-colored cards, the overlay currently uses `border: 1.5px solid currentColor`, which ties the accent to the card’s text color instead of the intended border token. That makes the accent weight/color feel inconsistent across statuses.

## Fix
File: `src/components/dashboard/schedule/AppointmentCardContent.tsx`

### 1. Replace the hard-stop mask with a tapered fade
Keep the single rounded overlay approach, but change the mask from a hard cutoff to a fade:

```tsx
WebkitMaskImage: 'linear-gradient(to bottom, black 0px, black 8px, rgba(0,0,0,0.85) 11px, rgba(0,0,0,0.35) 15px, transparent 19px)',
maskImage: 'linear-gradient(to bottom, black 0px, black 8px, rgba(0,0,0,0.85) 11px, rgba(0,0,0,0.35) 15px, transparent 19px)',
```

Result:
- top edge stays crisp
- curved corners stay intact
- side accent **eases out** instead of ending like a chopped bracket

### 2. Use the correct accent color source for status cards
For status-colored cards, stop using `currentColor` for the overlay border.  
Instead, apply the existing `statusColors.border` class directly to the accent overlay and set only width/style inline.

That keeps:
- checked-in = blue accent
- confirmed = green accent
- unconfirmed = amber accent

without accidentally inheriting white or muted text color.

### 3. Slightly reduce accent dominance
Tune the accent so it reads as a leading edge, not a second border:
- stroke: `1.25px` or `1.5px` max
- category opacity: around `0.6–0.68`
- status opacity: around `0.85–0.9`

This prevents the top edge from feeling doubled against the card’s real 1px border.

### 4. Keep the base border and lit edge separate
Do not change:
- existing full card border
- overlap gap behavior
- inner highlight ring
- selected / no-show / cancelled states

The accent should be a **surface cue**, not structural chrome.

## Implementation shape
Update both accent branches:

- **Category-color branch** in `CardOverlays`
  - keep rounded overlay
  - keep `catColor.text`
  - swap hard mask for tapered mask
  - slightly lower opacity

- **Status-color branch** in the main grid card
  - keep rounded overlay
  - remove `currentColor` border usage
  - apply `statusColors.border` to the overlay element
  - use the same tapered mask so both paths behave identically

## QA
- Accent wraps through both top corners cleanly
- Side stroke fades out gradually instead of stopping at one line
- No “bracket” feeling at the top-left / top-right
- Status cards use their true accent color, not text color
- Overlapping cards still preserve the 1px gap
- Selected ring, no-show marker, and cancelled hatch still render cleanly

## Enhancement suggestion
After this lands, extract the effect into a small `AppointmentAccentWrap` primitive with props like `tone`, `opacity`, and `fadeDepthPx`. That gives the schedule one canonical accent treatment and prevents this exact “one-off overlay drift” from happening again.
