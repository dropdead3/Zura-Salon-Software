

## Enhance POS Sync Popover — Luxury Glass Styling

The current popover uses plain `bg-popover` defaults with basic borders. The screenshot confirms it needs refinement to match the Zura luxury glass bento system.

### Changes (single file: `src/components/dashboard/PhorestSyncPopout.tsx`)

**1. PopoverContent — Glass Treatment**
- Replace default `w-72 p-0` with luxury glass: `w-80 p-0 bg-card/80 backdrop-blur-xl border-border/30 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden`
- Wider (w-80 → 320px) for better breathing room

**2. Header — Refined Spacing & Typography**
- Current: `px-4 py-3 border-b border-border` — plain divider
- New: `px-5 py-3.5 border-b border-border/20` — softer divider, more horizontal padding
- Settings link: add `font-display text-[10px] uppercase tracking-wider` to match system links, remove underline hover

**3. Status Rows — Glass Inner Cards**
- Wrap each row in a subtle `bg-card-inner/50 rounded-lg px-3 py-2.5` container for depth hierarchy
- Status icons: increase to `w-4 h-4` for better touch targets
- Time-ago text: use `text-[11px]` for refinement
- Label text: use `font-sans text-sm` (already correct, just confirm no `font-medium`)

**4. Sync Now Button — Luxury Pill CTA**
- Apply `rounded-full` pill shape (already default from button component)
- Use `bg-foreground text-background hover:bg-foreground/80` for the dark CTA treatment matching the luxury glass pill standard
- Container: `px-5 pb-5 pt-2`

**5. Footer — Subtle Footnote**
- Replace `bg-muted/50 border-t border-border` with softer `border-t border-border/10 bg-transparent`
- Text: `text-[11px] text-muted-foreground/50` — quieter, less prominent

**6. Health Dot on Trigger**
- Add subtle `shadow-[0_0_4px]` glow using the health color for a premium indicator feel

### Visual Result
- Glass-backed popover with consistent depth hierarchy
- Softer dividers (border/20 instead of full opacity)
- Dark pill CTA matching the luxury floating panel standard
- Quieter footer that doesn't compete with the action button
- Inner card rows for visual separation without heavy borders

### What Stays the Same
- All sync logic, queries, and error handling unchanged
- Health calculation logic unchanged
- Tooltip and trigger behavior unchanged
- Token system compliance maintained throughout

