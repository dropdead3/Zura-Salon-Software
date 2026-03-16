

## Paywall Page Overhaul

### Problems Identified

1. **Hero headline is overwhelming** — 60px Termina uppercase across 6 lines eats most of the viewport before users see any value proposition
2. **Animated numbers are springy/jittery** — `AnimatedNumber` uses a damped spring oscillation (`cos(4π * progress)`) that causes values to bounce back and forth (visible in session replay: $61K → $46K → $49K etc.)
3. **Redundant demo sections** — Hero card (6-step auto-cycling demo) + Product Preview (browser mock) + Feature Reveal (interactive panel) all show essentially the same mixing/formula/inventory content three times
4. **Broken section rhythm** — Negative margins (`-mx-6 sm:-mx-8`) on Before/After and How It Works sections create jarring visual breaks with `rounded-2xl` corners that don't align with surrounding content
5. **Before/After inset shadow** — `shadow-[inset_0_2px_4px_0_hsl(var(--border)/0.15)]` creates an unnatural depression effect
6. **7-column timeline is cramped** — The "Here's what that looks like in practice" desktop grid of 7 columns leaves ~130px per step with tiny text and preview cards
7. **Too many sections overall** — The page is extremely long (1544 lines) with 8+ distinct sections, making it feel like a template rather than a premium sales page
8. **Subtle gradient background on Pricing** — Barely visible `primary/0.02` gradient adds visual noise without purpose
9. **Thin divider lines between sections** — The `w-12 h-px bg-border/40` dividers feel like afterthoughts

### Plan

#### 1. Fix AnimatedNumber spring oscillation
- Replace the damped spring easing (`cos(4π * progress)`) with a smooth ease-out curve (`1 - (1 - progress)^3`) in `src/components/ui/AnimatedNumber.tsx`
- This eliminates the value bouncing visible in session replay

#### 2. Simplify the hero (BackroomPaywall.tsx)
- Reduce headline size from `text-4xl md:text-5xl lg:text-[60px]` to `text-3xl md:text-4xl lg:text-5xl`
- Remove the auto-cycling 6-step hero card — replace with a single static product screenshot/mockup showing the mixing interface (the current stepper cycles too fast at 3s and adds cognitive load)
- Keep the left text + CTA, make the right side a clean static browser mockup (reuse the existing `ProductPreview` component which already does this well)

#### 3. Remove redundant sections
- **Remove the standalone Product Preview section** (lines 574–579) — the hero will now contain the browser mockup
- **Remove "Here's what that looks like in practice" 7-column timeline** (lines 1054–1131 desktop, 1133–1209 mobile) — this duplicates the How It Works 3-step cards and the Feature Reveal
- Keep the 3-step "How It Works" cards (Weigh & Track, Detect & Reduce, Recover & Reorder) as the single process explanation

#### 4. Fix section rhythm and layout
- Remove negative margins and `rounded-2xl` from Before/After and How It Works sections — use consistent spacing (`pb-20 md:pb-24`) with no background color shifts
- Remove inset shadows from section backgrounds
- Remove thin divider lines — use consistent vertical spacing instead
- Remove the gradient overlay on the Pricing section

#### 5. Clean up spacing
- Tighten overall page padding from `py-12 md:py-16` to `py-10 md:py-14`
- Standardize section spacing: `pb-16 md:pb-20` for all sections (currently varies between `pb-16`, `pb-20`, `pb-24`, `pb-32`)
- Remove excessive empty lines between sections

#### 6. Remove Social Proof strip relocation
- Move the social proof quote (Drop Dead Salon testimonial) to sit below the Before/After comparison where it has more context, instead of floating between the hero and the product preview

### Files to Edit
- `src/components/ui/AnimatedNumber.tsx` — fix spring easing
- `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` — all layout/section changes

### Result
The page will go from ~10 scrollable sections with redundant demos to a tighter ~7-section flow: Hero (with static browser mock) → Before/After + testimonial → Loss Aversion stats → Feature Reveal → Competitor Comparison → Pricing/ROI → Trust/FAQ → Final CTA.

