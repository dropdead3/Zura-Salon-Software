

# Fix Client Search: Prevent Phone/Email From Polluting Name Results

## Problem

The query uses `OR` across name, phone, and email:
```
name.ilike.er%,phone.ilike.%er%,email.ilike.%er%
```

So typing "er" correctly filters names starting with "Er", but ALSO returns any client whose phone number contains "er" or email contains "er" -- which defeats the purpose.

## Solution

Only include phone/email in the search when the input looks like a phone number or email:

- **Name**: Always searched with starts-with (`search%`)
- **Phone**: Only searched if input contains at least one digit
- **Email**: Only searched if input contains `@`

This way, typing letters like "er" searches names only. Typing "555" searches phone numbers. Typing "eric@" searches emails.

## Changes

Apply the same logic in all three files:

### Pattern (replaces current single-line `or` filter)

```typescript
if (clientSearch) {
  const hasDigit = /\d/.test(clientSearch);
  const hasAt = clientSearch.includes('@');
  const filters = [`name.ilike.${clientSearch}%`];
  if (hasDigit) filters.push(`phone.ilike.%${clientSearch}%`);
  if (hasAt) filters.push(`email.ilike.%${clientSearch}%`);
  query = query.or(filters.join(','));
}
```

### Files

| Action | File |
|--------|------|
| Modify | `src/components/dashboard/schedule/QuickBookingPopover.tsx` (line 499) |
| Modify | `src/components/dashboard/schedule/booking/BookingWizard.tsx` (line 87) |
| Modify | `src/components/dashboard/schedule/NewBookingSheet.tsx` (line 120) |

## What This Achieves

- Typing "e" returns only clients whose name starts with "E"
- Typing "er" returns only clients whose name starts with "Er"
- Typing "555" searches phone numbers containing "555"
- Typing "eric@" searches emails containing "eric@"
- No extra results from irrelevant phone/email matches when searching by name

No new dependencies. No database changes.
