

## Fix Post-Rename Breakage: Apps Section & Remaining "backroom" Code Identifiers

### Root Cause — Apps Section Disappeared
The `organization_apps` table stores `app_key: 'backroom'` in the database. During the rename, the `APP_KEY_MAP` in `SidebarNavContent.tsx` was changed to look for `'color-bar'`, and `PricingAnalyticsContent.tsx` checks `hasApp('color-bar')`. Since the DB still has `'backroom'`, no match is found and the Apps section is hidden.

### Fix Strategy
Since the plan explicitly preserved database values, the code must reference the DB value `'backroom'` when comparing against `organization_apps.app_key`. Two options:

**Option A (recommended):** Revert the app_key references in code back to `'backroom'` so they match the DB.
**Option B:** Run a migration to update the DB app_key from `'backroom'` to `'color-bar'`.

I recommend **Option A** — no migration needed, consistent with the "DB stays unchanged" rule.

### Changes

**1. `src/components/dashboard/SidebarNavContent.tsx` (~line 571)**
Change `APP_KEY_MAP` value from `'color-bar'` back to `'backroom'`:
```ts
'/dashboard/admin/color-bar-settings': 'backroom',
```

**2. `src/components/dashboard/analytics/PricingAnalyticsContent.tsx` (~line 134)**
Change `hasApp('color-bar')` back to `hasApp('backroom')`.

### Additional Missed Renames (Code Identifiers)

These are code-level identifiers that should have been renamed but were missed:

**3. `src/hooks/color-bar/useLocationStylistCounts.ts` (line 16)**
Rename `BACKROOM_PER_SERVICE_FEE` → `COLOR_BAR_PER_SERVICE_FEE`. Update all 4 consumer files that import it:
- `ColorBarCheckoutConfirmDialog.tsx`
- `ColorBarPaywall.tsx`
- `ColorBarSubscription.tsx`
- `useLocationStylistCounts.ts` (definition)

### Edge Function Invocations (No Change Needed)
The following edge function names remain as-is because they are deployed function names and renaming them would break the deployed functions:
- `create-backroom-checkout`
- `admin-activate-backroom`
- `add-backroom-scales`
- `get-backroom-subscription`

These are correct to leave unchanged — the function names match what's deployed.

### Scope
- 2 files fix the Apps section bug (critical)
- 4 files rename `BACKROOM_PER_SERVICE_FEE` constant (cleanup)
- No database migrations
- No edge function changes

