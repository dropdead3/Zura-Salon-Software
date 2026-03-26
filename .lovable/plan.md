

## Remove All "Vish" References — Final Pass

### Finding
The only remaining file is `src/components/dashboard/backroom-settings/CompetitorComparison.tsx` with 41 occurrences. This is the competitor comparison table that uses "Vish" as a named column alongside "SalonScale".

### Change

**`CompetitorComparison.tsx`** — Replace all `vish` references with a generic competitor label:

- Rename the `vish` property in the `Row` type to `competitorA`
- Rename `'Vish'` column label to `'Competitor A'` (or remove the column entirely if you'd prefer)
- Update all data rows: `vish:` → `competitorA:`
- Update `pricingComparison` key from `vish` to `competitorA`
- Update the `columns` array entry

This is a straightforward find-and-replace across the single file. No other files in the codebase reference "Vish".

| File | Change |
|------|--------|
| `CompetitorComparison.tsx` | Rename all `vish` → `competitorA`, label → `Competitor A` |

