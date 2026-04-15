

## Refine Scheduler Top Bar to Match Active Theme

### Problem
The scheduler header bar (`ScheduleHeader.tsx`) uses hardcoded near-black (`hsl(0,0%,8%)`) with cream-toned text (`hsl(40,20%,92%)`). This looks disconnected from the active theme — especially Zura, which uses deep violet/navy tones (hue 230-270). The bar should feel like it belongs to the theme.

### Solution
Replace the hardcoded HSL colors with CSS variable references that resolve from the active theme. This makes the header adapt automatically when users switch themes (Zura → dark purple/navy, Ocean → dark navy blue, Rose → dark rose, etc.).

### Changes

**File: `src/components/dashboard/schedule/ScheduleHeader.tsx`**

Replace all hardcoded color values in the top bar and its children:

| Current (hardcoded) | Replacement (theme-aware) |
|---|---|
| `bg-[hsl(0,0%,8%)]` | `bg-[hsl(var(--sidebar-background))]` |
| `text-[hsl(40,20%,92%)]` | `text-[hsl(var(--sidebar-foreground))]` |
| `border-[hsl(40,20%,92%)]/10` | `border-[hsl(var(--sidebar-border))]` |
| `bg-[hsl(40,20%,92%)]/10` | `bg-[hsl(var(--sidebar-accent))]` |
| `border-[hsl(40,20%,92%)]/20` | `border-[hsl(var(--sidebar-border))]` |
| `text-[hsl(40,20%,92%)]/50` | `text-[hsl(var(--sidebar-foreground))]/50` |
| `text-[hsl(40,20%,92%)]/70` | `text-[hsl(var(--sidebar-foreground))]/70` |
| `text-[hsl(40,20%,92%)]/80` | `text-[hsl(var(--sidebar-foreground))]/80` |
| `hover:bg-[hsl(40,20%,92%)]/10` | `hover:bg-[hsl(var(--sidebar-accent))]` |
| `hover:bg-[hsl(40,20%,92%)]/20` | `hover:bg-[hsl(var(--sidebar-accent))]` |
| `text-[hsl(0,0%,8%)]` (active pill text) | `text-[hsl(var(--sidebar-background))]` |

**Why sidebar tokens?** The sidebar variables are the closest semantic match — they represent the app's primary chrome surface (dark, branded) and already carry the correct hue per theme. For Zura dark: `sidebar-background` is `230 20% 8%` (deep navy-violet) and `sidebar-foreground` is `240 20% 95%`.

### Result
- **Zura theme**: Header becomes deep navy-violet instead of flat black
- **Ocean theme**: Header picks up dark blue tones
- **Rose/Sage/Ember**: Each gets its own tinted dark surface
- **Noir**: Stays pure monochrome (as designed)
- No new CSS variables or theme changes needed — just referencing existing ones

### Technical Details
- ~15 find-and-replace operations within the `ScheduleHeader.tsx` dark header div (lines 127-393)
- The secondary nav bar (line 396) already uses `bg-card` and theme tokens — no changes needed there
- The view toggle animated pill uses cream for the active background and dark for active text — these swap to `sidebar-foreground` and `sidebar-background` respectively

