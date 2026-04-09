

# Command Surface Origin-Anchored Expansion Redesign

## Audit Summary

**Current architecture**: `TopBarSearch` is a `<button>` in the top bar (rounded-full pill, `bg-muted/60`). Clicking it calls `onSearchClick` → `setCommandOpen(true)` in `DashboardLayout`. `ZuraCommandSurface` renders as a Radix `Dialog` with `DialogContent` portal — a centered modal at `top-[35%]` with `zoom-in-95` + `fade-in` animation. The search bar and modal are completely disconnected components with no visual continuity. The dialog overlay is `bg-black/80` (very aggressive). The close animation is `zoom-out-95` + `fade-out` — generic modal behavior.

**Core problem**: The dialog opens from center-screen with a scale-up animation. No visual link to the search pill. Feels like a detached popup, not an expansion of the search bar. The overlay is too opaque. The input in the modal is a completely separate `CommandInput` component — no continuity with the pill.

## Strategy Decision: Top-Anchored Dropdown, Not Centered Modal

After auditing the header geometry (search pill sits in left zone of top bar, `max-w-[280px]` to `max-w-xl`), the strongest approach is:

**Replace the Radix Dialog with a custom portal-based dropdown panel that expands from the search bar's position.** The panel anchors to the top of the viewport (below the top bar) and grows downward. This preserves the spatial origin and makes the search feel like a deeper state of the same control.

The centered modal approach fails the continuity test — even with origin-tracking animation, the spatial jump from top-left to center creates a disconnect.

## Architecture

### Approach: Replace Dialog with AnimatePresence Portal

Remove Radix Dialog entirely from `ZuraCommandSurface`. Replace with:
1. A `createPortal` + `AnimatePresence` (framer-motion) combination — same pattern already used by `PremiumFloatingPanel`
2. The panel renders as a fixed-position overlay anchored top-center (offset by sidebar), dropping down from beneath the top bar region
3. A separate backdrop layer (much softer: `bg-black/20 backdrop-blur-sm` matching `PremiumFloatingPanel`)

### Animation Model

**Open**: Panel enters with `y: -12, opacity: 0 → y: 0, opacity: 1` using a tight spring (`damping: 28, stiffness: 320, mass: 0.7`). This creates a subtle downward slide from the header region. Duration feels ~180ms.

**Close**: Reverse — `y: 0 → y: -12, opacity: 0` with faster exit (~120ms). The panel retracts upward toward the header.

No scale transform (scale feels like a popup; translate-Y feels like expansion/retraction from origin).

### Geometry

- Panel: `fixed`, `top` positioned just below the top bar (~72px from viewport top, or `top-[72px]`; adjusts for God Mode bar offset)
- Horizontally: `left: calc(50% + var(--sidebar-offset, 0px))`, `transform: translateX(-50%)` — same centering as current dialog but anchored to top
- Width: same as current (`max-w-[720px]`, expanding to `max-w-[1080px]` with preview)
- Max height: `max-h-[min(560px, calc(100vh - 100px))]`
- Border radius: `rounded-xl` matching drawer tokens
- Material: `bg-card/80 backdrop-blur-xl border-border shadow-2xl` (reuse `tokens.drawer.content`)

### TopBarSearch Visual Continuity

When `open` is true, the `TopBarSearch` pill should:
- Remain visible but visually elevated — add a subtle ring/glow (`ring-1 ring-foreground/10`) to show it's the "source"
- Or alternatively: hide the pill entirely and let the expanded panel's input serve as the replacement (cleaner)

**Decision**: Hide the pill when open. The expanded panel's `CommandInput` sits at the same vertical level as the header, creating the illusion of replacement. The pill fades out with `opacity-0 pointer-events-none` transition.

### Input Continuity

The `CommandInput` inside the panel is already the active input. Since we're anchoring the panel to the header region, the input at the top of the panel aligns spatially with where the search pill was. No need for FLIP animation — the spatial proximity is close enough that the transition reads as "the pill expanded into this."

### Empty State & No-Results AI Fallback

Current empty state (no query) shows `CommandProactiveState` — already good. 

**No-results state** (query typed, zero matches, no suggestions): Currently shows a bare `<p>No results for "..."</p>`. This needs improvement:

Add a refined AI fallback prompt below the no-results message:
- Sparkles icon + "Ask Zura AI" button styled as a calm inline card
- Phrasing: "No direct matches. Ask Zura AI for help →"
- Clicking switches to AI mode and auto-sends the query
- Styled with `bg-card-inner/60 border border-primary/10 rounded-lg` — same language as `CommandAIAnswerCard`

### Responsive

- Desktop (≥1024px): Top-anchored dropdown panel as described
- Tablet (768–1023px): Same but wider relative to viewport
- Mobile (<768px): Full-screen sheet sliding down from top (`inset-0`, `rounded-none`), same as current mobile behavior but with slide-down instead of center-zoom

## Files to Edit

| File | Action | What |
|------|--------|------|
| `ZuraCommandSurface.tsx` | **Major edit** | Replace `Dialog`/`DialogContent` with `createPortal` + `motion.div` + `AnimatePresence`. Reposition as top-anchored panel. Add backdrop. Improve no-results empty state with AI fallback. |
| `TopBarSearch.tsx` | **Edit** | Accept `isOpen` prop; when true, apply `opacity-0 pointer-events-none` transition to hide pill |
| `SuperAdminTopBar.tsx` | **Edit** | Pass `isSearchOpen` prop to `TopBarSearch` |
| `DashboardLayout.tsx` | **Edit** | Pass `commandOpen` state to `SuperAdminTopBar` as `isSearchOpen` |
| `dialog.tsx` | No change | |

## No-Results AI Fallback (inline in ZuraCommandSurface)

Replace the bare `<p>No results...</p>` block (lines 374-378) with a styled card:
```
[Search icon] No results for "query"
[Sparkles] Continue with Zura AI →
```
Clicking triggers `setAiMode(true); sendMessage(query);`

## Summary of Changes

4 files edited. No new files. No database changes. Core change is replacing Radix Dialog with a portal+motion panel anchored to the top bar region, adding a pill hide transition, and improving the no-results fallback.

