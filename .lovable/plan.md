

# Security Phase 8 — Edge Function Auth Hardening + Storage + Shared Middleware

## Summary

This phase addresses the remaining High-priority findings: **17 user-facing edge functions with no authentication**, **wildcard CORS on all functions**, and **missing storage SELECT policy for chat-attachments**. It also introduces a shared auth middleware to prevent future gaps.

---

## Part 1: Create Shared Auth Middleware

Create `supabase/functions/_shared/auth.ts` with reusable helpers:

```typescript
// requireAuth(req) → returns { user, supabase } or throws 401
// requireOrgMember(req, orgId) → validates user belongs to org or throws 403
// requireOrgAdmin(req, orgId) → validates admin/super_admin or throws 403
// requirePlatformUser(req) → validates platform user or throws 403
```

All functions below will import from this shared module instead of hand-rolling auth checks.

---

## Part 2: Add Auth to 17 Unprotected User-Facing Functions

These functions currently have NO auth header validation despite being called from the authenticated dashboard. Each will get `requireAuth()` + org membership verification:

| Function | Data Exposed | Auth to Add |
|----------|-------------|-------------|
| `ai-assistant` | Org config, routes | `requireAuth` |
| `ai-agent-chat` | Clients, appointments, schedules | `requireAuth` + org member |
| `execute-ai-action` | Reschedule/cancel appointments | `requireAuth` + org member |
| `ai-card-analysis` | Revenue, KPIs, performance data | `requireAuth` + org member |
| `ai-scheduling-copilot` | Schedule, staff, appointments | `requireAuth` + org member |
| `revenue-forecasting` | Revenue, sales summaries | `requireAuth` + org member |
| `growth-forecasting` | Revenue, transaction history | `requireAuth` + org member |
| `detect-anomalies` | Revenue anomalies, notifications | `requireAuth` + org member |
| `process-client-automations` | Client data, automation rules | `requireAuth` + org admin |
| `lever-engine` | KPIs, performance metrics | `requireAuth` + org member |
| `calculate-health-scores` | Client health metrics | `requireAuth` + org member |
| `calculate-org-benchmarks` | Cross-location benchmarks | `requireAuth` + org member |
| `update-sales-leaderboard` | Sales data, rankings | `requireAuth` + org member |
| `record-staffing-snapshot` | Staffing levels | `requireAuth` + org member |
| `check-staffing-levels` | Staffing data | `requireAuth` + org member |
| `calculate-preferred-stylists` | Client-stylist relationships | `requireAuth` + org member |
| `generate-daily-huddle` | Daily performance summary | `requireAuth` + org member |

Functions intentionally left open (webhooks, cron, public forms):
- `stripe-webhook` (signature-verified)
- `demo-assistant` (public demo, already rate-limited)
- `capture-external-lead` (public lead form)
- `calendar-feed` (iCal feed with token auth)
- `track-email-event` (email tracking pixel)
- `unsubscribe-*` (public unsubscribe links)
- `pandadoc-webhook` (signature-verified)
- All `send-*-reminders`, `check-*`, `process-*-queue` (cron/scheduled jobs — called internally)

---

## Part 3: Restrict CORS Origins

Create `supabase/functions/_shared/cors.ts` replacing wildcard `*` with:
```typescript
const ALLOWED_ORIGINS = [
  'https://getzura.com',
  'https://www.getzura.com',
  /https:\/\/.*--b06a5744.*\.lovable\.app/,  // Lovable previews
  /https:\/\/.*\.lovable\.app/,
];
```

Update all 17 user-facing functions above to use the shared CORS config. Webhook/cron functions keep `*` since they're called server-to-server.

---

## Part 4: Storage — Add `chat-attachments` SELECT Policy

```sql
CREATE POLICY "Authenticated users can view chat attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments');
```

Note: Ideally this would scope to channel membership, but the storage path structure (`{user_id}/...`) doesn't encode channel info. Authenticated-only access is a reasonable middle ground since chat messages themselves are already RLS-protected.

---

## Part 5: Storage — Tighten Overly Permissive Policies

Several storage policies allow any authenticated user to upload/delete without path ownership:

| Bucket | Issue | Fix |
|--------|-------|-----|
| `chat-attachments` INSERT | No path ownership | Add `(storage.foldername(name))[1] = auth.uid()::text` |
| `meeting-notes` INSERT | No path ownership | Add folder ownership check |
| `platform-feedback` INSERT | No path ownership | Add folder ownership check |
| `product-images` DELETE | No auth check at all | Add `auth.role() = 'authenticated'` |

---

## Files Affected

| File | Change |
|------|--------|
| `supabase/functions/_shared/auth.ts` | New shared auth middleware |
| `supabase/functions/_shared/cors.ts` | New shared CORS config |
| 17 edge function `index.ts` files | Add auth imports + validation |
| New migration SQL | Storage policies |

---

## What This Does NOT Cover (Deferred)

- **Realtime channel auth** — Supabase-reserved schema limitation
- **Zod validation on all function bodies** — separate pass (M6)
- **Remaining tables without org_id** (leaderboard_*, challenge_*, user_achievements) — lower priority

