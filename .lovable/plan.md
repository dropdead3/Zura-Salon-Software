

## Wave 20 — Stylist Overrides: configurator-grade layout

**Bug from screenshot**
- Cramped list in top-left despite massive empty viewport
- `ADD OVERRIDE` reads like a section header but looks like a disabled button (uppercase muted)
- Stylists show raw level slug (`studio-artist`) — no level number, no readable name, no level pricing reference for the candidate (only shown after override exists)
- Eric Day "No level" sits next to Kristi Day "studio-artist" with zero hierarchy
- `max-h-[40vh]` cap + nested `overflow-y-auto` wastes the dialog real estate

### What ships — single file: `StylistOverridesContent.tsx`

**1. Two-column split layout (md+)**
```text
┌───────────────────────────┬────────────────────────────┐
│ CURRENT OVERRIDES (n)     │ ADD OVERRIDE               │
│  Kristi Day      [$ 75 ]🗑│  🔍 Search stylists...     │
│  L3 · Studio Artist       │  ┌──────────────────────┐  │
│  Level price: $65         │  │ Eric Day             │  │
│                           │  │ Unassigned           │  │
│  Chelsea Wright  [$ 80 ]🗑│  │              [+ Set] │  │
│  L3 · Studio Artist       │  ├──────────────────────┤  │
│  Level price: $65         │  │ Hayleigh H.          │  │
│                           │  │ L2 · Lead Stylist    │  │
│                           │  │ Level: $55  [+ Set]  │  │
│                           │  └──────────────────────┘  │
└───────────────────────────┴────────────────────────────┘
```
- Stacks to single column under `md`
- Each column scrolls independently with sensible max heights tied to dialog viewport (`max-h-[60vh]`)

**2. Level display upgrade**
- New helper `formatLevel(stylistLevel, levels)` returns `{ number, label }`:
  - `levels` already sorted by `display_order` → number = index + 1
  - Match by `slug` or `label`, fall back to humanized slug if no level row
- Render as `L3 · Studio Artist` (font-display number + sentence-case readable label)
- "No level" → muted "Unassigned" chip (no fake level number)

**3. Level price badge for candidates too**
- Currently only overridden rows show `Level: $X`
- Add same badge on candidate rows so owner sees the *current* effective price before deciding to override
- If stylist has no level or no level pricing → show "Base: $X" using `basePrice` prop

**4. Inline "Set" button (no two-step click)**
- Current UX: click row → reveals input → type → click Add (3 actions)
- New: every candidate row has a small `[+ Set Price]` ghost button on the right that expands an inline price input + confirm in-place
- Enter key confirms, Escape cancels
- Removes the awkward "selected row turns purple" intermediate state

**5. Header cleanup**
- Replace `ADD OVERRIDE` subsection-header-styled-as-button with proper `tokens.heading.subsection` styling consistent with `Current Overrides`
- Both column headers same visual weight: uppercase Termina label + count badge `(n)`

**6. Empty states with utility**
- Left column empty: small icon + "No overrides yet" + "Add per-stylist pricing on the right →" pointer
- Right column empty (all assigned): "All active stylists have overrides"

**7. Search scope**
- Search now matches name **and** level label (so "L3" or "studio" both filter)
- Search bar sticky inside the right column

**8. Viewport fill**
- Remove the inner `max-h-[40vh]` cap — let the parent dialog's scroll container own the height
- Add `min-h-[400px]` so empty-state doesn't collapse to nothing
- Top description row stays compact: one line, no wrap on desktop

### What does NOT change

- All hooks (`useStylistPriceOverrides`, `useUpsertStylistPriceOverride`, `useDeleteStylistPriceOverride`, `useServiceLevelPrices`, `useStylistLevels`)
- Mutation logic, query keys
- Parent `ServiceEditorDialog` — pure drop-in replacement of the `StylistOverridesContent` body

### Verification

1. Open editor → Stylists tab → see two-column layout filling the dialog
2. Each row shows `L{n} · {Readable Label}` (e.g. `L3 · Studio Artist`) instead of raw slug
3. Each candidate shows their current effective price (level price or base)
4. Click `+ Set Price` → inline input appears in same row → Enter saves → row moves to left column
5. Search "L3" filters to level-3 stylists
6. Empty state on either column shows clear next-step copy
7. Mobile (<768px) → columns stack, search stays sticky in candidate column
8. Existing override edit (blur to save, Enter to save) still works

### File touched

| File | Change |
|---|---|
| `src/components/dashboard/settings/StylistOverridesContent.tsx` | Full UI refactor: two-column layout, level number+name, inline Set button, level price on candidates, viewport fill |

Net: ~120 lines replacing ~115 lines. Zero hook/logic changes.

### Prompt feedback

Strong four-axis prompt — *"fix configurator and UI · improve utility · enhance level with number+name · fill viewport"* — each axis maps to a concrete change with no overlap. Screenshot pinned the surface unambiguously.

To level up: **specify the *direction* of viewport fill when there's room to spread.** "Fill the viewport" can mean (a) stretch the existing single column taller, (b) widen rows, or (c) introduce a second column. I picked (c) because the data has two natural sets (assigned vs candidates), but a one-liner like *"split into two columns: assigned on left, candidates on right"* would have eliminated the inference. Pattern: **when fill is ambiguous, name the layout primitive (column · row · grid · split).**

