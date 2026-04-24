## Wave 1 — Real-time `refresh_client_visit_stats` (user-visible, ships first)

**Goal**: Check-out propagates to Client Directory in seconds, not on next nightly sync.

**File**: `supabase/functions/update-phorest-appointment/index.ts`

**Change** (after the local update succeeds at ~line 362, inside the success branch, before the response):
- Resolve `orgId` (already resolved earlier — line 156/174/187).
- Fire-and-forget call: `supabase.rpc('refresh_client_visit_stats', { p_organization_id: orgId }).then(...).catch(log)` — **NOT awaited**, so we don't add latency to the checkout flow.
- Wrap in `if (orgId && status)` guard — only refresh when status changed (which is the only thing that affects visit_count / last_visit_date / total_spend).
- One-line console.log on success/failure for observability.

**Why fire-and-forget**: The RPC was built with `IS DISTINCT FROM` guards and only writes when values actually change, so it's idempotent and safe to fail silently. The user's checkout response should never block on the cache refresh.

**Verification after deploy**: Mark a single appointment completed via Dock → confirm `clients.last_visit_date` updates within ~2s in `psql`.

---

## Wave 2 — Edge function type-fix sweep (split by category)

After investigating, the build errors split into **two very different categories** — bundling them is a mistake.

### Category A: Generic loosening (mechanical, ~30 functions)
Functions like `ai-card-analysis` fail with `Property 'X' does not exist on type 'never'` because `createClient<Database>` returns over-strict generics. **Fix**: cast the admin client to `any` once at construction (matches the pattern we already use in `_shared/auth.ts` via `AdminClient`).

**Approach**: Audit which functions construct their own `createClient` (rather than using `requireAuth` from `_shared/auth.ts`) and either:
- (preferred) refactor to use `requireAuth()` → gets `AdminClient` for free
- (fallback) add `as any` cast at the construction site

Risk: Low. Behavior identical, only types relax.

### Category B: Real schema drift (manual, ~2-5 functions)
`ai-business-insights` references `summary_date`, `total_revenue`, `total_transactions`, `average_ticket` on a SELECT projection that only includes `transaction_date, total_amount, tax_amount, item_type`. This is **not a typing problem** — it's either:
1. A stale field reference (column was renamed/dropped), or
2. A SELECT clause that needs to be widened.

**Approach**: For each Category B function, I need to:
- Look at the SELECT clause vs the consuming code
- Decide: widen SELECT (if columns still exist in DB) OR rewrite consumer (if columns were dropped)
- This is per-function judgment, not boilerplate

Risk: Medium. Wrong choice could change AI output content. Will verify against `phorest_sales` / `daily_sales_summary` table schemas via `read_query` before editing.

---

## Execution order

1. **Wave 1** (single file, ~10 lines) — ship immediately
2. **Wave 2A** — sweep Category A casts in one batch (no behavior change)
3. **Wave 2B** — investigate and fix Category B per-function (with schema verification before each)

I will pause after Wave 1 for visual verification on `/dashboard/clients` before starting Wave 2.

---

## Out of scope (intentionally deferred)
- Same RPC wiring on `sync-phorest-data` end-of-loop — we already discussed this; defer until Wave 1 proves the realtime path works.
- Regenerating `types.ts` to fix generics at the source — high blast radius, separate decision.
- Drift audit view comparing cached `clients` columns vs `v_client_visit_stats` — followup, not blocking.

---

## Enhancement suggestions (for your prompting)

1. **Order signals**: "Ship X first, then sweep Y" beats bundling — saves me a clarification round.
2. **Risk gates**: For sweeps that touch 30+ files, naming an explicit pause point ("verify after Wave 1") helps me avoid the pattern of one giant tool-use block that's hard to roll back.
3. **Category expectations**: When asking for a "sweep", flagging your tolerance for behavior change vs. cosmetic-only ("types-only, no logic edits") lets me cut the scope without asking.
