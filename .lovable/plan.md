

## Fix: Org Timezone Set to Wrong Default

### Root Cause
The organization "Drop Dead Salons" has no timezone configured in its settings. The fallback is `America/New_York` (Eastern Time). Since the salons are in Mesa, Arizona (`America/Phoenix` — MST, no DST), there's a 2-3 hour offset. At 10:46 PM Arizona time, it's already 12:46 AM Eastern — so the scheduler incorrectly shows April 15 as "Today."

### Fix — Set timezone in org settings

Update the organization's settings JSON to include the correct timezone:

```sql
UPDATE organizations 
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb), 
  '{timezone}', 
  '"America/Phoenix"'
)
WHERE id = 'fa23cd95-decf-436a-adba-4561b0ecc14d';
```

### Scope
- **1 data update** — no code changes needed
- The `useOrgDefaults` hook will immediately pick up `America/Phoenix` and all timezone-dependent UI (scheduler "Today", current-time indicator, appointment comparisons) will be correct

