# Promotional Popup — Visual Enhancement Plan

## Quick prompt feedback

Strong, concise prompt — you pointed at a specific surface and asked an open visual question, which gives the most creative latitude. To get even sharper output next time, anchor the ask in a single goal verb ("make it feel more premium," "add more editorial hierarchy," "tighten the CTA gravity"). That narrows the design space and makes it easy to A/B between directions without rebuilding twice.

## What's working today

- Termina headline, Aeonik body, accent border-top — all on-canon
- Countdown hairline + last-3s pulse + hover-pause already shipped
- Auto-minimize → FAB collapse path works

## What feels flat (from the screenshot)

```text
┌──────────────────────────────────────────┐
│ 🎁 NEW CLIENT SPECIAL              [✕]   │  ← eyebrow reads thin, no contrast
│                                          │
│ FREE HAIRCUT WITH                        │  ← headline floats; no rhythm anchor
│ ANY COLOR SERVICE                        │
│                                          │
│ Book a color appointment this month…     │  ← body color too close to headline
│                                          │
│  [ No thanks ]   [   CLAIM OFFER    ]    │  ← decline button competes w/ CTA
│                                          │
│ New clients only. Cannot be combined…    │  ← disclaimer flush w/ body, no break
│                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 3s   │
└──────────────────────────────────────────┘
```

Issues: uniform white field with no depth, decline button visually equal to accept, no value-anchor (price/savings), disclaimer not separated, accent only used as a 4px sliver on top.

## Proposed enhancements (modal variant only — banner/corner stay lean)

### 1. Editorial header band (replaces the bare top border)

Replace the 4px top border with a subtle accent-tinted band behind the eyebrow. Uses the operator's accent at ~6% opacity so it works for any brand color.

```text
┌──────────────────────────────────────────┐
│▓▓▓▓ 🎁 NEW CLIENT SPECIAL ▓▓▓▓▓▓▓▓ [✕] │  ← accent/6 wash, 56px tall
│──────────────────────────────────────────│  ← 1px accent/20 hairline
│   FREE HAIRCUT WITH                      │
│   ANY COLOR SERVICE                      │
```

- Eyebrow icon gets a small accent-tinted rounded square container (matches card-header iconBox pattern from canon)
- Close button moves into the band on the right with a hover bg

### 2. Value anchor chip (optional, operator-configurable)

Add an optional `valueAnchor` field to settings (e.g. "$45 value", "Save 30%", "Limited to 10 bookings"). Renders as a small pill *between* headline and body, in the accent color. This is the single most reliable conversion lift for offer modals — gives the brain a number to latch onto.

```text
   FREE HAIRCUT WITH
   ANY COLOR SERVICE
   ┌──────────────┐
   │  $45 VALUE   │   ← accent bg, accent-fg text, font-display, h-6
   └──────────────┘
   Book a color appointment this month…
```

If unset, nothing renders — silence is valid output.

### 3. CTA hierarchy fix

- Decline button: drop the border, render as a quiet text link ("No thanks") aligned **left** of the CTA, not equal-weight beside it
- Accept CTA: keep pill shape, but add a soft accent-tinted glow (`shadow-[0_8px_24px_-8px_var(--accent)]`) so it lifts off the card
- Keep ChevronRight icon inside CTA on hover translate-x — telegraphs forward motion

```text
            ╭──────────────────────────╮
  No thanks │   CLAIM OFFER    →       │  ← CTA glows w/ accent, decline is text
            ╰──────────────────────────╯
```

### 4. Disclaimer separation

Move disclaimer below a thin `border-t border-border/40` divider with extra `pt-4 mt-4` spacing. Reads as legal footer, not body continuation.

### 5. Card depth + entrance refinement

- Replace `bg-card` flat fill with a subtle vertical gradient: `bg-gradient-to-b from-card to-card/95`
- Bump shadow from `shadow-2xl` to a layered combo: `shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18),0_8px_16px_-4px_rgba(0,0,0,0.08)]`
- Entrance: add a tiny scale overshoot (already has zoom-in-95 → 100, fine)

### 6. Countdown polish

- Move the `3s` numeric label from `-top-5` (which currently floats outside the rounded corner) to sit *inside* the bar at right, vertically centered — cleaner edge
- Hairline gets `rounded-bl-2xl rounded-br-2xl` clipping so it follows the card corners

## Out of scope (keep for later if needed)

- Banner + corner-card variants (those are intentionally dense; visual lift would clutter them)
- New imagery/illustration system
- Animated headline reveal (would fight the 15s countdown)

## Technical changes

**`src/hooks/usePromotionalPopup.ts`**
- Add `valueAnchor?: string | null` to `PromotionalPopupSettings` (optional, defaults to null)

**`src/components/dashboard/website-editor/PromotionalPopupEditor.tsx`**
- Add a single text input "Value anchor (optional)" with placeholder `e.g. "$45 value"` and helper text explaining it shows as a small accent chip

**`src/components/public/PromotionalPopup.tsx`**
- Restructure modal variant: split into header band + body region instead of single padded block
- Move close button into header band
- Update `PromoBody` to render the optional `valueAnchor` chip between headline and body
- Demote decline button to text-link style, reorder CTA row
- Add accent-glow shadow to accept CTA via inline `style` (so it picks up the operator's accent)
- Replace flat `bg-card` with vertical gradient
- Reposition `CountdownBar` numeric label inside the bar; round bottom corners

**No DB migration. No new dependencies. No changes to banner/corner-card variants.**

## Files touched

1. `src/hooks/usePromotionalPopup.ts` — one new optional field
2. `src/components/dashboard/website-editor/PromotionalPopupEditor.tsx` — one new input
3. `src/components/public/PromotionalPopup.tsx` — modal variant + PromoBody + CountdownBar tweaks

## Suggested next enhancements (after this ships)

1. **Operator A/B preview**: side-by-side toggle in the editor showing "before / after" so operators can sanity-check their accent color works with the new glow + band
2. **Smart value-anchor inference**: if the offer code maps to a known service in the catalog, auto-suggest the dollar value as a chip (still operator-confirmed, never auto-published)
3. **Headline length guardrail**: warn in the editor if headline exceeds ~40 chars — the new editorial layout assumes 2-line max
