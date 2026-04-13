

# Offline Payments & S710 Terminal — Audit Report

## Findings: 3 Bugs, 2 Security Gaps, 7 Enhancements

---

## Bugs

### B1. `REASON_LABELS` on platform side missing `upgrade_to_s710`
**File:** `TerminalRequestsTable.tsx:32-37`
The org-side form includes `upgrade_to_s710` as a reason option, but the platform admin `REASON_LABELS` map omits it. Requests with that reason render the raw string `upgrade_to_s710` instead of a human label.

### B2. `markForwarded` sets `isForwarding` synchronously — never actually true in render
**File:** `useOfflinePaymentQueue.ts:76-87`
`setIsForwarding(true)` is called, then `setIsForwarding(false)` in the same synchronous block. React batches these — `isForwarding` is never `true` during a render cycle. Any UI relying on this flag (e.g., a spinner) will never show.

### B3. `OfflinePaymentStatus` shows `$` prefix but `pendingTotal` is in raw amount units — ambiguous currency
**File:** `OfflinePaymentStatus.tsx:80`
The display assumes USD (`$`) and divides by 100 (cents). But `useOfflinePaymentQueue` stores `amount` as whatever the caller passes — there's no currency enforcement. If amounts are already in dollars, the division produces wrong values. The `currency` field on `OfflinePayment` is never used in display.

---

## Security Gaps

### S1. Edge function `update_request` allows arbitrary status transitions
**File:** `manage-terminal-requests/index.ts:189-233`
A platform admin can set any status in any order (e.g., jump from `pending` directly to `delivered`, or revert `denied` to `pending`). There's no state machine enforcing valid transitions like `pending → approved → shipped → delivered`.

### S2. Edge function doesn't validate `location_id` belongs to the `organization_id`
**File:** `manage-terminal-requests/index.ts:41-108`
The `create_request` action accepts any `location_id` without confirming it belongs to the specified `organization_id`. A user with admin access to Org A could submit a request referencing a location in Org B.

---

## Enhancements

### E1. Add `device_type` column to platform admin table
The edge function stores `device_type: 's710'` on every request, but neither the platform table nor the manage dialog surfaces it. Useful for future-proofing if other hardware becomes available.

### E2. Show requester name on platform side
The `TerminalHardwareRequest` interface has `requester_name` but it's never populated by the edge function. Platform admins see `requested_by` (a UUID) with no way to know who submitted the request.

### E3. Marketing section hardcodes light-on-dark colors
**File:** `NeverDownPayments.tsx`
Text uses `text-white/90`, `text-slate-400`, `text-slate-500` — these don't adapt to light mode. The PlatformLanding page may be viewed in both themes. Should use theme-aware classes (`text-foreground`, `text-muted-foreground`) or confirm this section is dark-only with an explicit dark background.

### E4. Service Worker caches `/dashboard` shell but Vite SPA doesn't serve static HTML at that path
**File:** `sw.js:9`
`PRECACHE_ASSETS` includes `/dashboard` which will fail during `cache.addAll()` in dev (404). The SPA serves everything from `/index.html`. Should precache `/index.html` and use it as the navigation fallback.

### E5. No org-side notification when request status changes
When a platform admin approves, ships, or denies a request, the org side only discovers the change by polling the query (30s stale time). Consider enabling realtime on `terminal_hardware_requests` so org users see status updates live.

### E6. `useOfflineStatus` recreates the event handler on every `offlineSince` change
**File:** `useOfflineStatus.ts:97`
The `useEffect` that attaches `online`/`offline` listeners has `[offlineSince]` in its dependency array. Every time `offlineSince` changes, listeners are removed and re-added. This is a minor perf issue — the closure can capture `offlineSince` via a ref instead.

### E7. Offline event timeline has no "clear history" action
The `OfflinePaymentStatus` component shows the last 5 events but provides no way to clear old events. Over time, localStorage accumulates up to 50 entries with no user-facing management.

---

## Plan

| # | Fix | File(s) |
|---|---|---|
| B1 | Add `upgrade_to_s710: 'Upgrade to S710'` to `REASON_LABELS` | `TerminalRequestsTable.tsx` |
| B2 | Make `markForwarded` async or use a `setTimeout(0)` to let the `isForwarding=true` state render | `useOfflinePaymentQueue.ts` |
| B3 | Use the stored `currency` field in display and default to cents convention with a comment | `OfflinePaymentStatus.tsx` |
| S1 | Add valid transition map in edge function: `pending→approved/denied`, `approved→shipped`, `shipped→delivered` | `manage-terminal-requests/index.ts` |
| S2 | Validate `location_id` belongs to `organization_id` before insert | `manage-terminal-requests/index.ts` |
| E1 | Add Device column to platform table showing `device_type` | `TerminalRequestsTable.tsx` |
| E2 | Join `profiles.display_name` in `list_all_requests` and surface in table | `manage-terminal-requests/index.ts`, `TerminalRequestsTable.tsx` |
| E3 | Wrap NeverDownPayments section in explicit dark bg container and keep hardcoded colors, or convert to theme tokens | `NeverDownPayments.tsx` |
| E4 | Replace `/dashboard` with `/index.html` in precache and add navigation fallback to `index.html` | `sw.js` |
| E5 | Enable realtime on `terminal_hardware_requests` for org-side live status updates | Migration + `useTerminalRequests.ts` |
| E6 | Use a ref for `offlineSince` to stabilize the listener effect | `useOfflineStatus.ts` |
| E7 | Add "Clear history" button to offline event timeline | `OfflinePaymentStatus.tsx` |

8 files modified. 1 migration (realtime publication). No new dependencies.

