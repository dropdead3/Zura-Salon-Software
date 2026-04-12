

# Luxury Bento Floating Bars — Platform Sidebar & Header

## Concept

Transform the platform sidebar and top header from edge-flush, full-bleed bars into **floating, inset panels** with rounded corners, subtle glass effects, and visible breathing room against the page background. Think Linear/Raycast/Arc — the chrome floats inside the viewport rather than anchoring to edges.

## Current State

- **Sidebar**: Flush `left-0 top-0`, full height, hard border-right, no radius
- **Header**: Flush sticky bar, full width, hard border-bottom, no radius
- **Layout**: Content uses `ml-16/ml-56` with no gap — sidebar merges into content

## Design Direction

### Sidebar → Floating Panel
- Inset from viewport edges: `top-3 left-3 bottom-3` (12px breathing room)
- Height: `calc(100vh - 24px)` instead of `h-screen`
- Radius: `rounded-[22px]` (container tier)
- Background: glass effect with higher opacity (`bg-[hsl(var(--platform-sidebar-bg)/0.85)]`)
- Border: subtle all-around border (not just right edge)
- Shadow: soft `shadow-xl shadow-black/10` for floating depth
- Remove hard `border-r`, replace with full border

### Header → Floating Top Bar
- Inset from top: `top-3`, with horizontal margins matching content area
- Not full-width — floats with rounded corners
- Radius: `rounded-[18px]` (between large and xl tiers)
- Background: glass `bg-[hsl(var(--platform-bg)/0.6)] backdrop-blur-xl`
- Border: subtle ring instead of hard `border-b`
- Shadow: `shadow-lg shadow-black/[0.06]`
- Height stays `h-14` but with visual separation from content

### Layout Adjustments
- Sidebar width stays `w-56` / `w-16` but actual visual width includes the 12px inset
- Content `ml` adjusts to account for sidebar + gap: `ml-[15.5rem]` / `ml-[5.5rem]` (sidebar + 12px inset + 12px gap)
- Header gets `mx-4` horizontal margin within the content column
- Main content area keeps its existing `PlatformPageContainer` padding

## Changes

### 1. `src/components/platform/layout/PlatformSidebar.tsx`
- Replace `fixed left-0 top-0 h-screen` with `fixed left-3 top-3 bottom-3`
- Add `rounded-[22px]` (container tier)
- Replace `border-r border-[hsl(...)]` with full `border border-[hsl(var(--platform-border)/0.3)]`
- Add `shadow-xl shadow-black/10`
- Adjust `w-56` / `w-16` to stay the same (content width)
- Tweak internal padding to account for rounded corners (slightly more padding at top/bottom)

### 2. `src/components/platform/layout/PlatformHeader.tsx`
- Replace `sticky top-0 border-b` with `sticky top-3 mx-4 rounded-[18px]`
- Add `border border-[hsl(var(--platform-border)/0.3)]` (full border, not just bottom)
- Add `shadow-lg shadow-black/[0.06]`
- Slightly reduce background opacity for more glass feel

### 3. `src/components/platform/layout/PlatformLayout.tsx`
- Update content area margins: `ml-[15.5rem]` expanded / `ml-[5.5rem]` collapsed (to account for sidebar inset + breathing room)
- Add `pt-3` to the main content column so the header's `top-3` aligns with the sidebar's `top-3`
- Ensure main content has subtle top padding below the floating header

### 4. `src/lib/platform-bento-tokens.ts`
- Add `floatingBar` token group:
  - `radius: 'rounded-[18px]'`
  - `inset: 12px` (as documentation)
  - `shadow: 'shadow-xl shadow-black/10'`
  - `glass: 'backdrop-blur-xl'`

## Visual Result

```text
┌──────────────────────────────────────────────────┐
│  ┌──────┐  ┌──────────────────────────────────┐  │
│  │      │  │  Floating Header (rounded-18)    │  │
│  │ Side │  └──────────────────────────────────┘  │
│  │ bar  │                                        │
│  │      │  ┌──────────────────────────────────┐  │
│  │ r-22 │  │  Page Content                    │  │
│  │      │  │                                  │  │
│  │      │  │                                  │  │
│  └──────┘  └──────────────────────────────────┘  │
│                                                  │
│  (dark background visible around all edges)      │
└──────────────────────────────────────────────────┘
```

## Files

| File | Change |
|---|---|
| `src/lib/platform-bento-tokens.ts` | Add `floatingBar` token group |
| `src/components/platform/layout/PlatformSidebar.tsx` | Floating inset, container radius, full border + shadow |
| `src/components/platform/layout/PlatformHeader.tsx` | Floating inset, rounded-18, glass border + shadow |
| `src/components/platform/layout/PlatformLayout.tsx` | Adjust margins/padding for floating chrome |

4 files. No logic changes. No database changes. Purely visual positioning and styling.

