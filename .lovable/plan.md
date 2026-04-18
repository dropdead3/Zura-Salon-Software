

## Diagnosis

There are two timezone bugs and one date-comparison bug working together:

### Bug 1: `useTodayActualRevenue` uses **browser-local** today

`src/hooks/useTodayActualRevenue.tsx` line 27:
```ts
const today = format(new Date(), 'yyyy-MM-dd');
```

`format(new Date(), 'yyyy-MM-dd')` formats in the **browser's local timezone**. Then the query filters `transaction_date >= '${today}T00:00:00'` and `<= '${today}T23:59:59'` — these are sent as **naive timestamp strings**, and Supabase compares them against `transaction_date` (which is a `timestamptz` in the view). Postgres assumes the naive string is in UTC.

So just past midnight local time, depending on which side of midnight UTC you're on, the window can either:
- Resolve to a UTC window that excludes yesterday's late local-evening transactions (looks like $0)
- OR resolve to a UTC window for "today" that the org hasn't actually started yet (looks like $0)

### Bug 2: `useSalesByStylist` and `useRetailAttachmentRate` filter by `transaction_date` using a **date-only string**, but the column is `timestamptz`

`useSalesByStylist` (line 475):
```ts
if (dateFrom) q = q.gte('transaction_date', dateFrom);
if (dateTo) q = q.lte('transaction_date', dateTo);
```

When `dateFrom = dateTo = '2026-04-18'` (today), Postgres coerces the date string to `2026-04-18 00:00:00 UTC`. So `transaction_date >= '2026-04-18'` matches anything from UTC midnight forward — which on the US east coast means 8 PM yesterday onward. That's why **Top Staff and Attach Rate are showing yesterday's late-evening numbers** carried into "today."

Meanwhile `useTodayActualRevenue` uses an explicit `${today}T00:00:00` … `T23:59:59` window, which Postgres treats more strictly → returns $0 for the not-yet-started local day.

So:
- **Revenue Today card** → strict UTC-midnight window → $0 (correct-ish for "nothing has happened today yet")
- **Top Staff / Retail / Attach Rate** → loose UTC-midnight start with no upper bound clamp → leaks last evening's POS receipts

### Bug 3: The org's actual "today" isn't being computed

The codebase already has `src/lib/orgTime.ts` with `getOrgToday(timezone)` exactly for this — used by Schedule per the [Schedule Mechanics memory](mem://features/schedule/unified-mechanics-and-standards) — but the Sales surfaces use raw `format(new Date(), 'yyyy-MM-dd')`. That's the doctrine violation.

## Fix

Three coordinated changes, plus a tightening of the transaction_date comparison shape.

### A. Use org timezone for "today" everywhere on the Sales card

In `src/components/dashboard/AggregateSalesCard.tsx`:
1. Get the org timezone via `useOrgNow()` (existing hook) or `useLocationTimezone()`.
2. Replace every `format(new Date(), 'yyyy-MM-dd')` and `now = new Date()` in the `dateFilters` switch with `getOrgToday(orgTz)` and an org-anchored `now` Date built from org parts (matches `getOrgTodayDate`).
3. Replace `subDays(now, 1)` for `'yesterday'` with org-relative subtract on the org-today anchor.

### B. Fix `useTodayActualRevenue` to accept org timezone and build a proper org-day window

In `src/hooks/useTodayActualRevenue.tsx`:
1. Accept `timezone` (or read from `useOrgNow`).
2. Compute `today = getOrgToday(timezone)`.
3. Build the window as an explicit ISO range that converts the org-local midnight boundaries into UTC instants:
   - `startUtc = zonedTimeToUtc(\`${today}T00:00:00\`, timezone).toISOString()`
   - `endUtc = zonedTimeToUtc(\`${today}T23:59:59.999\`, timezone).toISOString()`
4. Use `gte/lte` on those UTC instants. This gives a real "org local day" window regardless of UTC offset.

(`date-fns-tz` is already used elsewhere in the codebase — verify in `package.json` before relying on it; if absent, derive offset manually using `Intl.DateTimeFormat` like `orgTime.ts` already does and produce the UTC ISO bounds inline.)

### C. Fix `useSalesByStylist`, `useRetailAttachmentRate`, `useSalesMetrics` (and friends) to clamp `transaction_date` correctly

These hooks receive `dateFrom`/`dateTo` as `YYYY-MM-DD`. When the column is `timestamptz`, comparing against a date-only string opens the window to yesterday-evening UTC drift.

Two acceptable fixes:
- **Preferred**: also accept the org timezone and convert `dateFrom`/`dateTo` to UTC instants (`${dateFrom}T00:00:00` → `${dateTo}T23:59:59.999` in org tz, then `.toISOString()`), and use those for `.gte('transaction_date', startUtc)` / `.lte('transaction_date', endUtc)`.
- **Minimum**: at least append `T00:00:00` and `T23:59:59.999` and pass through `zonedTimeToUtc`. Without timezone awareness, the leak persists.

The org timezone needs to be threaded through these three hooks (or pulled from a context inside them). Cleanest: a tiny helper `toOrgDayBounds(dateFrom, dateTo, tz) → { startUtc, endUtc }` in `src/lib/orgTime.ts` that all sales hooks use.

### D. Verify

After fix:
- Just past local midnight: Revenue Today, Top Staff, Retail, Attach Rate all read **$0** (since the org day hasn't produced sales yet).
- During the day: all four agree on the same window.
- "Yesterday" filter: returns yesterday's full org-local day on all surfaces.

## Out of scope
- Timezone fixes elsewhere in the dashboard (Operations/Marketing tabs) — separate audit
- Refactoring `useSalesData` away from `transaction_date`/`appointment_date` mixing
- Changing the underlying view definitions

## Files
- **Modify**: `src/lib/orgTime.ts` — add `toOrgDayBounds(dateFrom, dateTo, tz)` helper returning UTC ISO `{ startUtc, endUtc }`.
- **Modify**: `src/hooks/useTodayActualRevenue.tsx` — accept org tz; compute `today` via `getOrgToday`; convert the day window to UTC instants for all 4 internal queries.
- **Modify**: `src/hooks/useSalesData.ts` — `useSalesMetrics`, `useSalesByStylist`, `useSalesByLocation`, `useSalesTrend` clamp `transaction_date` filters using `toOrgDayBounds`. Keep `appointment_date` filters as-is (those are date columns, not timestamptz).
- **Modify**: `src/hooks/useRetailAttachmentRate.ts` — same clamp for `transaction_date`.
- **Modify**: `src/components/dashboard/AggregateSalesCard.tsx` — use `getOrgToday(orgTz)` everywhere `format(new Date(), 'yyyy-MM-dd')` is used inside `dateFilters` + `rangeIncludesToday` checks; thread `orgTz` to `useTodayActualRevenue`.
- **Verify**: `package.json` — confirm `date-fns-tz` is available (used for `zonedTimeToUtc`); if not, derive UTC offset inline in `orgTime.ts` to avoid a new dependency.

