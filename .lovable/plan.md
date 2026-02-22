

# Add Stylist Role to Your Account for Testing

## What This Does

Adds the `stylist` role to your account (Eric Day, eric@dropdeadhair.com) alongside your existing `super_admin` role. This will make you appear in the available stylists list when creating bookings in the New Booking Wizard.

## Technical Approach

Create a small temporary edge function (`add-user-role`) that uses the service role key to insert into `user_roles`, then invoke it to add the row:

```
user_id: 1be01269-08b2-4da4-9d57-1b6ff7678317
role: stylist
```

After confirming the insert, the edge function can be deleted since it was only needed for this one-time operation.

## Result

Your `user_roles` will contain both `super_admin` and `stylist`, so you'll show up as an available stylist for booking assignments.

