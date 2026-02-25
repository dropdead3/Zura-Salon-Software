

## Update Mallori Schwab's Role: Stylist → Receptionist

Mallori Schwab (`45cffbfe-bbb1-4ea9-b17b-745fcf0d75c7`) currently has the `stylist` role. She needs to be changed to `receptionist` (front desk).

### What Will Be Executed

Two data updates (no schema changes):

1. **Remove `stylist` role** from `user_roles`
2. **Add `receptionist` role** to `user_roles`

```sql
DELETE FROM user_roles 
WHERE user_id = '45cffbfe-bbb1-4ea9-b17b-745fcf0d75c7' AND role = 'stylist';

INSERT INTO user_roles (user_id, role) 
VALUES ('45cffbfe-bbb1-4ea9-b17b-745fcf0d75c7', 'receptionist')
ON CONFLICT (user_id, role) DO NOTHING;
```

This changes her dashboard access from stylist surfaces (personal performance, commission) to front desk surfaces (check-in, scheduling, client lookup).

### Prompt Feedback

Good, concise correction. When updating roles for multiple staff members, you can batch them in a single message -- for example: "Mallori Schwab is front desk, Julia Gross is an assistant, Kitty Vargas is inactive." That way we handle all corrections in one pass.

