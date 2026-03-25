

## Fix "nav.zura_backroom" Label in Sidebar

### Problem
The sidebar shows the raw i18n key `nav.zura_backroom` instead of "Zura Backroom" because the locale file is missing this translation entry.

### Fix
Add `"zura_backroom": "Zura Backroom"` to the `dashboard.nav` object in `src/locales/en.json`.

### Files Modified
- `src/locales/en.json` — add missing translation key

