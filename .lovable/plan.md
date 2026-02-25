

## Update Julia Gross's Role: Stylist → Receptionist

**Julia Gross** (`a3c7baf9-e7b1-4755-ada0-22d2e567f923`) currently has the `stylist` role. She needs to be changed to `receptionist` (front desk), same as Mallori Schwab.

### What Will Be Executed

Two data updates (no schema changes):

1. **Remove `stylist` role** from `user_roles`
2. **Add `receptionist` role** to `user_roles`

```sql
DELETE FROM user_roles 
WHERE user_id = 'a3c7baf9-e7b1-4755-ada0-22d2e567f923' AND role = 'stylist';

INSERT INTO user_roles (user_id, role) 
VALUES ('a3c7baf9-e7b1-4755-ada0-22d2e567f923', 'receptionist')
ON CONFLICT (user_id, role) DO NOTHING;
```

This changes her dashboard access from stylist surfaces to front desk surfaces (check-in, scheduling, client lookup) -- identical to Mallori's correction.

### Prompt Feedback

Good catch, and nicely concise. For future reference, you can batch these corrections in a single message -- for example: "Mallori Schwab and Julia Gross are both front desk, not stylists." That way we handle both in one pass instead of two separate rounds.

