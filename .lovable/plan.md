

# Fix: Receipt Settings Not Saving

## Root Cause

`useUpdateSiteSetting` (in `useSiteSettings.ts`) uses `.update()` on the `site_settings` table. If no row exists yet for `id = 'receipt_config'` + the current `organization_id`, the update matches 0 rows, returns no error, but persists nothing. The save appears to succeed (toast fires) but the data is lost on reload.

## Fix

Change `useUpdateSiteSetting` to use **upsert** instead of update, so it creates the row on first save and updates on subsequent saves.

### `src/hooks/useSiteSettings.ts` (line 43-50)

Replace the `.update()` call with `.upsert()`:

```typescript
const { error } = await supabase
  .from('site_settings')
  .upsert({
    id: key,
    organization_id: orgId,
    value: value as never,
    updated_by: user?.id,
  }, { onConflict: 'id,organization_id' });
```

### Secondary fix: Update warning text

In `ZuraPayReceiptsTab.tsx` (line 392), change `"Website Settings"` to `"Business Settings"` since social links now live there.

