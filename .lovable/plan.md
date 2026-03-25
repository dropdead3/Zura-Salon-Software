

## Update "Remove Formula" → "Discard Formula"

### Changes

**1. `src/components/dock/mixing/DockBowlActionSheet.tsx`**
- Rename `'remove'` to `'discard'` in the `BowlAction` type union
- Update label from `'Remove Formula'` to `'Discard Formula'`

**2. `src/components/dock/appointment/DockServicesTab.tsx`**
- Update `case 'remove':` handler to `case 'discard':`

Two files, two small edits each.

