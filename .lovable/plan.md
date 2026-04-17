

## Prompt review

Sharp and visual — names the element ("Level 2 badge"), the destination (right side, left of X), and uses the screenshot to anchor exactly which surface (the pre-selected stylist card on the booking wizard service-step). Sharper next time: tell me whether the badge upgrade is for **prominence** (operator should immediately see what tier is being booked = pricing implications) or **polish** (current pill looks generic against the violet card chrome). I'll design for both since they point the same direction: stronger visual presence + level-tier color coding to match the existing `getLevelColor` system used elsewhere on the platform.

## Diagnosis

In `QuickBookingPopover.tsx` L1459–1488, the pre-selected stylist card renders:

```
[Avatar] [Name + Level Badge inline] ········· [X button]
```

Two issues:
1. **Position**: Badge sits crammed next to the name in the same flex group, fighting for space when names are long
2. **Visual**: Plain `secondary` shadcn badge — generic muted background, no tier signaling, no relationship to the platform's stylist-level color system (`getLevelColor` from `@/lib/level-colors.ts`) used in the directory and team hub

## Plan — Wave 22.12: Reposition + restyle Level badge

### Behavior

Move the `Level N` badge from the name cluster (left side) to a dedicated slot on the right side, immediately to the left of the X button. Upgrade visual treatment to match platform tier-color conventions and project a stronger "this matters for pricing" signal.

### Layout shift

```
Before:  [Avatar] [Name · Level 2] ········· [X]
After:   [Avatar] [Name           ] [Level 2] [X]
```

### Visual upgrades

- **Tier-aware color**: Use `getLevelColor(levelNum - 1, 7)` from `@/lib/level-colors.ts` to pull the canonical stone→gold gradient color matching the org's 7-tier ladder (Level 2 = early stone tone, Level 7 = gold)
- **Subtle ring + tinted bg**: Replace flat `secondary` variant with a custom badge: tier color at low opacity for bg, tier color at higher opacity for border ring, full tier color for text — matches the platform's "calm, executive" UI doctrine
- **Typography**: Use `font-display tracking-wider uppercase` for the "LEVEL N" text — aligns with platform UI canon (Termina for stat-style labels, never `font-bold`)
- **Sizing**: Slightly larger than current (`h-6 px-2.5`) for presence, but still subordinate to the name
- **"Unranked" fallback**: Keep but soften to a neutral muted outline so it visually de-prioritizes vs. ranked badges

### Implementation

In `src/components/dashboard/schedule/QuickBookingPopover.tsx` L1459–1488:

1. Remove the badge from inside the name flex group (L1468–1478) — restore that group to just the name
2. Add a new badge slot in the outer flex row, positioned between the name container and the X button
3. Build the badge inline using the tier color palette (since shadcn `Badge` variants don't natively support arbitrary HSL tier colors); use a styled `<div>` or `<span>` with className that applies the tier hue
4. Import `getLevelColor` from `@/lib/level-colors.ts` if not already imported in this file

Final structure:

```tsx
<div className="flex-1 min-w-0">
  <div className="text-base font-medium truncate">{preSelectedStylistName}</div>
</div>

{/* New: tier-colored level pill, right-aligned */}
{(() => {
  const levelNum = getLevelNumber(preSelectedStylistLevel);
  if (!levelNum) {
    return (
      <span className="shrink-0 inline-flex items-center h-6 px-2.5 rounded-full text-[10px] font-display tracking-wider uppercase border border-border/60 text-muted-foreground bg-muted/40">
        Unranked
      </span>
    );
  }
  const tier = getLevelColor(levelNum - 1, 7);  // 0-indexed
  return (
    <span
      className="shrink-0 inline-flex items-center h-6 px-2.5 rounded-full text-[10px] font-display tracking-wider uppercase border"
      style={{
        backgroundColor: `${tier}1A`,   // ~10% opacity bg
        borderColor: `${tier}66`,        // ~40% opacity ring
        color: tier,
      }}
    >
      Level {levelNum}
    </span>
  );
})()}

<Button variant="ghost" size="icon" ...>
  <X className="h-3 w-3" />
</Button>
```

### Acceptance checks

1. On the service-selection step with a pre-selected stylist, the level badge renders to the right side of the card, directly to the left of the X close button
2. Badge for Jamie Vieira (Level 2) shows the tier-2 stone color at low-opacity bg with matching ring and text
3. Badge typography uses `font-display tracking-wider uppercase` (Termina) — no `font-bold` or `font-semibold`
4. Long stylist names truncate cleanly without colliding with the badge (badge stays right-aligned via `shrink-0` + flex)
5. Stylists with no level (Eric Day, Alex Day, Mallori Schwab, Julia Gross) show the softened "Unranked" pill in the same right-side slot
6. Clear (X) button still works and remains the rightmost element
7. Higher tiers (Level 5, 6, 7) render with progressively warmer/gold tones, matching the rest of the platform's tier-color usage (Stylist Directory, Team Hub)

### Files

- `src/components/dashboard/schedule/QuickBookingPopover.tsx` — restructure pre-selected stylist card (L1459–1488), add `getLevelColor` import

### Open question

None — visual + structural intent is clear from the screenshot.

### Deferred

- **P2** Apply the same tier-colored level badge to the stylist picker step (L2286+) and the confirm step's stylist card for consistent tier signaling across the wizard — trigger: this PR's badge ships and feels right
- **P2** Add a hover tooltip on the badge showing the full `client_label` ("Studio Artist · Level 2") and the level's hourly/service price multiplier — trigger: when staff need quick price-tier context without leaving the booking flow
- **P3** Migrate the level badge into a shared `<StylistLevelBadge>` component used everywhere (Directory, Team Hub, booking wizard, schedule) — trigger: when the same tier-colored pill is duplicated in 3+ surfaces

