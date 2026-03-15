

# Coaching Email: Platform Branding + Outreach Counter

## Problem

1. **Wrong sender**: The coaching email routes through `send-test-email`, which uses `sendOrgEmail` when the caller has an org profile. Since platform admins do have org associations, the coaching email gets org branding instead of Zura platform branding. This is platform-initiated outreach and should always use `sendEmail` (Zura branding).

2. **No outreach tracking**: There is no counter tracking how many coaching emails have been sent across all orgs over time.

## Changes

### 1. New Edge Function: `send-coaching-email`

Create a dedicated `supabase/functions/send-coaching-email/index.ts` instead of piggybacking on `send-test-email`. This function will:
- Accept `{ org_id }` in the body
- Auth-check the caller is a platform user (`platform_roles`)
- Look up the org's billing email and name
- Look up the `backroom_coaching` template by key, resolve variables from `staff_backroom_performance` (avg reweigh %, waste %, session count)
- Use `sendEmail` (platform-level, Zura branding) — not `sendOrgEmail`
- No `[TEST]` banner — this is a real email
- Update `organizations.last_backroom_coached_at` server-side
- Increment a `coaching_emails_sent` counter (see below)
- Return success/failure

### 2. Coaching Counter Table

Add a single-row config table (or reuse an existing pattern) to track outreach volume. Simplest approach: add a `backroom_coaching_emails_sent` integer column to an existing platform stats mechanism. Since no such table exists, add a column to `organizations` is wrong (it's per-org). Instead, use a lightweight `platform_kpi_counters` table:

**Migration**:
```sql
CREATE TABLE IF NOT EXISTS public.platform_kpi_counters (
  key TEXT PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_kpi_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform users can read counters"
  ON public.platform_kpi_counters FOR SELECT
  USING (public.is_platform_user(auth.uid()));
-- Edge function uses service role, so no INSERT/UPDATE policy needed for writes
INSERT INTO public.platform_kpi_counters (key, value) VALUES ('backroom_coaching_emails_sent', 0);
```

The edge function increments this counter on each successful send via service role client.

### 3. Update `BackroomAnalyticsTab.tsx`

- Replace the `handleSendCoachingEmail` logic: instead of querying template + invoking `send-test-email`, simply invoke `send-coaching-email` with `{ org_id: signal.orgId }`
- The edge function handles everything (template lookup, sending, cooldown update)
- Fetch `backroom_coaching_emails_sent` from `platform_kpi_counters` and display it as a KPI card in the analytics tab header row

### 4. Update `useBackroomPlatformAnalytics.ts`

- Add a query for `platform_kpi_counters` where `key = 'backroom_coaching_emails_sent'` and expose the count in `BackroomPlatformMetrics`

## Files

| File | Action |
|------|--------|
| `supabase/functions/send-coaching-email/index.ts` | **New** — dedicated platform-branded coaching email sender |
| Migration SQL | **New** — `platform_kpi_counters` table with RLS |
| `src/components/platform/backroom/BackroomAnalyticsTab.tsx` | Simplify handler to invoke new function; add KPI card |
| `src/hooks/platform/useBackroomPlatformAnalytics.ts` | Fetch coaching email counter |

