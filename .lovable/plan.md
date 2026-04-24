
## Prompt feedback
Strong prompt: you gave a precise rejection test — “if it looks like a simple left border, it’s wrong” — plus concrete geometry rules. That is exactly the kind of direction that prevents shallow implementations. Even better next time: add one line that locks the rendering method, e.g. “Use one continuous shape driven by the card radius; no stacked pieces, no fake border tricks.” That removes ambiguity before implementation starts.

## Why it is still incorrect
The current implementation in `src/components/dashboard/schedule/AppointmentCardContent.tsx` is not a true structural edge accent:

- `LeftEdgeAccent` is built from **three separate pieces**: top SVG, middle rect, bottom SVG.
- The geometry is **hardcoded to 10px** and does not truly derive from the card radius.
- It does **not use `pixelHeight`**, so very short cards and tall cards do not preserve the same taper behavior.
- The status-color path uses `currentColor`, which ties the accent to text color instead of a dedicated accent color source.
- Because the shape is assembled rather than drawn as one continuous form, it can read like an overlay or seam instead of part of the card shell.

That is why this feels like a regression: it is a simplified approximation, not the radius-locked shape you described.

## Fix
### Files
- `src/components/dashboard/schedule/AppointmentCardContent.tsx`
- `src/lib/design-tokens.ts`

## Implementation plan
### 1. Replace the three-piece accent with a single continuous SVG path
Remove the current `LeftEdgeAccent` top-cap / middle-band / bottom-cap construction.

Replace it with one geometry-aware component that accepts:
- `height`
- `radius`
- `width`
- `color`

It should render a **single closed filled path** whose:
- outer edge hugs the card’s left silhouette
- top and bottom curve into the rounded corners
- inner edge eases back inward so both ends taper to a point / near-point

Shape logic:
- use `pixelHeight` from `AppointmentCardContent`
- compute `effectiveRadius = min(cardRadius, (height - 2) / 2)` so short cards compress correctly
- compute a single `d` path string from those values
- render one `<svg>` with one `<path>`, not multiple stitched elements

This gives:
- no seams
- no cap mismatch
- proper taper on short and tall cards
- one structural shape instead of an assembled overlay

### 2. Make radius a shared constant instead of hardcoding geometry in multiple places
Right now the card uses `rounded-[10px]` while the accent separately assumes `10`.

Introduce a shared constant near the card renderer, e.g.:
- `const SCHEDULE_CARD_RADIUS = 10`
- `const SCHEDULE_ACCENT_WIDTH = 3.5`

Use that same radius for:
- the card rounding
- the inner highlight ring
- the accent path math

This keeps border radius sync exact and prevents future drift.

### 3. Use `pixelHeight` to keep the taper correct at all card heights
The current accent ignores the one prop that already exists for responsive geometry.

Update the accent call site so grid cards pass:
- `height={pixelHeight}`
- `radius={SCHEDULE_CARD_RADIUS}`

Behavior:
- tall cards: normal straight middle section
- medium cards: shorter middle section, same corner feel
- very short cards: top and bottom taper zones compress and meet cleanly, with no blunt cutoff

If `pixelHeight` is missing, use a conservative fallback height only for safety.

### 4. Give status cards a real accent color source
Do not use `currentColor` for the status accent.

Add an explicit accent token to the canonical appointment status map in `src/lib/design-tokens.ts`, for example:
- `accent: 'text-amber-500 dark:text-amber-400'`
- `accent: 'text-blue-600 dark:text-blue-300'`
- etc.

Then render the SVG with `fill="currentColor"` and apply the accent class directly to the accent wrapper.

Category-colored cards can still use the resolved category stroke/text color.
Status-colored cards should use the dedicated accent token, not body text color.

### 5. Keep clipping structural and clean
The accent should remain:
- inside the card container
- `pointer-events-none`
- clipped by the card’s own rounded overflow

No layout changes:
- no padding changes
- no drag/resize hit-area changes
- no interaction shift

### 6. Preserve existing exclusions and states
Keep these rules:
- no accent on blocked/break cards
- no accent for gradient-display variants unless explicitly desired later
- cancelled / no-show / selected states remain exactly as they are
- service bands still render underneath content; accent stays above them

## QA
- Accent is a single continuous form, not visibly assembled from pieces
- Top-left and bottom-left ends taper into the radius with no flat stop
- Middle width stays consistent around 3–4px
- Short cards do not show cap collisions or blunt ends
- Tall cards do not stretch the corner geometry unnaturally
- Status cards use dedicated accent color, not text color
- No seams at 100%, 125%, 150%, and 200% zoom
- No overflow outside rounded corners
- No layout shift, drag interference, or padding changes

## Enhancement suggestion
After this lands cleanly, extract it into a small reusable primitive like `AppointmentEdgeAccent` with props:
- `height`
- `radius`
- `width`
- `tone`

That turns this from a fragile one-off into a canonical schedule primitive and prevents future regressions where the accent quietly drifts back into “just a left border.”
