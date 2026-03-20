

## Fix: Scope Dock PIN Validation to Prevent Cross-Org Access

### The Problem

Two PIN validation functions exist:
- **`validate_user_pin(_organization_id, _pin)`** — used by Kiosk and Dashboard lock. **Already org-scoped. Safe.**
- **`validate_dock_pin(_pin)`** — used by Zura Dock. **Globally scoped. Unsafe.** A PIN collision across orgs could grant access to the wrong salon's data.

### Why the Dock Is Different

The Dock is a standalone device app — it doesn't know which organization it belongs to before a PIN is entered. That's why `validate_dock_pin` takes only a PIN, not an org ID.

### Solution: Device-Level Org Binding

The Dock already stores a `dock-location-id` in localStorage for device configuration. We extend this pattern to also store `dock-organization-id`. When a Dock device is first set up, it gets bound to an organization. All subsequent PIN lookups are scoped to that org.

### Changes

**1. Database migration — scope `validate_dock_pin` to accept optional org ID**

```sql
DROP FUNCTION IF EXISTS public.validate_dock_pin(text);

CREATE FUNCTION public.validate_dock_pin(_pin text, _organization_id uuid DEFAULT NULL)
RETURNS TABLE(user_id uuid, display_name text, photo_url text, location_id text, organization_id uuid)
...
WHERE ep.login_pin = _pin
  AND ep.is_active = true AND ep.is_approved = true
  AND (_organization_id IS NULL OR ep.organization_id = _organization_id)
LIMIT 1
```

When `_organization_id` is provided, PIN lookup is scoped. When NULL (first-time setup), it falls back to global lookup but then the result's `organization_id` is stored on the device.

**2. `DockPinGate.tsx` — read and write `dock-organization-id` from localStorage**

- On mount, read `dock-organization-id` from localStorage
- Pass it to `validate_dock_pin` RPC call
- On successful first login (no stored org), persist the returned `organization_id` to localStorage
- This makes subsequent PIN entries org-scoped

**3. Dock Settings — add a "Reset Device" action**

- In the Dock settings tab, add a button to clear `dock-organization-id` and `dock-location-id` from localStorage, allowing rebinding to a different org (admin-only action behind PIN confirmation)

### Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/` | Update `validate_dock_pin` to accept optional `_organization_id` |
| `src/components/dock/DockPinGate.tsx` | Read/write `dock-organization-id` in localStorage; pass to RPC |
| Dock settings (existing) | Add "Reset Device" button to unbind org |

### Security Summary After Fix

| Surface | Org-Scoped? |
|---------|------------|
| Dashboard Lock | ✅ Yes (`validate_user_pin`) |
| Kiosk Settings | ✅ Yes (`validate_user_pin`) |
| Zura Dock (first login) | ⚠️ Global (binds device to org) |
| Zura Dock (subsequent) | ✅ Yes (device-bound org) |

