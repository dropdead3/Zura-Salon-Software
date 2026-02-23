

# Households Feature: Enhanced Plan with Gap Analysis

## Core Implementation (unchanged from approved plan)

The approved plan covers:
- `client_households` and `client_household_members` tables with RLS
- Dismissal flow upgrade (reason = "household" creates a household record)
- Households tab in Client Directory with `HouseholdCard`
- Household members shown on Appointment Detail Panel
- Household card on Client Detail Sheet
- `useHouseholds` hook suite

## Additional Gaps and Enhancements Identified

### Gap 1: Client Notes should propagate household context

The `ClientNotesSection` is used in both `ClientDetailSheet` and `ClientProfileView` (booking sidebar). When a note is added to one household member (e.g., "Family is moving to Scottsdale next month"), stylists seeing the other member have no visibility into it.

**Enhancement:** Add a "Household Notes" tab or section that aggregates notes from all household members, clearly attributed. This gives stylists full family context without duplicating notes manually.

### Gap 2: Booking add-on events should consider household preferences

The `booking_addon_events` system already suggests add-ons during checkout. Household awareness could inform these:
- If one member regularly gets a specific add-on, suggest it to other household members
- "Josh usually adds a beard trim -- would Addey like to add anything today?"

**Recommendation:** This is a Phase 2/3 intelligence enhancement. For now, just surface household member service history in the appointment panel so stylists can manually cross-reference.

### Gap 3: Loyalty/Rewards program has no household concept

The loyalty system (`points_ledger`, tiers, gift cards) is entirely individual. Households with combined high spend might not reach VIP tiers individually but would as a unit.

**Recommendation:** Future Phase. Flag this as a known gap. The household tables we build now will support a "household LTV" aggregate query later without schema changes.

### Gap 4: Duplicate detection function excludes dismissed pairs but not household members

The `find_duplicate_phorest_clients` function filters out `duplicate_dismissals` but does not know about household relationships. If a household is deleted and the members are later re-evaluated, they could be re-flagged as duplicates.

**Enhancement:** Update the `find_duplicate_phorest_clients` function to also exclude pairs that are in the same household. This prevents re-flagging household members as duplicates if someone removes the dismissal record.

### Gap 5: No way to manually create a household outside the duplicate flow

The current plan only creates households when dismissing a duplicate as "Same Household." But an admin might want to group clients who were never flagged as duplicates (e.g., a parent and child with different last names and different contact info).

**Enhancement:** Add a "Create Household" action in the Households tab header, and an "Add to Household" action in the Client Detail Sheet. These use the same `useAddToHousehold` mutation but bypass the duplicate dismissal flow.

### Gap 6: Undo flow for household creation is incomplete

The current `handleDismissDuplicate` undo toast only reverses the dismissal record and re-flags `is_duplicate`. If we also created a household, the undo must also remove the household membership (and delete the household if it becomes empty).

**Enhancement:** The undo handler must chain: delete dismissal, remove household memberships, delete empty households, restore `is_duplicate` flag.

## Updated File List

| File | Change |
|------|--------|
| Migration SQL | New `client_households` and `client_household_members` tables with RLS and indexes |
| Migration SQL (addition) | Update `find_duplicate_phorest_clients` to exclude household members |
| `src/hooks/useHouseholds.ts` | New hook: `useHouseholds`, `useClientHousehold`, `useAddToHousehold`, `useRemoveFromHousehold`, `useCreateHousehold`, `useUpdateHouseholdName` |
| `src/components/dashboard/clients/HouseholdCard.tsx` | New: household display card with member list, stats, edit/remove actions |
| `src/pages/dashboard/ClientDirectory.tsx` | Add Households tab; update dismissal handler for household creation + undo; add "Create Household" button |
| `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` | Add household members section with last/next visit context |
| `src/components/dashboard/ClientDetailSheet.tsx` | Add household membership card with "Add to Household" action |
| `src/components/dashboard/clients/DuplicatePairCard.tsx` | No changes needed (already has "Same Household" option) |

## Deferred to Future Phases (no work now, but architecture supports it)

- Household-level loyalty tiers and combined LTV metrics
- Household-aware add-on/upsell suggestions during booking
- "Family booking" detection (multiple household members on the same day)
- Household-targeted marketing campaigns
- Aggregated household notes view across members

