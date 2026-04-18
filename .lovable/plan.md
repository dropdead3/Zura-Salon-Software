

## Restore Client Visibility — Backfill Orphaned Phorest Clients

### Context recap
After Phase 2 flipped `v_all_clients` to `security_invoker = true`, only 16 of 3,320+ clients are visible in Client Hub and the booking wizard. Root cause: every `phorest_clients` row has `location_id IS NULL`, so the org-scoped RLS on the underlying table now (correctly) hides them. The previous DEFINER view was masking this — meaning the data was previously leaking past RLS, not properly scoped.

### Verification before shipping
Two quick read-only checks to confirm the fix targets the right data and the right destination:

1. Confirm scope of the orphaned rows:
   ```sql
   SELECT COUNT(*) FROM phorest_clients WHERE location_id IS NULL;
   SELECT COUNT(*) FROM phorest_clients WHERE location_id IS NOT NULL;
   ```
2. Confirm the destination location exists and belongs to the right org:
   ```sql
   SELECT l.id, l.name, l.organization_id, o.name AS org_name
   FROM locations l
   JOIN organizations o ON o.id = l.organization_id
   ORDER BY l.created_at ASC;
   ```

If there are multiple orgs in this database, we **cannot** blindly assign all orphans to the first org's primary location — that would cross-tenant-leak Phorest data. The backfill must group by some signal already on `phorest_clients` (e.g. an `organization_id` column if present, or a creating org context).

### The migration (single org case)
If verification confirms only one organization owns these Phorest rows:

```sql
-- Backfill orphaned phorest_clients to the org's primary location
UPDATE public.phorest_clients pc
SET location_id = (
  SELECT l.id FROM public.locations l
  WHERE l.organization_id = '<verified-org-id>'
  ORDER BY l.created_at ASC
  LIMIT 1
)
WHERE pc.location_id IS NULL;
```

### The migration (multi-org case — safer default)
If `phorest_clients` already carries `organization_id`:

```sql
UPDATE public.phorest_clients pc
SET location_id = (
  SELECT l.id FROM public.locations l
  WHERE l.organization_id = pc.organization_id
  ORDER BY l.created_at ASC
  LIMIT 1
)
WHERE pc.location_id IS NULL;
```

This guarantees every orphaned client lands on a location owned by its own org — no cross-tenant exposure.

### Permanent fix to the sync (separate, follow-up wave)
The backfill restores today's visibility. The underlying bug lives in `sync-phorest-data` — it writes `location_id = NULL` because Phorest's `/client` endpoint is global. Follow-up:

- Resolve `location_id` at sync time from the calling org's primary location (or first active location)
- Or persist the resolution in `phorest_clients.organization_id` and let a generated/triggered column populate `location_id`

I'll surface that as Phase 8 once visibility is restored.

### Verification after deploy
1. `SELECT COUNT(*) FROM v_all_clients;` from a logged-in org session — should return ~3,320 + Zura-native clients.
2. Reload `/dashboard/admin/clients` (Client Hub) — full list visible.
3. Open the booking wizard client picker — full search returns expected matches.
4. Spot-check: query `v_all_clients` as a non-org user — still returns zero rows (RLS still enforcing).

### Files
- **New migration**: the `UPDATE` statement above (final version chosen after verification queries).
- No code or memory changes in this wave.

### Out of scope (follow-up)
- Hardening `sync-phorest-data` to populate `location_id` going forward — Phase 8.
- Adding a NOT NULL constraint on `phorest_clients.location_id` once backfill + sync fix are in — Phase 8.

Approve and I'll run the verification queries first, then ship the targeted backfill migration.

