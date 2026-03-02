

## Remove Website Category from Settings Page

Good thinking -- with the Website Hub now living in the Operations Hub gateway, keeping the website card in Settings creates a confusing dual entry point. Consolidating to one location is the right pattern.

### What Changes

**File: `src/pages/dashboard/admin/Settings.tsx`**

1. Remove the `website` entry from `categoriesMap` (lines 918-923)
2. Remove `'website'` from the `SettingsCategory` type union (line 144)
3. Remove `website: 1` from the URL param validation object (line 634)
4. Remove the `{activeCategory === 'website' && <WebsiteSettingsContent />}` render block (line 1455)
5. Remove the `WebsiteSettingsContent` import (line 105)
6. Remove the `Globe` import if no longer used elsewhere in the file

### Note
The `RetailProductsSettingsContent` component has buttons that navigate to `?category=website`. Those links will need updating to point to the Website Hub route instead (`/dashboard/admin/settings?category=website` → the Website Hub destination). I'll update those references as part of this change.

