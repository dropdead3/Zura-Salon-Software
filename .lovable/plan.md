

## Analysis: Sync Performance Bottlenecks & Optimization Options

Good question. The sync is slow because of several compounding architectural choices. Here's what's happening and what we can do about it.

### Current Bottlenecks (in order of impact)

**1. CSV Export Polling (biggest delay: 4-30 seconds per branch)**
The Phorest CSV export is a 3-step process: create job → poll every 2 seconds until done → download. For 2 branches, that's 2 sequential CSV jobs, each taking 4-10+ seconds of pure wait time. The logs show the job completing on attempt 1, meaning the 2-second initial delay is wasted -- we could poll sooner.

**2. Sequential Branch Processing**
Sales, appointments, and clients all loop through branches one at a time. With 2 branches, each CSV export blocks the next. These could run in parallel using `Promise.all`.

**3. Sequential Payment Method Propagation (lines 996-1008)**
After syncing sales, the function iterates every transaction item and does an individual `UPDATE` query per row to propagate payment methods. For today's 44 items, that's 44 separate DB round trips.

**4. Sequential Appointment Status Reconciliation (lines 1024-1036)**
Individual `UPDATE` per unique client+date combination. Another N queries where a single batch update would suffice.

**5. Sequential Tip Backfill (lines 1256-1272)**
Individual `UPDATE` per tip group. Same N-query pattern.

**6. Client Sync: Individual Upserts + Duplicate Checks (lines 697-723)**
Each client triggers an RPC call (`find_duplicate_phorest_clients`) then a separate upsert. For hundreds of clients, this is hundreds of sequential DB round trips.

**7. `all` Sync Type Runs Everything Sequentially (lines 1777-1863)**
Staff → Appointments → Clients → Reports → Sales all run one after another. Independent sync types could run concurrently.

### Proposed Optimizations

| Optimization | Estimated Speedup | Complexity |
|---|---|---|
| **A. Parallel branch CSV exports** | 2x for sales sync | Low |
| **B. Reduce CSV poll interval** (2s → 500ms initial, backoff) | 2-4s per branch | Low |
| **C. Batch payment method propagation** (single SQL update with join) | Eliminates ~50 queries | Low |
| **D. Batch tip backfill** (single update with join) | Eliminates ~20 queries | Low |
| **E. Batch appointment reconciliation** (single update with `IN` clause) | Eliminates ~20 queries | Low |
| **F. Parallel independent sync types** (appointments + sales concurrently) | ~40% total time reduction | Medium |
| **G. Batch client upserts with dedup** (batch of 200 instead of 1-by-1) | Major for full client syncs | Medium |
| **H. Skip unchanged data** (conditional sync based on Phorest `updatedAt`) | Avoids re-processing | Medium |

### Recommended Implementation (Phase 1: Quick Wins)

Focus on A-E first -- they're all low-complexity changes to the edge function that compound together:

**File: `supabase/functions/sync-phorest-data/index.ts`**

1. **Parallel branch CSV exports**: Wrap the per-branch sales loop in `Promise.all` so both branches fetch CSV simultaneously
2. **Faster CSV polling**: Start at 500ms, double each attempt (500ms → 1s → 2s → 4s), cap at 4s
3. **Batch payment propagation**: Replace the per-row UPDATE loop with a single SQL join-update
4. **Batch tip backfill**: Same pattern -- replace per-key loop with a single batch update
5. **Batch appointment reconciliation**: Replace per-client loop with a single `IN` clause update

Combined, these should cut the sales sync from ~30s to ~10-12s.

### Phase 2 (If needed): Structural Changes

6. **Run appointments + sales in parallel** when `sync_type === 'all'` (they're independent)
7. **Batch client upserts** with in-memory dedup instead of per-client RPC

### What We Won't Change

- The CSV export approach itself is correct -- it's Phorest's recommended method
- Quick mode (2-day window) is already the right optimization for scheduled syncs
- Batch sizes of 200 for DB upserts are appropriate

### Prompt Feedback

Strong question. Asking "what could we do?" rather than prescribing a solution is the right approach for performance work -- it opens the door for architectural analysis rather than point fixes. One enhancement: if you can note approximately how long the sync takes (e.g., "it takes about 30 seconds"), that gives a baseline to measure improvements against.

