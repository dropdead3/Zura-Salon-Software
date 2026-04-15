

## Add Timezone Setting to System Settings

### Problem
Organization admins cannot set their timezone — it currently only exists in the Platform admin area. The org "Drop Dead Salons" defaulted to Eastern Time, causing the scheduler to show the wrong date.

### Approach
Add a "Regional" card to the **System** settings category (`/dashboard/admin/settings?category=system`) with a timezone selector. It reads/writes `organizations.settings.defaults.timezone` — the same path that `useOrgDefaults` already consumes.

### Changes

**1. New hook: `src/hooks/useTimezoneSettings.ts`**
- Read: Fetch `organizations.settings` for the current org, extract `defaults.timezone`
- Write: Read-then-update pattern (per memory rules) — merge `defaults.timezone` into existing settings JSON
- Invalidate `organizations` query key so `useOrgDefaults` picks up changes immediately

**2. Update: `src/components/dashboard/settings/SettingsCategoryDetail.tsx`**
- Add a new "Regional" card inside the `activeCategory === 'system'` section (in the `settings` tab, alongside Appearance, Keyboard Shortcuts, etc.)
- Card contains:
  - Globe icon + "REGIONAL" title (font-display)
  - Description: "Set your organization's timezone. This affects the scheduler, reports, and all time-based displays."
  - Timezone `<Select>` dropdown using the same `TIMEZONES` list (America/New_York, Chicago, Denver, LA, Phoenix, Anchorage, Honolulu)
  - Current value from `useOrgDefaults` as the default
  - Save button that triggers the mutation

### Data flow
```text
Select timezone → useTimezoneSettings mutation
  → reads organizations.settings (current)
  → merges defaults.timezone
  → updates organizations row
  → invalidates queries
  → useOrgDefaults picks up new value
  → scheduler, formatDate, etc. all update
```

### Scope
- **1 new file**: `src/hooks/useTimezoneSettings.ts`
- **1 edited file**: `SettingsCategoryDetail.tsx` (add ~40 lines for the Regional card)
- No migration needed — `organizations.settings` is already a JSONB column

