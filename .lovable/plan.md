

## Enhance Bowl Cards & Action Bar — Matching Reference UI

### Analysis of Reference vs Current

The reference image reveals several UX gaps in the current Dock mixing view:

| Feature | Reference | Current |
|---------|-----------|---------|
| Bowl cards show ingredients | Yes — name, category, weight inline | No — just "Bowl N" + status label |
| "Add Bowl" as inline grid card | Dashed card in the 2-col grid | Separate full-width button below grid |
| Bottom action bar | Contextual: Reweigh, Close, Mix More, Continue Mixing | Single "Complete Session" button |
| Bowl naming | "New Formula" with "In Progress" subtitle | Generic "Bowl 1" |
| Bowl icon with color | Yellow mortar-pestle icon on card | Small status icon only |

### Changes

**1. Rich Bowl Cards with Ingredient Preview**

**`src/components/dock/appointment/DockServicesTab.tsx`**

- **`DemoBowlCard`**: Show a bowl icon (FlaskConical) with a yellow/violet tinted circle, bowl name ("New Formula" or "Bowl N"), status subtitle ("In Progress" / "Sealed"), and a list of up to 3 ingredient lines showing product name, category, and weight (e.g. "Powder Lightener with Bonding · Lighteners · 19.9g"). Overflow shows "+N more".

- **`BowlCard`**: For real (non-demo) bowls, fetch ingredient data. Since we don't have lines in the session query, add a lightweight lines preview via a sub-query or pass lines data down. For now, show the existing stats (total weight, cost) in a more visual format matching the reference card style.

- **Inline "Add Bowl" card**: Move the "Add Bowl" button into the grid as a dashed-border card (same height as bowl cards) with a mortar icon + "+ Add Bowl" text, instead of a separate full-width button below.

**2. Contextual Bottom Action Bar**

**`src/components/dock/appointment/DockServicesTab.tsx`**

Replace the single "Complete Session" button with a sticky bottom bar showing contextual actions based on session state:

- **Has unsealed bowls**: Primary = "Continue Mixing" (violet, opens first open bowl), Secondary = "Add Bowl"
- **All bowls sealed, needs reweigh**: Primary = "Reweigh" (pink/rose), Secondary = "Close"
- **All reweighed**: Primary = "Complete Session" (emerald), Secondary = "Mix More" (adds another bowl)
- **Mixed states**: Show the most relevant primary + secondary actions

The bar uses a frosted/elevated background pinned to the bottom of the content area with `sticky bottom-0`.

**3. Bowl Card Visual Upgrade**

- Add a colored icon circle (amber/yellow for in-progress, emerald for complete, violet for mixing) matching the reference's mortar-pestle badge
- Three-dot menu icon on each card (future: rename, discard, duplicate)
- Card min-height for visual consistency in the grid

### Files Modified

1. **`src/components/dock/appointment/DockServicesTab.tsx`** — Rich bowl cards, inline Add Bowl grid card, contextual bottom action bar
2. No new files needed — all changes are within the existing component

### Technical Detail

- Demo bowl cards already have `lines: FormulaLine[]` available — just render them
- Real bowl cards would need `mix_bowl_lines` data; for now show weight/cost summary (ingredient preview can be added later when the query is extended)
- Bottom bar actions use existing handlers: `setActiveBowl()` for Continue Mixing, `setShowBowlDetection()` for Add Bowl, `setShowComplete()` for Complete Session
- The three-dot menu is a placeholder button (no dropdown yet) — tapping the card still opens the bowl

