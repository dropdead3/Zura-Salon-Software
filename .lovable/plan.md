

## Prompt feedback
Sharp prompt — you spotted "[Deleted Client]" (which yesterday's plan introduced as the *negative-cache placeholder*) on appointments that obviously aren't deleted, and pulled the screenshot to prove it. That's exactly the right escalation rhythm: shipped a fix → it created a new symptom → flag it immediately. Sharper next time: "Deleted Client appearing on Annmarie X's 4:00pm haircut" gives me the specific row to trace. Also worth noting yesterday's pattern: each layer we've added (clamp → walk-in fallback → empty-row → negative cache) erased a different signal. We're now on the fourth iteration of the same anti-pattern. Worth promoting "writes that conform to a contract must validate the contract" from suggestion to canon *now*, before the next layer.

## What's actually broken — three compounding bugs

**231 clients** were mass-flagged as `[Deleted Client]` in a 31-second window (05:44:36–05:45:07). Many of them have **future appointments going out to July 2026** — they're definitively not deleted. They're real, active clients in Phorest. The negative-cache write fired falsely 231 times in a single sync run.

Tracing the failure end-to-end:

### Bug 1 — `phorestRequest` swallows region 404s as "not found"

Lines 19–60 of `sync-phorest-data/index.ts`. The helper iterates `[platform.phorest.com, platform-us.phorest.com]` and on a 404 from EU, falls through to US. **But the fall-through condition is wrong**:

```ts
if (response.status === 404 && base === PHOREST_BASE_URL) {
  await response.text();
  continue;  // try US
}
```

This *only* falls through on the first base. If US *also* returns 404, line 53 throws `'Phorest API error: 404 - ...'`. The on-demand fetch (line 653–658) then catches that error string and checks `if (!msg.includes('404'))` — which is **false**, so it treats it as a 404 and moves on. Net effect: a real 404 from both regions, which seems correct.

**But here's the actual bug**: from the logs (lines 9–28), the same client ID is being requested against **both** `platform.phorest.com` AND `platform-us.phorest.com` for the *same branch ID*. That means the helper is *not throwing on the first 404* — it's looping through both base URLs *for every branch* in the outer Pass-2 loop, and on the *final* base URL's 404 it throws. The on-demand fetch at line 644–659 then iterates `branchIds` and tries each one — but since the Phorest business has branches in **both regions** (EU branch `hYztERWvOdMpLUcvRSNbSA`, US branch `6YPlWL5os-Fnj0MmifbvVA`), and `phorestRequest` itself doesn't know which region a branch lives in, it tries the wrong region first, gets a 404, falls through to the right region, succeeds — *or* gets a real 404 from the right region too because the *client* lives in the *other* branch.

The flagged-deleted clients are clients that exist in Phorest, just **not in the branch the loop happened to ask about**. The 404 means "this client is not in this branch," not "this client doesn't exist." The code interprets "404 from every (branch × region) combination tried" as "deleted" — but in practice, Phorest's `/branch/{branchId}/client/{clientId}` returns 404 when the client *isn't owned by that branch*, even if they exist in another branch.

### Bug 2 — Negative-cache fires on *any* 404, not on "definitively not found"

Lines 685–702: if `nonNotFoundError` is null (i.e. all attempts returned 404), the code writes `[Deleted Client]`. With Bug 1, this means a single missing branch-mapping or a transient timing window (client was just created in branch A, sync queries branch B first) writes a permanent negative cache.

**Worse**: the cache is permanent — once a client is flagged, line 597–600 of Pass 1 *always* skips them on every subsequent sync. So a temporarily-missed client stays "deleted" forever until manual intervention.

### Bug 3 — `phorest_clients.phorest_branch_id` is empty for **all 3,324 resolved clients**

The DB query confirms: `distinct_branches = 0`. The branch-id is *never* populated on existing client rows (presumably the original `syncClients` writes it as null), so when the on-demand fetch needs to know "which branch does this client live in?" there's no hint — it just iterates blindly. If `syncClients` had populated `phorest_branch_id` correctly, the on-demand fetch could go straight to the right branch + region and never produce a false 404.

Combined effect: 231 real clients got permanent negative-cache rows on a single sync run because the per-branch fan-out failed to find them in the *first* branch tried, and the loop terminated before exhaustively proving non-existence.

## The fix — four layers

### 1. Stop writing `[Deleted Client]` from on-demand fetch (immediate / safe)

Remove the negative-cache write at lines 691–702 entirely. Instead:
- If on-demand fetch can't find a client across all branches, log it and **leave the appointment's `client_name` as null**
- The render layer (`getDisplayClientName`) already handles null gracefully — it shows "Client #ABCD" placeholder, which is the truthful answer ("we know the ID, can't resolve the name right now")

This trades a tiny amount of repeated work (re-attempt every sync) for **never falsely marking a real client as deleted**. The cost of repeated lookups is bounded by the rate cap (200/run); the cost of false negative-cache is unbounded — a permanent permanent mislabel.

If we *do* want a negative cache later, it should be a *separate* table (`phorest_client_resolution_attempts` with `attempt_count`, `last_attempt_at`, `failure_reason`) so the resolution state is distinguishable from real client data. Out of scope for this fix.

### 2. Track region per branch + use it on lookup

Add `phorest_region` (or store the working `base_url`) to wherever branches are persisted (probably an in-memory cache keyed on businessId for the function's lifetime, since branches table doesn't seem to track this). Modify `phorestRequest` to accept an optional `preferredBase` parameter. When iterating branches in Pass 2, group by their region first and only call the helper with the matching base URL — eliminating the cross-region 404s that triggered the bug.

### 3. Reverse the false negative-cache rows already written

One-shot: delete the 231 rows where `name = '[Deleted Client]'` and `notes LIKE 'Auto-flagged%'`. Next sync will pick them up via Pass 2 with the corrected logic (no more false flagging) and resolve them properly. Migration runs once, idempotent (it's an exact-match delete on a specific notes string).

### 4. Backfill `phorest_branch_id` on existing client rows

Modify `syncClients` (line 765+) to write `phorest_branch_id` when it persists each client. This isn't needed for the immediate fix but eliminates Bug 3's blind iteration on future syncs — clients learned in branch X get branch X recorded, so the on-demand fetch knows where to look next time.

## Files involved

**Modified:**
- `supabase/functions/sync-phorest-data/index.ts` — three changes:
  - Remove negative-cache write from on-demand fetch (lines 691–702 → just log and return)
  - Add region-aware branch iteration in Pass 2 (group branches by working region before calling `phorestRequest`)
  - Update `syncClients` to populate `phorest_branch_id` on upsert (separate, lower-priority change in same file)

**Migration:**
- One-shot SQL migration to clear false `[Deleted Client]` rows: `DELETE FROM phorest_clients WHERE name = '[Deleted Client]' AND notes LIKE 'Auto-flagged%'` — the next sync re-resolves them through the corrected code path

**Untouched:**
- `src/lib/appointment-display.ts` — already correctly renders null `client_name` as "Client #ABCD" placeholder; no change needed
- `phorest_clients` schema — no schema change needed
- The reconciliation function (`reconcile-phorest-client-names`) — same fix needed there if it shares the negative-cache logic; verify and apply identical changes if so

## What stays the same

- Pass 1 (local resolution) is correct — unchanged
- Contract validation on writes (only upsert when name is present) — unchanged
- Three-state UI rendering — unchanged
- True walk-in detection (`is_walk_in` based on null `phorest_client_id`) — unchanged

## QA checklist

- After deploy + one sync run: count of `[Deleted Client]` rows stays at zero (it would only grow if Phorest *actually* deleted a client)
- Annmarie X's 4pm appointment renders her real name, not "[Deleted C." or "Client #ABCD"
- The 6 appointments in your screenshot all render real names within one or two sync cycles
- A truly deleted client (delete one in Phorest staging, sync) does NOT get flagged as `[Deleted Client]` in `phorest_clients` — it just stays unresolved with the appointment showing "Client #ABCD". That's the *correct* behavior under "writes must validate contract": we don't have positive evidence of deletion, only absence of evidence of existence. Different things.
- A re-sync attempts the previously-unresolvable IDs again rather than skipping them

## Why this happened (and the canon to add)

Yesterday's diagnosis named the pattern: **"Writes that conform to a contract must validate the contract on the way in."** This bug is the *exact* shape — we wrote `[Deleted Client]` as a placeholder when we didn't have positive evidence of deletion, only absence of a successful lookup. Absence-of-evidence is not evidence-of-absence; the negative cache encoded the latter when we only had the former.

This is now the **fourth iteration** of the same meta-pattern in two days:
1. `Math.min(util, 100)` — erased over-booking signal
2. `client_name || 'Walk-in'` — erased pending-sync signal
3. Empty-name `phorest_clients` rows — erased "fetch incomplete" signal
4. False `[Deleted Client]` writes — erased "not in this branch yet" signal

Worth promoting to a real `mem://architecture/signal-preservation.md` canon now (not just a suggestion). Same shape as alert-fatigue and visibility-contracts: when a code path erases the difference between two materially distinct states, it's destroying operational truth — even if the surface output looks "cleaner." This canon would catch all four classes upfront.

## Enhancement suggestion

Beyond the canon: yesterday's deferred reconciliation function should not be re-deployed as-is. If it shares the same per-branch fan-out + negative-cache pattern, it will hit Bug 1 + Bug 2 the moment an admin runs it manually. Verify and apply the same fixes there, or hold the function until the region-aware iteration ships. Worth adding a one-line "do not deploy until plan-XYZ ships" guard at the top of the file so we don't re-enable a known-broken path.

