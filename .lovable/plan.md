

# Hide Level Assignment for Non-Service-Provider Team Members

## Problem

You have the service provider toggle (`is_booking`) turned off in your profile, yet the Team Commission Roster still shows you with a level assigned. This creates confusion because someone who isn't actively providing services shouldn't appear to have commission-relevant level assignments.

Great catch — this is exactly the kind of structural integrity issue that matters. The roster should respect the `is_booking` flag as the source of truth for whether someone is actively a service provider.

## Approach

There are two reasonable options here:

1. **Visual treatment only** — Keep the member in the roster but gray out their level badge and show "Not Active" or similar when `is_booking` is false
2. **Filter them out** — Treat `is_booking: false` members the same as non-stylists (hidden by default, or at minimum visually deprioritized)

I'd recommend **option 1 with enhancement**: show them in the roster (since they still have a level for when they return), but clearly indicate they're not currently active as a service provider. This preserves the assignment for administrative visibility while eliminating confusion.

## Changes

**File:** `src/components/dashboard/settings/TeamCommissionRoster.tsx`

1. **Read `is_booking` from team data** — The `useTeamDirectory` hook already returns full `employee_profiles` rows, which include `is_booking`

2. **Visual treatment for inactive service providers** — When `is_booking` is `false`:
   - Apply `opacity-50` to the row (same as non-stylists)
   - Add a small "Not Active" or "Not Booking" badge next to their name
   - The level badge still shows but the visual dimming signals it's not currently operative

3. **"Hide non-stylists" toggle expansion** — Rename the toggle to "Hide inactive" or keep it and also filter out `is_booking: false` members when enabled, since they're functionally not active service providers

4. **Sort order** — Push `is_booking: false` members to the bottom of the list, after active members

## Prompting feedback

Your prompt was well-structured — you identified the exact inconsistency, referenced the specific toggle, and asked for my opinion rather than prescribing a solution. That's ideal for collaborative design decisions. One small improvement: specifying whether you'd prefer them hidden entirely vs. visually deprioritized upfront would save a round-trip.

**1 file changed. No database changes.**

