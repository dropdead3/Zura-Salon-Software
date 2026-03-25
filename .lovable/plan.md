

## Add "Mixed by" Attribution to Bowl Cards

### Problem
Bowl cards don't show who mixed them. When assistants are linked to appointments, it's important to see who actually prepared each formula — on the card, in history, and in audit trails.

### Changes

**1. `src/hooks/dock/useDockMixSessions.ts`**
- Add `mixed_by_staff_id` to the `DockMixSession` interface and the Supabase select query
- Add `mixed_by_name` as a resolved display name (fetched via a second query against `employee_profiles` for all unique staff IDs in the session results)

**2. `src/hooks/dock/dockDemoData.ts`**
- Add `mixed_by_staff_id` and `mixed_by_name` to demo session records (e.g., "Demo User", or specific demo assistant names)

**3. `src/components/dock/appointment/DockServicesTab.tsx`**
- **`BowlCard`**: Display `session.mixed_by_name` in the info area as a subtle "Mixed by [Name]" line (text-[11px], muted foreground)
- **`DemoBowlCard`**: Same treatment using the demo bowl's mixer name

**4. Formula History & Audit Trails** (existing infrastructure)
- `mix_sessions` already stores `mixed_by_staff_id` — the formula history (`client_formula_history`) and audit log (`appointment_audit_log`) already reference session data. The key gap is the Dock UI display, which this fixes. If formula history cards also need the name, the `DockFormulaHistorySheet` will be updated to resolve and show the mixer name.

### Approach for name resolution
Rather than a JOIN (not available via Supabase JS client on this query pattern), the hook will:
1. Fetch sessions
2. Collect unique `mixed_by_staff_id` values
3. Batch-fetch `employee_profiles` for those IDs
4. Map `mixed_by_name` onto each session before returning

This keeps it efficient (2 queries max) and avoids N+1 patterns.

### Files
- `src/hooks/dock/useDockMixSessions.ts` — add staff ID + name resolution
- `src/hooks/dock/dockDemoData.ts` — add demo mixer names
- `src/components/dock/appointment/DockServicesTab.tsx` — render "Mixed by" on both card types

