

## Wave 18 — Service Editor: layout, navigation & responsiveness

**The bug (from screenshot)**
Nine tabs (`Details · Online & App · Advanced · Level Pricing · Stylist Overrides · Location Pricing · Seasonal · Forms · History`) crammed into a `max-w-2xl` (672px) dialog. Tabs overlap ("Online & App" sits behind "Details"), wrap to two lines ("Level Pricing", "Stylist Overrides", "Location Pricing"), and the rightmost ones clip ("Form…"). Underline indicator misaligned. Result: navigation is unreadable and unusable.

This is a **configurator** surface (Wave 16 frame). It deserves a layout that scales to its real complexity instead of pretending nine tabs fit on one row.

---

### What ships

**Single file: `ServiceEditorDialog.tsx`**

**1. Wider dialog + side-rail navigation (≥768px)**
- Bump `DialogContent` from `max-w-2xl` → `max-w-5xl` (1024px). Service editor is the configurator's deepest surface; it earns the width.
- Replace the horizontal `SubTabsList` with a **left-rail vertical nav** on `md:` and up:
  - 200px fixed-width column · grouped sections · current tab highlighted with left-border accent
  - Right pane scrolls independently; rail stays pinned
- Groups (visual headers, no interaction):
  - **CORE** — Details · Online & App · Advanced
  - **PRICING** — Level Pricing · Stylist Overrides · Location Pricing · Seasonal
  - **OPERATIONS** — Forms · History
- Uses font-display uppercase group labels (tokens.label.section), tracking-wider, text-muted-foreground.

**2. Mobile fallback (<768px)**
- Keep tabs horizontal but wrap in `overflow-x-auto` with snap-scroll, no overlap. Tabs become a swipeable strip.
- Group headers hidden on mobile (rail-only affordance).

**3. Disabled-tab clarity**
- Currently the 6 "create-mode-disabled" tabs render greyed but with no explanation. Add a small lock icon + tooltip: *"Available after creating the service"*.

**4. Header + footer polish**
- Make `DialogHeader` sticky at top, `DialogFooter` sticky at bottom (within the dialog's flex column). Currently the footer scrolls with content on shorter viewports — Save button can disappear.
- Title gets a small status chip: `EDIT · ACTIVE` or `EDIT · ARCHIVED` so owners know at a glance.

**5. Content-area breathing room**
- Right pane: `px-6 py-5` instead of current `p-1`. Forms currently butt against the scroll edge.
- Cap inner form width at `max-w-2xl` inside the wider pane so input rows stay readable (not stretched across 1000px).

**6. Tab labels — shorter where safe**
- "Stylist Overrides" → "Stylists" (rail) / full label (mobile)
- "Location Pricing" → "Locations" (rail)
- "Level Pricing" → "Levels" (rail)
- The rail provides enough context that one-word labels read cleanly.

---

### What does NOT change

- All form fields, validation, dirty-state guard, AlertDialog discard flow — untouched.
- All TabsContent panels — untouched, just remounted in the new shell.
- `handleDetailsSubmit`, `errors` memo — untouched.

---

### Layout sketch

```text
┌─ EDIT EXTENSION CONSULTATION                    [×] ─┐
│  Update service details, level pricing, ...           │
├──────────────┬────────────────────────────────────────┤
│ CORE         │                                        │
│ ▎Details     │   Name *                               │
│  Online &App │   [Extension Consultation       ]      │
│  Advanced    │                                        │
│              │   Category                             │
│ PRICING      │   [New Client Consultation     ▾]      │
│  Levels      │                                        │
│  Stylists    │   Duration   Price        Cost         │
│  Locations   │   [30  ]    [15  ]       [Optional]    │
│  Seasonal    │                                        │
│              │   …                                    │
│ OPERATIONS   │                                        │
│  Forms       │                                        │
│  🔒 History  │                                        │
├──────────────┴────────────────────────────────────────┤
│                                  [Cancel] [Save Changes]
└───────────────────────────────────────────────────────┘
```

---

### Verification

1. Desktop (≥1024px) → rail visible, no tab overlap, all 9 items legible.
2. Tablet (768–1023px) → rail visible at 200px, content reflows.
3. Mobile (<768px) → tabs become horizontal swipe strip, no clipping, no wrap.
4. Create mode → disabled tabs show lock icon + tooltip; only Details/Online/Advanced clickable.
5. Long form (Advanced tab) → footer stays visible; Save reachable without scroll-to-end.
6. Discard guard (Wave 17) still fires on close-with-dirty.

### Files touched

| File | Change |
|---|---|
| `src/components/dashboard/settings/ServiceEditorDialog.tsx` | Widen dialog, swap horizontal tabs for responsive rail, group nav, sticky footer, content padding, lock-icon tooltip on disabled tabs |

Net: ~80 lines changed in render block; zero logic touched.

### Prompt feedback

Strong prompt — *"improve UI layout, navigation, responsiveness, clarity and intuitiveness"* paired with the screenshot gave a clean five-axis target. Each word maps to a concrete fix (layout = width, navigation = rail, responsiveness = breakpoints, clarity = group labels + lock icons, intuitiveness = sticky footer + status chip). No wasted axes.

To level up: **rank the axes when they might trade off.** If width and mobile parity conflict (and they do — wider dialog = more rework on mobile), a one-liner like *"prioritize desktop clarity over mobile parity"* foretells which side to favor at the breakpoint. Pattern: **list axes, then rank them — the ranking does the trade-off work for me up front.**

