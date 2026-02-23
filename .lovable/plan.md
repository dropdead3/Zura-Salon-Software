

# Extract Source Fields into a Dedicated Card

## What changes

The "How did they hear about us?" (lead source), "Referred By", and custom source fields will be moved out of the "Client Settings" card into a new standalone "Source" card, positioned above "Important Dates."

## Changes to `src/components/dashboard/ClientDetailSheet.tsx`

### 1. New "Source" card (inserted before "Important Dates", around line 667)

- New card with its own `EditHeader` (icon: `Megaphone` or `MapPin`, title: "Source")
- Own edit mode state (`isEditingSource` / `setIsEditingSource`) and save mutation
- Contains:
  - **Lead Source** select dropdown ("How did they hear about us?")
  - **Custom source** text input (shown when "Other" is selected)
  - **Referred By** text input
- Read-only view shows source badge + referred by info

### 2. Update "Client Settings" card (line 789+)

- Remove the lead source select, custom source input, and "Referred By" input from the edit form
- Remove lead source and referred by from the read-only view
- Keep only: Client Category, External Client ID, Preferred Stylist

### 3. State and mutation updates

- Add new state variables: `isEditingSource` / `setIsEditingSource`
- Add a new `saveSourceMutation` (or fold into the existing settings mutation if it uses the same fields)
- Wire `startEditingSource` to populate edit state from current client data
- The existing `editLeadSource`, `editLeadSourceCustom`, and `editReferredBy` state variables remain -- they just move to the new card's edit form

### 4. Card ordering (top to bottom)

Current order around this area:
1. Contact Information
2. Important Dates
3. Communication Preferences
4. Client Settings (contains source fields)

New order:
1. Contact Information
2. **Source** (new card -- lead source, referred by)
3. Important Dates
4. Communication Preferences
5. Client Settings (category, external ID, preferred stylist only)

## Technical Details

| Area | Detail |
|---|---|
| File | `src/components/dashboard/ClientDetailSheet.tsx` |
| New state | `isEditingSource` boolean + setter |
| New mutation | `saveSourceMutation` -- updates `lead_source`, `lead_source_custom`, `referred_by` on `phorest_clients` |
| Moved fields | `editLeadSource`, `editLeadSourceCustom`, `editReferredBy` -- same state, rendered in new card |
| Removed from Settings card | Lead source select, custom source input, referred by input (both edit and read-only views) |
| Animation delay | Adjust `transition.delay` values to maintain staggered entrance sequence |

