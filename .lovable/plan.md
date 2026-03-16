

# Replace Feature Visualization with Realistic iPad Mixing Preview

Replace the current Section 4 visualization panel (the right-side Card showing static mock data) with a realistic iPad device frame containing a faithful reproduction of the actual mixing UI stylists see during a color service.

## What Changes

**File:** `src/components/dashboard/backroom-settings/BackroomPaywall.tsx` (Lines ~744-893)

Replace the current `<Card>` visualization panel with an iPad device frame mockup that shows a contextual, animated preview for each feature tab:

### iPad Device Frame
- Outer container styled as an iPad: `rounded-[2rem]` border, dark bezel (`bg-zinc-900`), inner screen area with `rounded-[1.5rem] overflow-hidden`
- Subtle shadow + reflection for realism
- Landscape orientation on desktop, portrait on mobile

### Per-Feature iPad Screens

Each feature tab renders a different "screen" inside the iPad frame:

1. **Smart Mixing** — Faithful reproduction of `LiveBowlCard` layout:
   - Bowl header with Beaker icon + "Bowl 1" + green "Mixing" badge
   - Large animated weight display ("88.6g") in the center panel
   - Product cost below ("$12.40")
   - Allowance progress bar (green, showing remaining grams)
   - Two product line rows (Koleston 7/0: 28.4g, 6% Developer: 60.2g) with brand/weight
   - "Seal Bowl" button at bottom
   - All styled with the same `bg-card/80 backdrop-blur` glass aesthetic

2. **Formula Memory** — Keep existing mock but wrap in iPad chrome

3. **Inventory** — Keep existing mock but wrap in iPad chrome

4. **Profitability** — Keep existing mock but wrap in iPad chrome

5. **Insights** — Keep existing mock but wrap in iPad chrome

### iPad Frame Component
Extract a small `iPadFrame` wrapper component (inline, not a new file):
```
function iPadFrame({ children }) {
  return (
    <div className="relative mx-auto max-w-[420px] lg:max-w-none">
      <div className="rounded-[2rem] bg-zinc-900 p-3 shadow-2xl">
        <div className="rounded-[1.5rem] bg-background overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}
```

### Enhanced Mixing Screen
Replace the current "mixing" visualization (simple progress bars) with a layout that mirrors the real `LiveBowlCard`:
- Icon box + "Bowl 1" header with badge
- Centered weight readout area (`bg-muted/30` rounded panel, large number + unit)
- Two product rows with delete icons
- Allowance bar
- Seal Bowl + discard buttons

All using static data — no hooks or real queries. Pure presentational mockup.

## Scope
- Single file edit (`BackroomPaywall.tsx`)
- ~80 lines replaced in the visualization panel area
- No new files, no new dependencies
- The feature selector tabs (left side + mobile pills) remain unchanged

