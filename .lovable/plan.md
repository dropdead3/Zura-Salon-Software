
## Prompt feedback
Strong correction. You finally stated the actual invariant clearly: the left edge should be the **same card color family**, just **deeper / more vibrant**. That is the missing requirement prior prompts did not force. The mistake was treating “match Top Staff” as a literal color recipe instead of a **shape reference only**. Better prompt framing next time:

- “Match the Top Staff geometry only”
- “Do not use purple/global primary”
- “Accent must be derived from each card’s own category color”
- “Top/right/bottom stroke must remain category stroke”

That wording separates **shape** from **color logic** and prevents this exact failure mode.

## What went wrong
I anchored on the Top Staff example too literally.

Top Staff gave the correct **border-left shape**, but I incorrectly copied its **purple/global token mindset**. Your schedule cards are different: their color system is category-driven. So the accent cannot be a single shared color token like `primary`. It must be computed per card from that card’s category color.

Current bug sources:
- `LEADING_ACCENT_BORDER` is hardcoded to `border-l-primary/70`
- that makes every accent purple
- on service-colored cards, the accent should instead be a derived version of the card’s own category hue

## Files involved
- `src/components/dashboard/schedule/AppointmentCardContent.tsx`
- `src/utils/categoryColors.ts`
- `src/lib/design-tokens.ts`

## Implementation plan

### 1) Stop using a global purple accent token
Retire `LEADING_ACCENT_BORDER` as a color token.

A static Tailwind class cannot express:
- blonding card → deeper blonding accent
- teal card → deeper teal accent
- lavender card → deeper lavender accent

So the accent color must move to inline, per-card style computation.

Replace the token with a geometry-only helper if needed, e.g.:
```ts
export const LEADING_ACCENT_EDGE = 'border-l-2';
```

Or remove the token entirely if the border width is handled inline.

### 2) Add a real “derived accent color” helper in `categoryColors.ts`
Create a helper specifically for schedule accent edges, for example:

```ts
export function deriveAccentEdgeColor(hexColor: string, isDark: boolean): string
```

Behavior:
- preserve the same hue family as the card
- increase saturation modestly
- reduce lightness enough to read as a stronger leading edge
- never drift to a different hue
- for grays / low-saturation colors, return a darker neutral accent instead of inventing color

Implementation direction:
- For light mode:
  - start from the effective light fill color
  - decrease lightness ~12–18
  - increase saturation ~8–14
- For dark mode:
  - use `darkStyle.accent` as the base source of truth, or slightly deepen it if needed
- For pale consultation/champagne tones:
  - force enough contrast so the edge visibly reads against the fill

This helper should become the canonical source for the appointment leading edge color.

### 3) Move the accent fully into `cardStyle`
In `AppointmentCardContent.tsx`, stop relying on class-based accent color.

When `showLeadingAccent` is true, compute all four border sides explicitly:

#### Light themed category cards
- `borderTopColor = lightTokens.stroke`
- `borderRightColor = lightTokens.stroke`
- `borderBottomColor = lightTokens.stroke`
- `borderLeftColor = derivedAccent`
- `borderLeftWidth = '2px'`

#### Dark themed category cards
- `borderTopColor = darkStyle.stroke`
- `borderRightColor = darkStyle.stroke`
- `borderBottomColor = darkStyle.stroke`
- `borderLeftColor = darkStyle.accent` (or the new helper result)
- `borderLeftWidth = '2px'`

#### Gradient / consultation cards
Gradient cards currently skip border coloring entirely. Add explicit border treatment there too:
- preserve gradient background/text
- set `borderTop/Right/Bottom` to a subtle consultation/category stroke
- set `borderLeftColor` to the derived consultation accent
- keep the same native rounded-border geometry

That ensures consultation still works, but now with the correct category-derived edge instead of a special accidental path.

### 4) Remove the purple halo entirely
Do not use `ring-primary` inside the accent token.

The accent is an edge treatment, not a glow treatment. A ring wraps the full perimeter and visually contaminates the other sides. The left edge should be the only differentiated side.

Selection ring / no-show ring stays as-is because those are separate interaction states.

### 5) Keep the shape, change only the color logic
Do not change:
- rounded card geometry
- native border-left implementation
- compact cards hidden accent
- blocked / break cards hidden accent
- agenda variant unchanged
- shadows / hover / selection / no-show behavior

Only the accent color source changes:
- from global purple
- to per-card derived category accent

## Expected result
- Blonding cards: left edge is deeper blonding, not purple
- Teal cards: left edge is deeper teal, not purple
- Lavender cards: left edge is deeper lavender, not purple
- Consultation cards: left edge is deeper consultation gold, not purple
- Top/right/bottom borders remain their existing category stroke
- The left edge still curves naturally into the rounded corners because it remains a native border-left

## Technical detail
The correct mental model is:

```text
Top Staff reference = geometry reference
Schedule cards = category-derived color system
```

So the schedule accent must be:

```text
accentColor = f(cardColor)
```

not:

```text
accentColor = primary
```

That is the actual mismatch between your request and the prior implementations.

## QA checklist
- No schedule card shows a purple left edge unless the card itself is purple-toned
- Each accent clearly belongs to the card’s own hue family
- Accent is visually deeper / richer than the card fill
- Top/right/bottom remain category stroke, unchanged
- Consultation gradient card uses a deeper consultation-toned left edge
- Compact cards still have no accent
- Block / Break cards still have no accent
- Selected ring and no-show ring still render correctly
- Corner wrap remains clean at 100%, 125%, 150%, and 200% zoom

## Enhancement suggestion
After this fix, extract the border decision into one helper such as:

```ts
getAppointmentBorderStyle({
  catColor,
  isDark,
  displayGradient,
  showLeadingAccent,
})
```

and have it return:
- fill
- text
- stroke colors
- accent edge color
- border widths

That prevents this from regressing again through mixed class-vs-inline logic or by reintroducing a global accent token where a per-card derived color is required.
