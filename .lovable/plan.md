

# Design System Rebuild — Backroom Paywall Page

## Current State Assessment

The page has strong content but reads like a utility dashboard, not a premium SaaS product page. Key issues:
- **No grid discipline** — `max-w-4xl` (~896px) is narrow; spacing uses arbitrary `space-y-12`, `space-y-4`, `space-y-6` with no rhythm
- **Typography scale is flat** — hero headline is `text-3xl md:text-4xl`, section headers are `text-base`, feature titles are `text-sm` — too compressed, no breathing room between levels
- **Cards lack polish** — `bg-card/60 border-border/40` throughout, no elevation variation, no hover states
- **No product visualization** — 100% text-based, no UI previews or diagrams
- **Section transitions are abrupt** — no visual separation between major page sections
- **Hero feels weak** — small icon, cramped vertical spacing, CTA blends in

## Plan

### Files to modify:
- `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` (major rebuild)
- `src/components/dashboard/backroom-settings/CompetitorComparison.tsx` (refinement)

### 1. Layout Grid — Strict Widths

Change outer container from `max-w-4xl` (896px) to `max-w-[1100px]` for wider content area. Increase outer padding to `px-6 sm:px-8`. This gives feature card grids room to breathe in 2-col and 3-col layouts.

### 2. Typography Scale — Clear Hierarchy

Establish 5 distinct levels:
- **Hero headline**: `text-4xl md:text-5xl lg:text-[56px]` (Termina) — commanding, unmissable
- **Section headline**: `text-2xl md:text-3xl` (Termina) — clear section breaks
- **Card/feature title**: `text-base md:text-lg` (Aeonik Pro, font-medium) — readable card headers
- **Body text**: `text-base` (16px) — comfortable reading
- **Support/meta text**: `text-sm` (14px) — captions, disclaimers

### 3. Spacing System — 8px Grid

Apply consistent vertical rhythm between sections:
- **Between major sections**: `space-y-20 md:space-y-24` (80-96px) — creates clear page "chapters"
- **Section header to content**: `mb-8 md:mb-10` (32-40px)
- **Between cards in a grid**: `gap-5 md:gap-6` (20-24px)
- **Inside cards**: `p-6 md:p-8` (24-32px)

### 4. Hero Section Rebuild

- Remove the icon-in-box treatment (too small, too dashboard-y)
- Enlarge headline to `text-4xl md:text-5xl lg:text-[56px]` with increased `leading-[1.1]`
- Increase subtitle to `text-lg md:text-xl` with `max-w-xl`
- Add a faint gradient or radial glow behind the hero for depth
- Give CTA more vertical breathing room (`pt-8`)
- Style the social proof testimonial with a subtle top border separator

### 5. Feature Cards Rebuild

Current: 2-col grid with icon+title+outcome+bullets in a flat card.

Rebuild to:
- Use `p-6 md:p-8` padding inside each card
- Icon box: increase to `w-11 h-11` with `rounded-xl`
- Title: bump to `text-base md:text-lg font-medium` (Aeonik Pro)
- Outcome line: `text-sm text-muted-foreground` — one clear sentence
- Bullets: keep CheckCircle2 indicators, increase text to `text-sm` for readability
- Add `hover-lift` class for subtle hover elevation on each card
- Cards get `bg-card border-border/50 shadow-sm` for subtle depth

### 6. "How It Works" Section Polish

- Increase step number prominence: `text-2xl text-primary/20` as a large background numeral
- Title: `text-lg font-medium`
- Description: `text-sm text-muted-foreground`
- Add a connecting visual (faint dotted line or arrow between steps on desktop)
- Cards: `p-6 md:p-8` with hover-lift

### 7. Loss Aversion Card Polish

- Increase inner KPI tile padding to `p-5`
- Bump loss values to `text-3xl` for more impact
- Add `shadow-sm` to KPI tiles
- Total monthly loss: increase to `text-4xl` for dramatic emphasis

### 8. Competitor Comparison Refinement

- Increase table cell padding for scannability (`py-3.5 px-5`)
- Add subtle row hover: `hover:bg-muted/10`
- Highlight the Zura column with a faint `bg-primary/[0.03]` vertical stripe
- Column headers: slightly larger `text-sm` instead of `text-xs`
- Add `Fragment` keys to fix the React key warning on `<>` wrapping category groups

### 9. Pricing Section Polish

- Increase pricing value size to `text-3xl` for the two main price points
- Add more padding to the ROI impact card
- Smooth the gradient on the ROI bar

### 10. CTA Design Polish

- Primary CTA: increase to `h-12 px-10 text-base` for more presence
- Add a subtle `shadow-lg shadow-primary/20` glow behind the primary button
- Ensure consistent CTA spacing: `py-4` above and below each CTA placement
- Final CTA section: add a faint top border separator and more vertical padding

### 11. Microinteraction Polish

- Feature cards: `hover-lift` (already exists in CSS — just add the class)
- "How It Works" cards: `hover-lift`
- Comparison table rows: `transition-colors duration-150` with `hover:bg-muted/10`
- CTA button: already has `active:scale-[0.98]` — add `hover:shadow-xl` for glow growth

### 12. Section Separators

Add faint horizontal dividers or increased spacing between major page sections to create clear "chapters." Use either:
- `border-t border-border/20` with `pt-16` padding, or
- Simply increase `space-y` to `space-y-20`

### 13. Product Visualization (Lightweight)

Add a styled "product preview" placeholder between the Hero and the Loss Aversion section — a mock UI frame showing a simplified mixing session interface using a styled card with fake UI elements (progress bars, pill labels, gram readouts). This is built purely with Tailwind/HTML — no images needed. It communicates "this is a real product" visually.

### What stays the same
- All content/copy (already optimized in previous passes)
- All business logic (pricing calculations, location selector, scale counter)
- Component structure (same sections in same order)
- Social proof testimonial content
- FAQ content and accordion

This is purely a visual/spacing/typography polish pass.

