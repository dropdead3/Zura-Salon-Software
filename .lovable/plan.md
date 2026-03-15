

# Enhancements: Cron Job for Trial Expiration + Coaching Email Button

## 1. Register Daily Cron Job for `backroom-trial-expiration`

The Edge Function already exists but has no scheduled trigger. Register a `pg_cron` job to invoke it daily at 6:00 AM UTC.

**Method**: Use the SQL insert tool (not migration tool — contains project-specific URL/key) to create:

```sql
SELECT cron.schedule(
  'backroom-trial-expiration-daily',
  '0 6 * * *',
  $$ SELECT net.http_post(
    url := 'https://vciqmwzgfjxtzagaxgnh.supabase.co/functions/v1/backroom-trial-expiration',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id; $$
);
```

## 2. "Send Coaching Email" Button in Analytics Tab

Add a `PlatformButton` per row in the Coaching & Adoption Signals table that invokes an existing email-sending pattern.

| File | Change |
|------|--------|
| `BackroomAnalyticsTab.tsx` | Add "Actions" column header + `Send Coaching Email` button per row; on click, invoke `send-platform-invitation` or a new lightweight edge function call via `supabase.functions.invoke('send-test-email', { body: { to, template, org } })` using the existing `sendEmail` utility |
| `BackroomAnalyticsTab.tsx` | Add state for `sendingOrgId` to show loading spinner on the active button |

The button will:
- Use `supabase.functions.invoke('send-test-email')` with a coaching-specific template key (e.g. `backroom_coaching`)
- Pass the org's billing email and org name as variables
- Show a toast on success/failure
- Disable while sending

### No new Edge Function needed
The existing `send-test-email` function already accepts `{ to, template_key, variables }` and uses the shared `sendEmail` utility — it can serve coaching emails without modification.

## Summary

Two small changes: one SQL cron registration + one button column added to the coaching signals table.

