

## Rename Back to "Appointments & Transactions" + Fix Sidebar i18n Key

### Problem
Two issues visible in the screenshot:
1. The page and nav labels were renamed to just "Appointments" but you want "Appointments & Transactions" back.
2. The sidebar flyout shows the raw i18n key `nav.appointments_hub` instead of the proper label, because the translation entry was never added to the locale file.

### Fix (3 files)

**1. `src/config/dashboardNav.ts`** -- Update both label references (lines 113 and 145):
- Change `label: 'Appointments'` to `label: 'Appointments & Transactions'` in both the main nav array and the hub quick links array.

**2. `src/pages/dashboard/AppointmentsHub.tsx`** -- Update page header (line 296):
- Change `title="Appointments"` to `title="Appointments & Transactions"`.

**3. `src/locales/en.json`** -- Add the missing translation key (after line 86):
- Add `"appointments_hub": "Appointments & Transactions"` to the `nav` section. This is what the sidebar reads via `t('nav.appointments_hub')`, and its absence caused the raw key display.

### Files Changed
- `src/config/dashboardNav.ts` (2 label updates)
- `src/pages/dashboard/AppointmentsHub.tsx` (1 title update)
- `src/locales/en.json` (1 new translation key)
