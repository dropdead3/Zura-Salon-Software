

# Fix Sticky Bottom Banner — Floating Pill Design

## Problem
The banner is `fixed bottom-0 left-0 right-0` with a `border-t`, meaning it spans the full viewport edge-to-edge and sits behind the sidebar navigation. It also doesn't follow the design system's floating/rounded aesthetic.

## Changes (`BackroomPaywall.tsx`, lines 994–1065)

### 1. Make it a floating rounded pill
Replace the full-width fixed bar with a centered floating pill:
- Remove `left-0 right-0 border-t`
- Add `left-1/2 -translate-x-1/2 bottom-6 rounded-full` for centered floating position
- Use `bg-card/80 backdrop-blur-xl border border-border shadow-2xl` for the glass bento aesthetic
- Add horizontal padding directly on the outer container instead of using `max-w-5xl mx-auto`

### 2. Fix sidebar overlap
By making it a centered floating pill with `left-1/2 -translate-x-1/2`, it won't be clipped by the sidebar. The pill will float centered over the main content area.

### 3. Condensed layout
- Keep the flex row: savings stats on left, CTA button on right
- Move the guarantee text inline or remove the extra column wrapper
- Use `px-5 py-2.5` for tighter pill padding
- Remove the inner `max-w-5xl mx-auto` wrapper — the pill self-sizes

### Result
```text
                    ╭──────────────────────────────────────────────────────╮
                    │  +$4,500/yr savings   +$3,200/yr net   [🔒 Unlock Zura Backroom →] │
                    ╰──────────────────────────────────────────────────────╯
```

## File Changed
- `src/components/dashboard/backroom-settings/BackroomPaywall.tsx`

