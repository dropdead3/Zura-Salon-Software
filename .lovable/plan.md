

## Demo Mode — Remaining Gaps and Enhancements

### Gap 1: `useDockCompleteAppointment` Has No Demo Guard

**Problem:** When a stylist swipes "Finish Appt" on a demo appointment (IDs like `demo-appt-1`), the mutation calls the `update-phorest-appointment` edge function with a fake appointment ID. This will fail with an error toast ("Failed to complete").

**Fix:** `src/hooks/dock/useDockCompleteAppointment.ts` — check if `appointmentId` starts with `demo-` and short-circuit with a success toast ("Demo: Appointment completed") without hitting the edge function or database.

### Gap 2: Product Catalog Doesn't Leverage `usesRealData`

**Problem:** `useDockProductCatalog.ts` checks `isDemoMode` but not `usesRealData`. When entering demo mode with a real org (`?demo=<orgId>`), it returns the static demo products (Wella, Redken, Schwarzkopf) instead of the org's actual supply library. This breaks the illusion of a real demo.

**Fix:** `src/hooks/dock/useDockProductCatalog.ts` — in all 3 hooks (`useDockBrands`, `useDockBrandProducts`, `useDockProductSearch`), change the early return to `if (isDemoMode && !usesRealData)` so org-specific demos fetch real products. Add `usesRealData` from `useDockDemo()`.

### Gap 3: Mix Sessions Don't Leverage `usesRealData`

**Problem:** `useDockMixSessions.ts` returns static `DEMO_MIX_SESSIONS` for all demo modes, even org-specific ones. If the org has real mix session data for today's appointments, it's never shown.

**Fix:** `src/hooks/dock/useDockMixSessions.ts` — change to `if (isDemoMode && !usesRealData)` and let the real query run for org-specific demos. Fall back to demo sessions if the real query returns empty.

### Gap 4: `DockClientTab` Queries Will Fail on Demo Appointments

**Problem:** The Client tab queries `phorest_clients`/`clients` by `phorest_client_id` or `client_id` from demo appointments. Demo appointments use fake IDs (`demo-client-1`, `demo-phorest-1`) that don't exist in the DB. Every section silently fails and shows empty state.

**Fix:** `src/components/dock/appointment/DockClientTab.tsx` — detect demo client IDs (prefix `demo-`) and return mock client data inline (name, fake email, placeholder visit count, etc.) so the Client tab is populated during demos. This only affects the generic preview path; org-specific demos with real appointments already have valid client IDs.

### Gap 5: `urlDemoSession` Is Computed But Never Auto-Applied

**Problem:** `Dock.tsx` creates `urlDemoSession` via `useMemo` when `?demo=<orgId>` is present, but it's only used in `handleLocationChange`. The user still has to go through the PIN gate manually. For a seamless demo experience, the session should auto-apply.

**Fix:** This is intentional behavior (PIN gate validates device binding), so no change needed. But worth noting: if a "skip PIN in demo" flow is ever desired, `urlDemoSession` is already wired — just needs to be set as initial `staff` state.

### Files Summary

| Action | File | Change |
|--------|------|--------|
| Modify | `src/hooks/dock/useDockCompleteAppointment.ts` | Guard demo appointment IDs |
| Modify | `src/hooks/dock/useDockProductCatalog.ts` | Respect `usesRealData` in all 3 hooks |
| Modify | `src/hooks/dock/useDockMixSessions.ts` | Respect `usesRealData`, fallback to demo data |
| Modify | `src/components/dock/appointment/DockClientTab.tsx` | Mock client data for demo IDs |

