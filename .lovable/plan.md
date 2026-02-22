

# Improve Client Search to "Starts With" Filtering

## Problem

The current client search uses a "contains" pattern (`%search%`), so typing "e" returns any client with an "e" anywhere in their name, phone, or email. Typing "er" returns anyone containing both letters anywhere -- not necessarily starting with "Er".

## Solution

Change the database query filter from `%search%` (contains anywhere) to `search%` (starts with) for the `name` field. Phone and email will keep the contains pattern since users typically search those by partial fragments.

Additionally, the results will be sorted so that clients whose first name starts with the search term appear first, providing the prefix-priority ordering you described.

## Changes

Three files use the same query pattern and all need the same fix:

### 1. `QuickBookingPopover.tsx` (line ~499)

Change:
```
query = query.or(`name.ilike.%${clientSearch}%,phone.ilike.%${clientSearch}%,email.ilike.%${clientSearch}%`);
```
To:
```
query = query.or(`name.ilike.${clientSearch}%,phone.ilike.%${clientSearch}%,email.ilike.%${clientSearch}%`);
```

### 2. `BookingWizard.tsx` (line ~87)

Same change -- remove the leading `%` on `name.ilike`.

### 3. `NewBookingSheet.tsx` (line ~120)

Same change -- remove the leading `%` on `name.ilike`.

## What This Achieves

- Typing "e" returns all clients whose name starts with "E"
- Typing "er" narrows to clients whose name starts with "Er" (e.g., "Eric", "Erica", "Ernest")
- Phone and email search still use contains, since partial matching is more useful there
- Combined with the existing alphabetical sort, results appear in intuitive A-Z order within matches

## File Summary

| Action | File |
|--------|------|
| Modify | `src/components/dashboard/schedule/QuickBookingPopover.tsx` -- name search starts-with |
| Modify | `src/components/dashboard/schedule/booking/BookingWizard.tsx` -- name search starts-with |
| Modify | `src/components/dashboard/schedule/NewBookingSheet.tsx` -- name search starts-with |

Single-character change per file. No new dependencies. No database changes.
