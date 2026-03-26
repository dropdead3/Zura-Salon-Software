

## Auto-Reset "Configured" on Setting Changes

### Problem
Once a service is marked "Configured", users can change settings (toggle tracking, vessels, assistant prep, etc.) without the configured status resetting. This means the saved configuration state can silently drift out of sync with actual settings.

### Solution
When any setting on a configured service changes (except the `backroom_config_dismissed` flag itself), automatically reset `backroom_config_dismissed` to `false` and show a toast prompting the user to re-confirm.

### Technical Detail

**File: `ServiceTrackingSection.tsx`**

**1. Modify `updateService` mutation** (lines 181–209)

In the `mutationFn`, check if the service being updated currently has `backroom_config_dismissed: true` AND the update does NOT include `backroom_config_dismissed` itself. If so, add `backroom_config_dismissed: false` to the update payload automatically.

```tsx
mutationFn: async ({ id, updates }: { id: string; updates: Partial<ServiceRow> }) => {
  const svc = (services || []).find(s => s.id === id);
  
  // Auto-reset configured status when settings change
  if (svc?.backroom_config_dismissed && !('backroom_config_dismissed' in updates)) {
    updates.backroom_config_dismissed = false;
  }

  const { error } = await supabase
    .from('services')
    .update(updates as Record<string, unknown>)
    .eq('id', id);
  if (error) throw error;
  // ... rest of sync logic
},
```

**2. Show a toast on auto-reset** in `onSuccess`:

After the mutation succeeds, if the configured status was reset, show:
```tsx
toast.info('Settings changed — please re-confirm configuration when done.');
```

To detect this, pass a flag through the mutation variables or check the updates object in `onSuccess`.

**3. Update the footer CTA text** (lines ~790–830)

When `backroom_config_dismissed` is `false` on a service that was previously configured (i.e., settings were changed), the existing "Mark Configured" button will naturally re-appear. No additional footer changes needed — the existing UI already shows the correct state.

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

