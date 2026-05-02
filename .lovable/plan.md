## Diagnosis

The "See Offer" FAB shifts vertically based on the active hero's content alignment. The mechanism:

1. `HeroSlideRotator` and `HeroSection` publish the active slide's `content_alignment` to `<html data-hero-alignment="left|center|right">` via `publishHeroAlignment()` (`src/lib/heroAlignmentSignal.ts`).
2. `PromotionalPopup` subscribes to that attribute (lines 149–153, 520–528) and, when the hero alignment matches the FAB's corner (`right` hero + `bottom-right` FAB, or `left` hero + `bottom-left` FAB), bumps the FAB from `bottom-6` to `bottom-24` — about 72px of vertical drift.
3. Result: as slides rotate or as the operator changes per-slide alignment, the FAB jumps up and down. In your two screenshots, slide 1 (right-aligned) crowds the FAB → FAB lifts; slide 2 (left-aligned) doesn't crowd → FAB drops back down. Looks like a bug; reads as instability.

## What's wrong with the current behavior

- A FAB is a **global, persistent affordance** anchored to a viewport corner. Its job is to sit above content (`z-50` already handles that), not to dodge section-level layout changes.
- The "stay out of the way" instinct is misapplied: the FAB and the hero CTA buttons live in different visual layers. The hero CTAs are inside the section; the FAB is overlaid above. They can coexist at the same baseline because the FAB is on a higher z-plane.
- Operators read positional drift as broken, not as polish (you just did).
- Doctrine fit: this is the same pattern as the Visibility Contracts core rule — silence/stability is a stronger signal than reactive nudging.

## Plan

### 1. Decouple the FAB from hero alignment (`src/components/public/PromotionalPopup.tsx`)

- Remove `heroAlignment` state + `subscribeHeroAlignment` subscription (lines 149–153).
- Remove the `fabCrowded` derivation and the conditional `bottom-24` class (lines 520–522, 527).
- FAB sits at `bottom-6` full-time, mirrored left/right by `fabPos`.
- Drop the now-unused `subscribeHeroAlignment` and `HeroAlignmentSignal` imports (line 25).
- Remove the now-dead `transition-[bottom] duration-300 ease-out` class from the FAB wrapper (line 526) since `bottom` no longer changes.

### 2. Keep the alignment signal infrastructure intact

`src/lib/heroAlignmentSignal.ts`, `publishHeroAlignment()` calls in `HeroSlideRotator` and `HeroSection`, and the `<html data-hero-alignment>` attribute stay. Reasons:
- Cheap to keep (single root attribute, no perf cost).
- Future consumers may legitimately need section-aware placement (e.g. a chat widget that genuinely overlaps the hero CTA hit-target on mobile).
- Removing the publishers would be a wider-blast-radius edit than the bug warrants.

Add a one-line note to `heroAlignmentSignal.ts` clarifying that the FAB intentionally does NOT consume this signal — prevents the next contributor from re-wiring it.

### 3. Regression guard (`src/components/public/PromotionalPopup.test.tsx` if it exists, else add one)

Single test: render `<PromotionalPopup>` in FAB state, mutate `<html data-hero-alignment>` between `left` / `right` / `center`, assert the FAB's class list does NOT change (specifically `bottom-6` stays, `bottom-24` never appears). Locks the decoupling so it can't quietly regress.

### 4. Memory entry

Add a short core rule: **"Global FABs and persistent overlays must not reposition based on section-level layout state. Anchor + z-layer is the contract; positional drift reads as broken."** Stops this pattern from re-emerging on the next FAB (chat widget, AI assistant button, etc.).

### Files touched

- `src/components/public/PromotionalPopup.tsx` — strip alignment subscription + conditional `bottom-24`
- `src/lib/heroAlignmentSignal.ts` — add note that FAB intentionally does not consume
- `src/components/public/PromotionalPopup.test.tsx` — new (or extended) regression test
- `mem://index.md` + `mem://style/global-overlay-stability.md` — new core rule + supporting memory

### Out of scope

- Removing `publishHeroAlignment()` / the publishers in HeroSlideRotator + HeroSection. Kept for future use; removal would be a separate cleanup if no consumer materializes within ~3 months (Deferral Register revisit trigger).
- Mobile-specific FAB placement (e.g. dodging the iOS home indicator). Separate concern.

### Acceptance criteria

- FAB stays at `bottom-6` regardless of which slide is active or what `content_alignment` the operator picks.
- Switching slides in the live preview never moves the FAB vertically.
- The `<html data-hero-alignment>` attribute still updates (other consumers preserved).
- Regression test passes; memory rule documented.
