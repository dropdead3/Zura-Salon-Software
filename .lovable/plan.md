

## Swap "Exceeded" and "All appointments complete" Order

Tiny swap in `AggregateSalesCard.tsx` at lines 714-722. Currently shows "✓ Exceeded · ✓ All appointments complete" — will flip to "✓ All appointments complete · ✓ Exceeded".

### Change

**File: `src/components/dashboard/AggregateSalesCard.tsx` (lines 714-722)**

Swap the two `<span>` blocks so "All appointments complete" comes first and "Exceeded" comes second.

One line group, ~10 lines touched. No logic changes.

