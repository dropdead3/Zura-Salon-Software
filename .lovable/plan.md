
## Policy OS Audit — Gaps, Bugs & Improvements (Waves 28.1–28.10)

Read-only review of schema, hooks, edge function, RLS, and UI surfaces. Findings prioritized by severity with doctrine anchors.

---

### P0 — Bugs that break correctness or security

**1. Public Policy Center can never display anything (RLS blocker)** [doctrine: visibility contract, tenant isolation]
- The 28.8 RLS migration grants public SELECT on `policies` only when `audience IN ('external','both')` and `status IN (...)`. Looks fine — *but* the migration order matters: the existing `policies` table already has org-scoped RLS. The new policies are **additive (OR)**, so anon can read. ✅ This is correct, but...
- `usePublicOrgPolicies` filters by `organization_id` client-side, yet RLS does **not** require `organization_id` matches the slug. An anon user could query *any* org's published policies by guessing UUIDs. Low risk (data is by definition public), but org ownership isn't validated server-side. **Action:** acceptable as-is — document this, since policies are intentionally public per wave intent.

**2. `record-policy-acknowledgment` insert will fail at runtime** [doctrine: tenant isolation, build-gate]
- The RLS policy on `policy_acknowledgments` for INSERT is: `(auth.uid() = user_id) AND is_org_member(...)`. The edge function uses **service role** which bypasses RLS — ✅ insert works.
- BUT the table requires `surface NOT NULL` (USER-DEFINED enum `policy_surface`), and the function passes `surface: "client_policy_center"` as a *string*. If `'client_policy_center'` is not in the `policy_surface` enum, **every insert throws**. Need to verify the enum contains this value (likely missing — it was added as a literal in code without a migration).
- **Action:** confirm enum value or add migration; otherwise pick a valid existing enum value (e.g. fall back to one already used in 28.5 candidate_surfaces).

**3. Operator-side `useClientAcknowledgments` query likely returns empty** [doctrine: data integrity]
- Hook uses `.ilike('client_email', email)` — but `email` is already lowercased and the column has no functional uppercase index. Works, but the migration adds `idx_policy_ack_email_lower ON (lower(client_email))` — `ilike` won't use that index. Should use `.eq('client_email', email)` since insert lowercases on write. Minor perf, but consistent.

**4. `requires_acknowledgment` flag toggle has no permission check** [doctrine: governance, security]
- `useUpdatePolicyAcknowledgmentFlag` does a raw `.update()` from the client. RLS on `policies` UPDATE will gate it, but worth verifying the existing UPDATE policy uses `is_org_admin` not `is_org_member`. If `is_org_member`, any staff can flip the flag. **Action:** verify and tighten if needed.

---

### P1 — Functional gaps vs. plan

**5. No rate limiting on public ack endpoint** (plan called for "Rate-limited per IP")
- Plan step 2 explicitly required rate limiting; not implemented. An attacker can spam fake acks.
- **Action:** add lightweight in-memory or DB-backed throttle (e.g. max 20 acks per IP per hour).

**6. No de-duplication on insert**
- Table has no unique constraint on `(policy_version_id, lower(client_email))`. A single client clicking Acknowledge twice creates two rows. Operator panel will show duplicates.
- **Action:** add partial unique index `(policy_id, policy_version_id, lower(client_email))`, edge function should `ON CONFLICT DO NOTHING` and return the existing row.

