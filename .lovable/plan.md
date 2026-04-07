

# Fix: Level Criteria Save Flow — Don't Close, Navigate to Next Tab

## Problem

When an admin configures "Level Requirements" (promotion criteria) and clicks "Save Criteria," the dialog closes immediately. The admin then has to reopen the dialog to configure "Required to Stay" (retention). This is friction-heavy, especially for the final level where both tabs need configuration.

The user expects: Save promotion criteria → automatically switch to the "Required to Stay" tab so they can configure retention → then close when done.

## Fix

### File: `src/components/dashboard/settings/GraduationWizard.tsx`

**1. Change `handleSave` behavior (~line 584-589)**

After a successful promotion criteria save, instead of closing the dialog (`onOpenChange(false)`), switch to the retention tab:

```ts
upsert.mutate(payload, {
  onSuccess: () => {
    updateLevel.mutate({ id: levelId, is_configured: true });
    // Navigate to retention tab instead of closing
    setActiveTab('retention');
    setStep(0);
    toast.success('Level requirements saved');
  },
});
```

**2. Change `handleSaveRetention` behavior (~line 635-640)**

After saving retention, NOW close the dialog (this is the final step):

```ts
upsertRetention.mutate(payload, {
  onSuccess: () => {
    updateLevel.mutate({ id: levelId, is_configured: true });
    onOpenChange(false);
  },
});
```

This keeps the existing behavior for retention save (close on success) but makes promotion save flow into the retention tab naturally.

**3. Add a "Save & Close" option to the retention footer**

The retention tab already has "Save Retention" which closes. No change needed there — the flow becomes:

- Open wizard → Level Requirements → configure → Save Criteria → auto-navigates to Required to Stay → configure → Save Retention → dialog closes

For levels that only need one tab configured, the admin can still close the dialog manually via the X button at any point.

## Scope
- Single file: `GraduationWizard.tsx`
- ~5 lines changed
- No database changes

