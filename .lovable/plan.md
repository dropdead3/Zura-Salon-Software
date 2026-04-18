

## Goal
Remove the square icon container in `RetailPerformanceAlert` so the icon sits inline with the headline, allowing the card to render shorter.

## Change
File: `src/components/dashboard/sales/RetailPerformanceAlert.tsx`

**Before** (collapsed row height ~60px due to `w-9 h-9` icon box + `py-3`):
```tsx
<div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', visual.iconWrap)}>
  <Icon className={cn('w-4 h-4', visual.iconColor)} />
</div>
```

**After** (bare icon, ~36px row):
```tsx
<Icon className={cn('w-4 h-4 shrink-0', visual.iconColor)} />
```

## Side effects
- **Expanded body**: copy currently uses `pl-12` to align under the icon box. Drop to `pl-7` so it aligns under the headline text instead of the missing box.
- **Padding**: keep `py-3 px-4` — already minimal. Card now visually ~24px shorter.
- **`iconWrap` token**: remains in `TIER_VISUALS` but unused. Leave in place (cheap, used nowhere else, no lint impact) — removing it is out of scope cleanup.

## Out of scope
- Tier copy, thresholds, animation timing
- Removing `iconWrap` from the type definition

