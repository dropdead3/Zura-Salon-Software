

## Enhance Top Performers Card UI

The current card is functional but visually flat -- every rank row looks nearly identical, and the layout doesn't leverage the luxury depth system or progressive disclosure that the rest of the dashboard uses. Here's what changes.

### Visual Enhancements

**1. Podium-style rank differentiation**

Replace the small `Badge variant="outline"` rank pills with larger, more expressive rank indicators. The #1 row gets a subtle gold gradient left-border accent. #2 gets silver. #3 gets bronze. Rows 4+ (when "View all" is expanded) get no accent -- just the inner card background.

**2. Revenue progress bar (relative)**

Add a thin horizontal bar under each performer's revenue showing their share relative to the top performer (top performer = 100% width). This immediately communicates the gap between positions without requiring mental math. Uses `bg-primary/20` track with `bg-primary` fill, height `h-1 rounded-full`.

**3. Service vs Retail inline split**

When sorted by Total Revenue, show a subtle two-tone micro-bar or small text split: `$400 service · $175 retail`. This surfaces the retail contribution without requiring a sort toggle, giving operators instant visibility into revenue composition.

**4. "View all" expansion with ScrollArea**

Currently hard-capped at 3 entries. Add a "View all X stylists" button at the bottom (using `tokens.button.cardFooter` pattern) that expands the list inside a `ScrollArea` with `max-h-[320px]`. This aligns with the enterprise scaling pattern just implemented for Tips.

**5. Rank badge refinement**

Replace the generic `Badge variant="outline"` with a styled circle: `w-7 h-7 rounded-full flex items-center justify-center` with rank-specific background tints (gold/silver/bronze for 1-3, `bg-muted` for 4+). The number uses `font-display text-xs` for consistency.

**6. Subtle entry animation**

Use `framer-motion` `AnimatePresence` with staggered `initial={{ opacity: 0, y: 8 }}` for each row on mount. Keeps the calm aesthetic while adding polish.

### Technical Detail

| Area | Change |
|---|---|
| Rank indicator | `w-7 h-7 rounded-full` with semantic gold/silver/bronze bg tints using chart tokens |
| Revenue bar | `h-1 rounded-full bg-primary` width as percentage of top performer's value |
| Revenue split | Conditional inline `service · retail` text when both values > 0 |
| View all | `ScrollArea max-h-[320px]` + toggle button for entries beyond top 3 |
| Animation | `motion.div` with `initial/animate` opacity+y, stagger via `transition.delay` |
| Sort dropdown | Close on outside click via `useEffect` with `mousedown` listener |

### Files Changed

| File | Change |
|---|---|
| `src/components/dashboard/sales/TopPerformersCard.tsx` | All visual and interaction enhancements above |

### What Does NOT Change

- Data source (already using `phorest_transaction_items` from prior fix)
- Location filter propagation (already wired)
- Card header canonical layout (icon box + Termina title + info tooltip + filter badge)
- Privacy wrapping (`BlurredAmount`)

