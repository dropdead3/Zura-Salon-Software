

## Allow Dismissing "Needs Attention" on Configured Services

### Problem
The `needsAttention` logic flags any chemical service that isn't tracked, or any tracked service missing components/allowance. There's no way to say "I've reviewed this and it's intentionally configured this way" — so the attention count stays inflated.

### Approach: "Dismiss" per service

Add a `backroom_config_dismissed` boolean column on `services`. When set, `needsAttention()` returns false for that service regardless of its tracking/component/allowance state.

### Changes

**1. Database migration**
```sql
ALTER TABLE public.services
  ADD COLUMN backroom_config_dismissed boolean NOT NULL DEFAULT false;
```

**2. Update `needsAttention()` logic (~line 218)**

Add early return:
```tsx
if (s.backroom_config_dismissed) return false;
```

**3. Add dismiss/restore action in the drill-down row**

Inside each expanded service row, add a small button:
- If the service currently needs attention → show a "Mark Configured" button (check icon) that sets `backroom_config_dismissed = true`
- If already dismissed → show a subtle "Re-flag" link to reset it back to false

This uses the existing `updateService` mutation. The button sits near the status badges (next to "No components" / "No allowance" indicators).

**4. Visual treatment**

Dismissed services in the "All" tab get a subtle muted style and a small "Configured ✓" badge so users know they were intentionally skipped.

### Files Modified
- New SQL migration (`backroom_config_dismissed` column)
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx` (attention logic + dismiss button in drill-down)

