

# Per-Location Legal Entity Fields

## Problem
The Business Identity page has a single EIN and Legal Name at the org level. Multi-LLC organizations need these fields per location, while single-LLC orgs should continue working with just the org-level defaults.

## Approach
Follow the existing override hierarchy: Location Override → Organization Default. The org-level fields remain as the parent/default entity. Locations optionally store their own `legal_name` and `ein` for internal reference.

Stripe remains the authoritative source for payment-related legal data — these local fields are for operational visibility (payroll, bookkeeping, tax docs).

## Changes

### Database
- Add `legal_name` (nullable text) and `ein` (nullable text) columns to `locations` table via migration

### Location Settings UI
- Add a "Legal Entity" section to the location detail/edit form (wherever individual location settings are managed)
- Two fields: Legal Name and EIN
- Helper text: "Leave blank to use the organization default"
- Display the resolved value (location override or org default) with a subtle "From organization" badge when inherited

### Fleet Tab Enhancement
- In the location cards on the Zura Pay Fleet tab, show the resolved legal entity name beneath the location name when a per-location Connect account is active
- This gives owners a visual confirmation of which LLC maps to which location

### No change to Business Identity page
- The org-level EIN and Legal Name stay as-is — they represent the parent/default entity

## Files

| File | Change |
|------|--------|
| DB migration | Add `legal_name`, `ein` to `locations` |
| Location settings form | Add Legal Entity section with two fields |
| `ZuraPayFleetTab.tsx` | Show resolved legal name on location cards with per-location accounts |
| Resolution helper (optional) | `resolveLocationLegalName(location, orgSettings)` — returns location override or org default |

