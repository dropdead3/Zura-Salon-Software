

# Backroom Coaching Email Template + Cooldown

## Problem

Two issues:

1. **No coaching template exists** — The analytics tab invokes `send-test-email` with `template_key: 'backroom_coaching'`, but `send-test-email` expects `template_id` + `recipient_email` (not `template_key` + `to`). The call will fail silently. Additionally, no `backroom_coaching` row exists in `email_templates`.

2. **No coaching cooldown** — There's nothing preventing an admin from spamming the coaching button for the same org repeatedly.

## Changes

### 1. Database: Insert `backroom_coaching` email template

Use the **insert tool** (not migration) to add a new row to `email_templates` with:
- `template_key`: `backroom_coaching`
- Branded HTML body with Zura styling — includes org-specific metrics (reweigh %, waste %, session count), actionable tips ("Schedule a reweigh training session"), and a CTA button linking to the dashboard
- Variables: `org_name`, `reweigh_pct`, `waste_pct`, `session_count`, `reason`

### 2. Database: Add `last_backroom_coached_at` column to `organizations`

Use **migration tool** to add:
```sql
ALTER TABLE public.organizations
ADD COLUMN last_backroom_coached_at TIMESTAMPTZ;
```

### 3. Fix `BackroomAnalyticsTab.tsx` — Coaching email invocation

The current code sends `{ to, template_key, variables }` but `send-test-email` expects `{ template_id, recipient_email }`. Fix this by:

- Before sending, query `email_templates` for the `backroom_coaching` template by `template_key` to get its `id`
- Pass `{ template_id: id, recipient_email: billing_email }` to `send-test-email`
- After successful send, update `organizations.last_backroom_coached_at = now()` for the org
- On load, fetch `last_backroom_coached_at` alongside the coaching signals
- Disable the "Coach" button if `last_backroom_coached_at` is within 48 hours, show tooltip: "Coached 12h ago"

### 4. Add coaching variables to `send-test-email` sample variables

Add `org_name`, `reweigh_pct`, `waste_pct`, `session_count`, `reason` to `sampleVariables` in the edge function so test sends render properly.

## Files to Create/Modify

| File | Action |
|------|--------|
| SQL insert | Add `backroom_coaching` row to `email_templates` |
| Migration SQL | Add `last_backroom_coached_at` column to `organizations` |
| `src/components/platform/backroom/BackroomAnalyticsTab.tsx` | Fix invocation, add cooldown logic |
| `supabase/functions/send-test-email/index.ts` | Add coaching sample variables |

