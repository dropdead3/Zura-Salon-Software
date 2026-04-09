

# Search Bar → Command Surface Entry Point Redesign

## Audit Findings

**Current `TopBarSearch.tsx`**: A plain `<button>` with `bg-muted/50`, `border-border`, `rounded-full` — blends into the nav bar so much it feels invisible. No depth, no hover distinction, no transition states. The placeholder ("Search or ask...") uses generic `text-muted-foreground`. The `⌘K` kbd badge is low-contrast and hard to read.

**Context**: Sits inside the top bar's glass pill (`bg-card/80 backdrop-blur-xl`). The search bar uses `bg-muted/50` against this — nearly zero contrast separation. Max width is `280px–xl` depending on breakpoint.

**What exists to reuse**: `tokens.drawer`, `tokens.shine`, `tokens.input.search`, existing glass aesthetic patterns, existing transition conventions (`duration-150`).

## Changes — Single File: `src/components/dashboard/TopBarSearch.tsx`

No other files modified. No new design system additions needed.

### Part 1: Closed/Rest State

**Contrast & Depth**:
- Background: `bg-muted/40` → `bg-muted/60` (subtle lift from nav glass)
- Border: `border-border` → `border-border/70` (slightly softer edge, not harsh)
- Add `shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.04)]` — inner top highlight creating subtle depth/glass catch
- Add `shadow-sm` outer shadow for surface separation

**Typography**:
- Placeholder: Change from "Search or ask..." to "Search or ask Zura..."
- Keep `font-sans text-sm text-muted-foreground` — but add `tracking-wide` for intentionality

**Icon**:
- Search icon: `text-muted-foreground` → `text-muted-foreground/70` (slightly softer, feels refined)
- `strokeWidth={1.5}` on the Search icon (thinner = more premium)

**⌘K Badge**:
- `bg-muted/50` → `bg-muted/70` with `border-border/50`
- Text: `text-[10px]` → `text-[11px]` for legibility
- Add `tracking-wider` to the K character
- Command icon: keep `w-3 h-3`

### Part 2: Hover State

- `hover:bg-muted/80` (brightness shift)
- `hover:border-border` (edge sharpens on hover)
- `hover:shadow-md` (very subtle elevation increase)
- Transition: `transition-all duration-200 ease-out` (covers bg, border, shadow together)
- The ⌘K badge: `group-hover:text-foreground/60` (subtle brighten on parent hover)

### Part 3: Focus / Active State

- `active:scale-[0.995]` — micro press feedback (barely perceptible but feels tactile)
- `focus-visible:ring-1 focus-visible:ring-foreground/10` — clean focus ring for keyboard users

### Part 4: Open State Transition

No change needed — TopBarSearch already just calls `onClick` which opens `ZuraCommandSurface` via dialog. The dialog already has `tokens.drawer.overlay` with backdrop-blur and the content panel uses glass bento styling. The "origin point" relationship is maintained by the dialog centering with sidebar offset.

### Part 5: Pre-Type State

Already implemented via `CommandRecentSection` — shows recent searches and recently viewed pages. No changes needed.

### Part 6: Responsiveness

The search bar already has responsive max-width (`max-w-[280px] lg:max-w-md xl:max-w-lg 2xl:max-w-xl`). The component is `hidden lg:block` at the top bar level — mobile uses a different entry point. One refinement:
- On the command surface dialog: already has `max-sm:w-screen max-sm:h-screen` for mobile full-screen. No changes needed.

### Part 7: Micro-Interactions

- `transition-all duration-200 ease-out` instead of current `transition-colors` — this enables shadow and border transitions
- `group` class on the button to enable child hover coordination
- ⌘K badge transitions via `transition-colors duration-200`

### Part 8: Performance

No DOM changes, no layout shifts. Pure CSS transitions on existing element. Sub-frame response guaranteed.

### Part 9: Restraint Check

- No glow effects
- No color additions
- No size increase
- Shadow values are minimal (`shadow-sm`, `shadow-md` on hover)
- All values use existing HSL variables

## Before → After Summary

| Aspect | Before | After |
|--------|--------|-------|
| Background | `bg-muted/50` (flat, invisible) | `bg-muted/60` + inner highlight (surface) |
| Border | `border-border` (harsh) | `border-border/70` (refined), sharpens on hover |
| Shadow | None | `shadow-sm` rest, `shadow-md` hover |
| Hover | Only bg color change | Elevation + brightness + border sharpening |
| Click | No feedback | `scale-[0.995]` micro-press |
| Transitions | `transition-colors` | `transition-all duration-200 ease-out` |
| Placeholder | "Search or ask..." | "Search or ask Zura..." + tracking-wide |
| ⌘K badge | Low contrast, tiny | Slightly larger text, better contrast |
| Icon | `strokeWidth={2}` default | `strokeWidth={1.5}` (thinner, premium) |