**7. Public surface bypasses server-side ack lookup**
- `ClientPolicyCenter` reads acked-state from `localStorage` only. Clearing browser storage = banner reappears even though the row exists in DB. The `useClientAcknowledgments` hook exists but is never used on the public page (it's gated to org members anyway).
- **Action:** either (a) accept localStorage-only as the documented behavior (current state — fine for Phase 2), or (b) add a public RPC `has_acknowledged(policy_id, email)` that returns boolean for the email-based lookup without exposing other rows.

**8. Optimistic UI doesn't block double-submit during in-flight network**
- In `PolicyCenterCard.handleSubmit`, after click the button shows loader, but if user clicks again rapidly before `record.isPending` flips, two requests fire. `record.isPending` guards in `disabled`, but there's a microtask gap. Minor.

---

### P2 — UX & polish

**9. Acknowledgment footer fires identity modal *after* form submit attempt**
- Flow: user types signature → checks box → clicks Acknowledge → modal opens asking for name/email → on confirm, signature gets overwritten by modal name. Confusing because they already typed a signature.
- **Action:** open identity modal *first* on initial card expansion if `requires_acknowledgment && !identity`, or make modal-name optional (use signature as name when modal name is blank).

**10. Acknowledgments tab disappears when toggle is off, but operator may still want to view historical acks** (audit doctrine)
- Current code: `{!!(data as any)?.requiresAcknowledgment && <TabsTrigger value="acknowledgments">}`. If operator turns off the flag, the tab vanishes — acks are still in the DB but invisible to them. Violates audit immutability principle.
- **Action:** show tab whenever `policyId` exists (always render); empty-state if no acks.

**11. CSV export missing signature_text and policy_version_id**
- For legal/audit defense, `signature_text` (what they typed) and `policy_version_id` (which version they signed) are the two most important fields. Panel exports the former but not the latter.
- **Action:** add Version column to CSV.

**12. `as any` casts mask type-drift**
- `(data as any).requiresAcknowledgment`, `(supabase as any).from('policy_acknowledgments')` — types are out of sync. The auto-generated `types.ts` should now include `policy_acknowledgments` columns and `requires_acknowledgment`. Casts hide real type errors.
- **Action:** remove casts; if types are stale, regen.

**13. Conflict Center lacks "soft-disable undo" and audit log entry**
- `useResolvePolicyConflict` flips `enabled=false` with no audit row. Plan mentioned "with audit trail" — not delivered. Hard to know who disabled what.
- **Action:** insert a `policy_change_log` row (or whatever audit table exists) with actor + before/after.

**14. Diff renderer doesn't handle large bodies gracefully**
- `VersionDiffView` LCS is O(n*m) memory; comment says "fine for <500 lines" but no guard. A maliciously long policy body could lock the tab.
- **Action:** cap lines at e.g. 2000 with a "Body too large to diff inline — view raw" fallback.

**15. Public Policy Center has no print stylesheet / "Save PDF" affordance**
- Common client request: "send me a PDF of your policies". Currently they'd print the page with sidebar artifacts.
- **Action:** add `@media print` rules that hide the banner, expand all collapsibles, and use serif body. Optional Phase 3.

---

### P3 — Architecture observations

**16. `evidence` JSONB duplicates structured columns**
- Edge function writes `evidence: { source, method, signature_text }` AND the dedicated `signature_text`/`acknowledgment_method` columns. Two sources of truth.
- **Action:** pick one (recommend dropping `evidence` for new acks; keep column for legacy).

**17. No FK from `policy_acknowledgments` to `policies` / `policy_versions`**
- Migration adds columns but no FOREIGN KEY constraints. Orphaned acks possible if a policy is hard-deleted. Soft deletes only — but worth defending.
- **Action:** add `FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE RESTRICT`.

**18. Public Policy Center route is `/org/:orgSlug/policies` but plan said `/book/:orgSlug/policies`**
- Doc drift only — code uses `/org/...` which is correct (matches all other public routes). Update plan reference for consistency.

**19. No realtime invalidation on operator panel**
- When clients ack, operator panel doesn't update unless they re-open the tab. For a "live signing event" demo, would be nice.
- **Action:** subscribe to `policy_acknowledgments` channel filtered by `policy_id`. Phase 3.

---

### Recommended fix wave: 28.10.1 — Policy Acknowledgment Hardening

Bundle the **P0 + P1** items into a single small wave:
1. Verify/add `client_policy_center` to `policy_surface` enum (or use existing value)
2. Add unique index `(policy_id, lower(client_email))` + `ON CONFLICT` handling
3. Add IP-based rate limiting to edge function
4. Audit log entry on conflict resolve
5. Always-render Acknowledgments tab + add Version column to CSV
6. Fix identity-modal flow (capture identity *before* signature input)
7. Remove `as any` casts; regenerate types if stale
8. Verify `policies` UPDATE RLS uses `is_org_admin`

Estimated scope: ~2–3 hours, single migration + 4 file edits.

### Out of scope (defer)
- Print stylesheet (P2), realtime ack feed (P3), public RPC for server-side ack lookup (P1 alt) — all valid Phase 3 candidates.
