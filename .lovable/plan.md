

# Bug Cleanup Pass 4 — Hardcoded Location & Contact Data

## Problems Found

Three files have hardcoded tenant addresses, phone numbers, and hours that should resolve from the database `locations` table (via `useActiveLocations()`). One file has tenant-specific placeholder text.

| File | Issue | Severity |
|------|-------|----------|
| `Booking.tsx` | Two full addresses, phone numbers, hours, email (`contact@salon.com`), and `locationOptions` array all hardcoded | HIGH |
| `StickyPhoneSidebar.tsx` | Hardcoded location names and phone numbers | HIGH |
| `stylists.ts` | `locations` export with real addresses; `Location` type locked to `"north-mesa" \| "val-vista-lakes"` | HIGH (tech debt) |
| `LocationsSettingsContent.tsx` | Placeholder text uses tenant address/phone (`"e.g., 2036 N Gilbert Rd"`, `"e.g., (480) 548-1886"`) | LOW |

The `LocationsSection.tsx` is already correctly using `useActiveLocations()` — no change needed there.

## Implementation Plan

### Step 1: Make Booking.tsx dynamic
- Import `useActiveLocations` and `useBusinessSettings`
- Replace hardcoded `locationOptions` with locations from DB
- Replace the "Visit the Salon" section (addresses, phones, hours, email) with a dynamic loop over active locations
- Email resolves from `businessSettings.email`
- Hours resolve from each location's `hours_json`
- If no locations exist, show a generic "Contact us" fallback

### Step 2: Make StickyPhoneSidebar.tsx dynamic
- Import `useActiveLocations`
- Replace hardcoded `locations` array with DB query
- Each location's phone comes from `location.phone`
- Hide sidebar entirely if no locations have phone numbers

### Step 3: Neutralize stylists.ts locations
- Remove the hardcoded `locations` export (real addresses)
- Consumers already using `useActiveLocations()` from the DB don't need this
- Keep the `Location` type generic or remove it (check dependents)
- The stylist data itself remains as flagged tech debt for future DB migration

### Step 4: Genericize placeholder text
- `LocationsSettingsContent.tsx`: Change `"e.g., 2036 N Gilbert Rd Ste 1"` → `"e.g., 123 Main St"`
- Change `"e.g., (480) 548-1886"` → `"e.g., (555) 123-4567"`

## Technical Details

- **No database changes** required — `locations` table already has address, phone, hours_json fields
- `useActiveLocations()` is already used by `LocationsSection.tsx` and 10+ other hooks, so the pattern is well-established
- `Booking.tsx` is the largest change (~100 lines of hardcoded contact info replaced with a dynamic render)
- Risk: Low — rendering-only changes with established data patterns

