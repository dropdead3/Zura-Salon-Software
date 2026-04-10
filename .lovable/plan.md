

# UI Enhancement Pass — Zura Apps Marketplace Cards

## Issues Identified (from screenshot)

1. **Icon containers**: `rounded-xl` feels squared-off for app icons at this size — should use `rounded-2xl` for a softer, more premium feel
2. **Feature text**: `text-xs` (12px) with `gap-y-1.5` is too small and cramped — needs to be `text-sm` (14px) with more generous spacing
3. **Value statement**: Blends into the card — needs more visual weight as the "sell" line
4. **Card internal spacing**: `gap-5` is tight — needs breathing room between sections
5. **Explore cards**: Border-left accent is subtle; cards don't create urgency or desire
6. **CTAs**: Small and understated — should be more prominent to drive action

## Changes

### `src/pages/dashboard/AppsMarketplace.tsx` — Single file, full card redesign

**Icon containers**
- Increase to `w-14 h-14 rounded-2xl` with slightly stronger gradient opacity (from `/20` to `/30`)
- Icon size bump to `w-7 h-7`

**Value statement**
- Upgrade from `text-sm text-foreground/80` to `text-base text-foreground` with `font-medium`
- This is the hook line — it should read like a headline, not a description

**Feature list**
- Increase from `text-xs` to `text-sm` 
- Increase `gap-y` from `1.5` to `2.5`
- CheckCircle icons from `w-3.5 h-3.5` to `w-4 h-4`
- Active features use `text-primary` instead of `text-primary/70`

**Card padding and spacing**
- Card content padding from `p-6` to `p-8`
- Internal gap from `gap-5` to `gap-6`
- Add a subtle divider between value statement and features

**Subscribed app cards**
- Add a thin top border accent using the app gradient color for active apps
- Bigger, more confident CTA: use `size="default"` instead of `sm`

**Explore app cards**
- Remove `border-l-2` — replace with full-card subtle gradient border glow
- Add a persuasive "what you're missing" tone: add a `missedOpportunity` field per app (e.g., "Salons using Marketer see 3x ROI on ad spend")
- "Notify Me" button upgraded to `size="default"` with stronger styling
- Add a `→ Learn More` text link alongside "Notify Me"

**New data field: `missedOpportunity`**
- Marketer: "Salons using targeted campaigns see 3x return on ad spend."
- Reputation: "90% of clients check reviews before booking. Automate the ask."
- Reception: "The average salon misses 35% of inbound calls. Stop losing revenue."

**Section headers**
- "Explore Apps" subtitle gets slightly larger: `text-sm` to `text-base`

### Files

| File | Change |
|------|--------|
| `src/pages/dashboard/AppsMarketplace.tsx` | Redesign card internals: larger icons, bigger feature text, value statement emphasis, urgency copy for explore cards, larger CTAs, improved spacing |

