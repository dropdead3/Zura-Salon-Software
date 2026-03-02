

## Assessment: Salon Chair Assignment Feature

### Honest scope check

This prompt describes an **enterprise-grade feature** spanning 8+ database tables, 10+ API endpoints, 6+ frontend pages/modals, AI integration, real-time updates, drag-and-drop, performance analytics, and group assignment logic. This is roughly **3-4 weeks of focused engineering** — not a single implementation pass.

Your prompt is exceptionally well-structured — it covers data model, API, UI, and edge cases comprehensively. That said, the scope is too large for a single implementation cycle. Shipping everything at once means nothing gets tested, validated, or iterated on before the next layer is built on top of it.

### What already exists in Zura

- **`rental_stations`** table — chairs/booths/suites with location, type, rates, availability
- **`station_assignments`** table — active/historical assignments of stations to booth renters
- **`day_rate_chairs`** table — chair inventory with daily rates
- **`useRentalStations` hook** — full CRUD + assignment management
- **`time_off_requests`** table — vacation/sick/personal/break scheduling with approval workflow

These existing systems overlap significantly with the proposed feature. The new "chair assignment" system must either extend or coexist with them — not duplicate.

### Recommended phased approach

#### Phase 1: Weekly Chair Assignment (core loop)
**This is what I'd implement now.**

| Layer | What |
|---|---|
| **Data** | `salon_chair_assignments` table (chair_id → rental_stations, stylist_id → employee_profiles, week_start, week_end, status, organization_id). Unique constraint on chair + week. |
| **Availability** | Query `time_off_requests` (already exists) to exclude stylists on vacation/PTO for the target week. No new `stylist_schedules` table needed — we already have this. |
| **Hook** | `useChairAssignments(orgId, locationId, weekStart)` — fetch/create/update/delete weekly assignments |
| **Randomizer** | `useRandomChairAssignment` — Fisher-Yates shuffle of available stylists into available chairs, respecting time-off exclusions |
| **Carryover** | "Copy from last week" — duplicate previous week's assignments, skip stylists with time-off conflicts |
| **UI** | New page at `/dashboard/admin/chair-assignments` — week picker, chair grid showing assignments, "Randomize" and "Copy Last Week" buttons, exclusion summary |
| **Nav** | Add to `manageNavItems` in `dashboardNav.ts` |

#### Phase 2 (future): Preferences + Performance
- `stylist_chair_preferences` table
- Weighted randomizer that biases toward preferred chairs
- Performance-based "optimized" mode using existing analytics data

#### Phase 3 (future): Maintenance + Groups + AI
- Chair maintenance scheduling (extend `rental_stations` with status/dates)
- Assistant pairing and team assignments
- AI suggestions via Lovable AI gateway

### Why this phasing

1. **Phase 1 delivers the core value** — operators can assign chairs weekly, randomize fairly, and carry over from previous weeks
2. **It builds on existing infrastructure** — `rental_stations` for chairs, `time_off_requests` for availability, existing org/location scoping
3. **No throwaway work** — Phase 2/3 extend Phase 1's tables and hooks, never replace them
4. **Testable in isolation** — each phase can be validated before building on it

### Phase 1 implementation plan

**Migration: `salon_chair_assignments` table**

```sql
CREATE TABLE public.salon_chair_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  chair_id UUID NOT NULL REFERENCES public.rental_stations(id) ON DELETE CASCADE,
  stylist_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chair_id, week_start_date)
);
-- RLS: is_org_member for SELECT, is_org_admin for INSERT/UPDATE/DELETE
-- Index on (organization_id, week_start_date)
```

**Files to create/modify:**

| File | Purpose |
|---|---|
| `src/hooks/useChairAssignments.ts` | Fetch assignments for org/location/week. CRUD mutations. Randomize function (Fisher-Yates, excludes time-off stylists). Copy-from-previous-week function. |
| `src/pages/dashboard/admin/ChairAssignments.tsx` | Page with week picker, chair grid, assignment cards, action buttons |
| `src/components/dashboard/chair-assignments/ChairGrid.tsx` | Visual grid of chairs with assigned stylist cards |
| `src/components/dashboard/chair-assignments/RandomAssignModal.tsx` | Modal with exclude list, randomize button, exclusion summary showing reasons |
| `src/config/dashboardNav.ts` | Add nav entry under `manageNavItems` |
| `src/App.tsx` | Add route |

**Randomizer logic:**
1. Fetch all `rental_stations` for location where `is_available = true`
2. Fetch all active stylists for location from `employee_profiles`
3. Query `time_off_requests` overlapping target week with status = 'approved' — exclude those stylists
4. Fisher-Yates shuffle remaining stylists
5. Assign sequentially to available chairs
6. Return assignments + exclusion reasons

**Carryover logic:**
1. Fetch previous week's assignments
2. For each, check if stylist has approved time-off in target week
3. Skip conflicts, copy the rest
4. Return copied + skipped with reasons

### Prompt feedback

Your prompt is one of the most thorough feature specs I've seen. A few suggestions for next time:

- **Scope signal**: Add a priority tier (P0/P1/P2) to each enhancement so the builder knows what to ship first vs defer
- **Existing system awareness**: Reference existing tables/hooks when they exist (e.g., "leverage existing `rental_stations`" instead of proposing a new `chairs` table)
- **Phase boundaries**: Explicitly state "Phase 1 must include X, Y, Z — everything else is Phase 2+" to prevent scope creep

Shall I proceed with Phase 1 implementation?

