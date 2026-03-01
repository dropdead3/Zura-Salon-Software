

## Fix Collapsed Sidebar Styling — Invisible Icons and Logo

### Problems Identified

1. **Nav icons invisible in collapsed light mode** — Non-active items use `text-foreground/50` (line 294), which at 50% opacity on a cream background is nearly invisible
2. **Logo fallback invisible** — When no custom icon is uploaded, the initials circle uses `bg-foreground/10` (line 344) — nearly invisible on light backgrounds
3. **Collapse toggle button invisible** — Uses `bg-foreground/10 text-muted-foreground` (line 369) — same problem

### Fix — Single file: `src/components/dashboard/SidebarNavContent.tsx`

**1. Nav icon opacity (line 294)**
Change `text-foreground/50` to `text-muted-foreground` for collapsed non-active items. This uses the proper semantic token which has adequate contrast in both light and dark modes.

**2. Initials fallback circle (line 344)**
Change `bg-foreground/10 dark:bg-white/10 text-foreground dark:text-white` to `bg-muted text-foreground dark:bg-white/10 dark:text-white`. The `bg-muted` token provides visible contrast in light mode.

**3. Collapse toggle button (line 369)**
Change `bg-foreground/10 hover:bg-foreground/15 text-muted-foreground hover:text-foreground dark:bg-white/10 dark:hover:bg-white/15 dark:text-white/60 dark:hover:text-white` to `bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground dark:bg-white/10 dark:hover:bg-white/15 dark:text-white/60 dark:hover:text-white`. Same pattern — swap `bg-foreground/10` for `bg-muted`.

### No structural changes
All fixes are class string swaps for proper semantic color tokens. No layout, logic, or component changes.

