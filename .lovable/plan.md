

# Trend Intelligence — Pass 3 Audit

All 9 items from Pass 2 are resolved. Below are remaining low-severity issues.

---

## Bugs

### Bug 1: `ai-coaching-script` uses deprecated `getClaims` API
Line 51 calls `supabase.auth.getClaims(token)` — this method doesn't exist on the standard Supabase JS client. It should use `supabase.auth.getUser()` instead, which validates the JWT and returns the authenticated user.

**Fix:** Replace `getClaims` with `getUser()`.

### Bug 2: `ai-coaching-script` creates client with anon key but user token
Line 46 creates a Supabase client with `SUPABASE_ANON_KEY` + the user's auth header. This is fine for RLS-scoped queries, but this function doesn't query the DB — it only validates auth and calls AI. Using the service role key would be more appropriate, or simply use `getUser()` on the anon-key client (which does work for JWT validation).

**Status:** Low risk. The auth check itself may silently fail due to Bug 1, making this function effectively unprotected despite having auth code.

### Bug 3: `stylist-trend-digest` queries `appointments` table, not `phorest_appointments`
Line 121 queries `appointments` table with fields like `staff_user_id`, `rebooked_at_checkout`, `is_new_client`. Other hooks in the codebase (e.g., `useRealizationRate`) use `phorest_appointments` with different column names (`appointment_date`, `total_price`, `tip_amount`). If `appointments` is a view or alias this is fine, but if it's a separate/empty table, the digest produces zero data for all stylists.

**Fix:** Verify which table holds the canonical appointment data and align the digest query accordingly.

### Bug 4: `stylist-trend-digest` AI summary not sanitized
Line 379 injects `aiSummary` directly into HTML email (`${aiSummary}`). While AI-generated content is unlikely to contain malicious HTML, this violates the project's sanitization doctrine (see `src/lib/sanitize.ts`). A prompt injection or unexpected AI output could produce broken email HTML.

**Fix:** HTML-escape the `aiSummary` string before inserting into the email template.

---

## Gaps

### Gap 1: `ai-coaching-script` tool_choice format may be incorrect
Line 156: `tool_choice: { type: "function", function: { name: "generate_coaching_plan" } }`. The OpenAI-compatible format is `tool_choice: { type: "function", function: { name: "..." } }` — which is correct. However, some gateway providers use the simpler `tool_choice: "auto"` or `{ name: "..." }`. If the Lovable AI gateway follows strict OpenAI spec this is fine; if not, structured output may fail silently and fall through to the error on line 183.

**Status:** Verify via edge function logs. No change needed if working.

### Gap 2: No error boundary around `TrendIntelligenceSection`
If `useTrendProjection` returns malformed data (e.g., a projection with `NaN` values despite the guard), the component could crash and take down the entire `MyGraduation` page. An error boundary would isolate the blast radius.

**Fix:** Wrap `TrendIntelligenceSection` in an error boundary in `MyGraduation.tsx`.

### Gap 3: `useGoalMode` doesn't clear stale keys
If a stylist changes levels (gets promoted), their old goal date persists in localStorage under the old key. Not harmful but accumulates dead storage.

**Status:** Very low priority. No fix needed.

---

## Implementation Priority

| # | Item | Type | Risk | Effort |
|---|------|------|------|--------|
| 1 | Bug 1: Replace `getClaims` with `getUser` | Bug | **High** (auth broken) | Trivial |
| 2 | Bug 3: Verify appointments table name | Bug | Medium | Small |
| 3 | Bug 4: HTML-escape AI summary in digest | Bug | Low | Trivial |
| 4 | Gap 2: Error boundary on TrendIntelligence | Gap | Low | Small |

## Files Changed

| File | Changes |
|---|---|
| `supabase/functions/ai-coaching-script/index.ts` | Replace `getClaims` with `getUser()` |
| `supabase/functions/stylist-trend-digest/index.ts` | Verify table name, HTML-escape AI summary |
| `src/pages/dashboard/MyGraduation.tsx` | Add error boundary around TrendIntelligenceSection |

3 files, all small fixes. No database migrations needed.

