

# Live System Preview Hero — Zura Backroom Paywall

## Overview
Replace the current centered text-only hero (Section 1, lines 379–414) with a split-layout hero: left side keeps headline/subheadline/CTA, right side adds an animated "live system preview" that cycles through 6 workflow steps using lightweight CSS transitions and `setInterval`.

## Layout

```text
┌─────────────────────────────────────────────────────┐
│  LEFT (text)              │  RIGHT (visualization)  │
│                           │                         │
│  Headline                 │  ┌─────────────────┐    │
│  Subheadline              │  │  Animated mock   │    │
│  [Activate Backroom →]    │  │  system UI       │    │
│  "Setup takes minutes"    │  │  cycling through │    │
│                           │  │  6 steps         │    │
│  ★★★★★ testimonial        │  └─────────────────┘    │
└─────────────────────────────────────────────────────┘
Mobile: stacks vertically (text on top, preview below)
```

Desktop: `grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center`

## Animated Workflow (Right Side)

A single `Card` containing a mock UI that auto-cycles through 6 steps every ~3 seconds using `useState` + `useEffect`/`setInterval`. Each step renders a different mini-UI with `animate-fade-in` on key change:

| Step | Label | Mock UI |
|------|-------|---------|
| 1 | Bowl on Scale | Scale icon + weight readout "0.0g" |
| 2 | Product Dispensed | Weight counting up to "28.4g" with progress bar |
| 3 | Usage Captured | Checkmark + "28.4g Koleston 7/0 recorded" |
| 4 | Formula Saved | Client name + formula line items |
| 5 | Inventory Updated | Product row with stock level badge |
| 6 | Cost Insight | Service cost breakdown with margin % |

Each step also has a **step indicator** bar at the bottom (6 dots/segments, active one highlighted).

**Mobile fallback**: Show a static version with just step 1 (scale readout) or a simplified 3-step summary without auto-cycling, to keep performance optimal.

## Animation Approach
- Pure React state (`useState` for `activeStep`) + `setInterval` (3s loop)
- Content swaps use existing `animate-fade-in` keyframe (already in tailwind config)
- Step indicator uses `transition-all duration-300` for the active dot
- No framer-motion, no video, no heavy assets
- Weight "counting up" in step 2: use a second `useEffect` that increments a number from 0→28.4 over ~2s when step 2 is active

## Implementation
- All code stays inline in `BackroomPaywall.tsx` — no new files
- Add a new `useState` for `heroStep` (0–5) alongside existing state declarations
- Add a `useEffect` with `setInterval` to cycle steps
- Replace lines 379–414 (current hero section) with the new split-layout hero
- Existing headline text, CTA (`ActivateButton`), and testimonial quote all preserved — just repositioned to the left column
- Icons needed: all already imported (`Scale`, `CheckCircle2`, `Brain`, `PackageSearch`, `DollarSign`, `BarChart3`)

## Step Indicator
A row of 6 small capsules below the visualization card:
```
[●][○][○][○][○][○]  — Bowl on Scale
```
Active capsule gets `bg-primary`, inactive gets `bg-muted`. Label shows current step name.

