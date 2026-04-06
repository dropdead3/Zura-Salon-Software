
# Security Phase 3 — Zod Validation + Org-Scope Remaining Tables

## Part A: Zod Input Validation for Edge Functions

Add Zod schemas to validate `req.json()` bodies in all 17 auth-hardened functions. Each function gets a typed schema with proper field constraints, rejecting malformed requests with 400 errors.

| Function | Schema Fields |
|----------|--------------|
| `ai-agent-chat` | `messages` (array), `organizationId` (uuid), `channelId` (uuid, optional) |
| `ai-assistant` | `messages` (array), `organizationId` (uuid, optional) |
| `execute-ai-action` | `actionType` (enum), `params` (object), `organizationId` (uuid), `actionId` (uuid, optional) |
| `ai-card-analysis` | `organizationId` (uuid), `cardType` (string), `data` (object) |
| `ai-scheduling-copilot` | `organizationId` (uuid), `query` (string) |
| `revenue-forecasting` | `organizationId` (uuid), `forecastDays` (number 1-90), `forecastType` (enum) |
| `growth-forecasting` | `organizationId` (uuid), `timeframe` (string) |
| `detect-anomalies` | `organizationId` (uuid), `locationId` (uuid, optional) |
| `process-client-automations` | `organizationId` (uuid) |
| `lever-engine` | `organizationId` (uuid), `locationId` (uuid, optional) |
| `calculate-health-scores` | `organizationId` (uuid) |
| `calculate-org-benchmarks` | `organizationId` (uuid) |
| `update-sales-leaderboard` | `organizationId` (uuid) |
| `record-staffing-snapshot` | `organizationId` (uuid), `locationId` (uuid, optional) |
| `check-staffing-levels` | `organizationId` (uuid), `locationId` (uuid, optional) |
| `calculate-preferred-stylists` | `organizationId` (uuid) |
| `generate-daily-huddle` | `organizationId` (uuid), `locationId` (uuid, optional) |

Approach: Create `supabase/functions/_shared/validation.ts` with a `validateBody()` helper that parses + returns typed data or throws 400.

---

## Part B: Org-Scope 6 Gamification Tables

These tables currently allow cross-tenant data leakage:

| Table | Issue | Fix |
|-------|-------|-----|
| `leaderboard_weights` | No `organization_id` column | Add column + org-scoped RLS |
| `leaderboard_achievements` | No `organization_id` column (global definitions) | Add column (nullable for platform-wide defaults) + org-scoped SELECT |
| `user_achievements` | No `organization_id` column | Add column + org-scoped RLS |
| `challenge_participants` | SELECT uses `USING (true)` — any user sees all orgs | Scope via `team_challenges.organization_id` join |
| `challenge_progress_snapshots` | SELECT uses `USING (true)` | Scope via challenge → org join |
| `team_challenges` | SELECT shows all active challenges across orgs | Add `organization_id` filter to SELECT policy |

---

## Files Affected

| File | Change |
|------|--------|
| `supabase/functions/_shared/validation.ts` | New shared Zod helper |
| 17 edge function `index.ts` files | Add Zod schemas + validateBody() |
| New migration SQL | Add org_id columns + update RLS policies |

