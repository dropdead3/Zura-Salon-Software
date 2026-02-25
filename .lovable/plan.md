

## Post-Migration Audit: Data Gaps and Issues

### Migration Status: Complete with Known Gaps

| Domain | Total | Migrated | Status |
|---|---|---|---|
| Clients | 3,091 | 2,586 inserted + 481 backfilled | Done |
| Services | 76 | 8 inserted | Done |
| Appointments | 585 | 458 inserted | Done |
| Transactions | 772 | 772 inserted | Done |
| Daily Sales | 173 | 173 inserted | Done |

---

### Gap 1: Staff Attribution (Expected -- Option B)

- **451 of 458** migrated appointments have `staff_user_id = NULL`
- **All 772** transactions have `staff_user_id = NULL`
- **All 173** daily sales have `staff_user_id = NULL`
- **21 unmapped** Phorest staff IDs vs only **2 mapped**

This was the accepted tradeoff of Option B. To resolve: map the 19 remaining Phorest staff members in `phorest_staff_mapping`, then run a backfill query to populate `staff_user_id` on native records using `phorest_staff_id`.

---

### Gap 2: 197 Appointments with NULL client_id

These appointments have `external_id` (Phorest ID) but their `phorest_client_id` didn't resolve to a native client. Likely caused by the 101 orphaned Phorest clients that weren't migrated (all 101 have email/phone, so they should have matched -- possible edge case in the dedup logic, such as slightly different normalization).

**Fix:** Re-examine the 101 orphaned Phorest clients, insert them into native `clients`, then backfill `client_id` on the 197 appointments.

---

### Gap 3: 101 Orphaned Phorest Clients

101 Phorest clients exist in `phorest_clients` but have no matching record in native `clients` (no `phorest_client_id` link). All 101 have email (86) and/or phone (98). These likely failed the dedup match due to normalization differences or were genuinely new clients that the migration's INSERT batch missed.

**Fix:** Run a targeted insert for these 101 records into native `clients`.

---

### Gap 4 (Critical): Frontend Still Reads from phorest_* Tables

**117 files** across the frontend still query `phorest_appointments`, `phorest_transaction_items`, `phorest_daily_sales_summary`, `phorest_clients`, etc. directly. The migration copied data into native tables, but **no analytics surface, dashboard hook, or UI component has been updated to read from native tables yet**.

This means:
- The migrated data in native tables is currently **unused by the frontend**
- Both data sources (phorest_* and native) will drift apart over time if ongoing syncs write to phorest_* while manual operations write to native tables
- The migration was a prerequisite for switching over, not the switch itself

This is the largest remaining effort. Switching 117 files is a significant refactor that should be planned carefully -- likely as a phased cutover rather than a big-bang rewrite.

---

### Gap 5: 116 Transactions with NULL client_id and NULL client_name

These are transactions where neither the Phorest client ID resolved to a native client nor was there a `client_name` stored. These are likely walk-in or anonymous transactions -- acceptable as-is.

---

### Priority Ranking

| Priority | Issue | Effort | Impact |
|---|---|---|---|
| P0 | Frontend still reads phorest_* tables (Gap 4) | Large (117 files) | Migrated data is unused until this is done |
| P1 | 101 orphaned clients not migrated (Gap 3) | Small (one query) | 197 appointments missing client attribution |
| P2 | 19 unmapped staff (Gap 1) | Medium (requires staff identification) | 98.8% of records lack staff attribution |
| P3 | 116 transactions with no client (Gap 5) | None | Expected for walk-ins |

### Recommendation

Gap 4 is the elephant in the room. The migration moved data into the right tables, but the entire frontend still reads from the old Phorest tables. Before tackling the frontend cutover (which is a large effort), the immediate low-hanging fruit is:

1. Fix the 101 orphaned clients (Gap 3) -- small targeted query
2. Backfill client_id on the 197 appointments once those clients exist
3. Then plan the frontend cutover as a separate phase

The staff mapping (Gap 1) depends on you identifying who the 19 Phorest staff members are and whether they should get employee profiles in Zura.

