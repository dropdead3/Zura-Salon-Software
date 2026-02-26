

## Show Visibility Info on Checkout Alerts Card

The checkout alerts feature is currently restricted to Primary Owners and Super Admins (line 17-19 of `CheckoutAlertsSection.tsx`). The user wants this eligibility scope displayed on the card so account owners understand who receives these alerts.

### File: `src/components/dashboard/settings/CheckoutAlertsSection.tsx`

- Add a subtle info line below the card description (inside `CardHeader` or at the top of `CardContent`) that reads:
  **"Visible to Primary Owner and Super Admins only."**
- Use `text-xs text-muted-foreground` with a `Users` or `Shield` icon from lucide-react for visual context
- Follows the existing pattern of descriptive helper text already in the card
- No new data fetching needed — the eligibility rule is already hardcoded to `is_primary_owner || is_super_admin`

### Example output
```
🔔 CHECKOUT ALERTS
Get notified when a client checks out.
🛡 Visible to Primary Owner and Super Admins only.

Cha-ching notifications                          On [toggle]
Show a toast and play a sound when revenue comes in.

[Preview cha-ching]
```

