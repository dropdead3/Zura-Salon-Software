

## Fix Collapsed Sidebar Icon Contrast

### Problem
The collapsed sidebar nav icons use `text-muted-foreground` which resolves to `hsl(0 0% 45%)` — a medium gray. Against the sidebar's `bg-card/80` background at `hsl(40 25% 98%)`, this creates low visual contrast, making icons appear nearly invisible, especially on high-brightness displays.

### Root Cause
The `text-muted-foreground` token is designed for secondary body text on white/cream cards — it's intentionally subdued. In a collapsed sidebar where icons are the **only** visual affordance (no labels), they need stronger contrast to remain usable.

### Fix — 1 file: `src/components/dashboard/SidebarNavContent.tsx`

**1. Non-active collapsed nav icons (line 294)**
Change from `text-muted-foreground` to `text-foreground/60` — this uses the main foreground color (`0 0% 8%`) at 60% opacity, giving substantially more contrast than `muted-foreground` (45% lightness) while still being visually softer than active items.

**2. Logo initials fallback (line 344)**
Change `text-foreground` to `text-foreground/80` — keep strong but not full contrast for the initials circle since it has a `bg-muted` background.

**3. Collapse toggle chevron button (line 369)**
Change `text-muted-foreground` to `text-foreground/60` — same treatment as nav icons for consistency.

**4. Footer nav items** — Search for any other collapsed icon references using the same pattern and apply `text-foreground/60`.

### What This Changes
- Non-active collapsed icons go from ~45% lightness gray to ~8% lightness at 60% opacity (effectively ~40% but with warm tint matching the foreground color, appearing darker)
- Active items unchanged (already `bg-foreground text-background`)
- Dark mode overrides in `sidebar-dark` CSS class unchanged (they use `!important` and apply only when `resolvedTheme === 'dark'`)

