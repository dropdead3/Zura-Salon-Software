

## Gap Analysis: Service Tracking, Pricing & Dock Billing — Pass 6

### Bug 1 (CRITICAL — Completion Sheet Unreachable): No Trigger to Open DockSessionCompleteSheet

`showComplete` is declared at line 115 and used to control the `DockSessionCompleteSheet` visibility. But **`setShowComplete(true)` is never called anywhere in the codebase.** The `hasActiveSessions` variable is computed (line 444) but never rendered as a button or trigger.

Result: The Dock user has no way to complete a session. The entire completion → depletion → charge chain is dead code. No inventory depletion, no charges, no session finalization from the Dock.

**Fix:** Add a "Complete Session" FAB (floating action button) at the bottom of the services tab when `hasActiveSessions` is true. Style it per Dock UI tokens — a prominent emerald button with a `Check` icon, positioned above the formula history button. Tapping it calls `setShowComplete(true)`.

```tsx
{hasActiveSessions && !activeBowl && (
  <button
    onClick={() => setShowComplete(true)}
    className="absolute bottom-4 right-5 z-[25] h-12 px-5 rounded-full 
               bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm
               flex items-center gap-2 shadow-lg active:scale-95 transition-all"
  >
    <Check className="w-4 h-4" />
    Complete Session
  </button>
)}
```

### Gap 2 (Medium): Session Stats Only Cover First Session

`useDockSessionStats` accepts a single `sessionId`. For multi-session appointments, `primarySessionId` only feeds the first session's stats to the completion sheet. All other sessions' dispensed weight, cost, and bowl count are missing.

**Fix:** Update `useDockSessionStats` to accept `sessionIds: string[]` (an array). Query `mix_bowl_projections` using `.in('mix_session_id', sessionIds)` and aggregate across all results. Update callers to pass `activeSessionIds` instead of `primarySessionId`.

### Gap 3 (Medium): `DockSummaryTab` Also Only Uses First Session

`DockSummaryTab.tsx` line 23: `const primarySessionId = sessions?.[0]?.id`. Same single-session stats issue. Should aggregate across all sessions for the appointment.

**Fix:** Apply the same multi-session array pattern from Gap 2.

### Gap 4 (Low): Completion Chain Has No Error Recovery

If `depleteInventory` fails mid-loop (e.g., network drop), the session status is already set to `completed` but inventory is not depleted and charges are not calculated. The chain cannot be retried because the session is now in a terminal state.

**Fix:** Wrap the completion chain in a try/catch per session. If depletion or charge calculation fails, log the failure and show a warning toast ("Session completed but inventory/charges need review") rather than silently swallowing the error. Consider adding a `needs_reconciliation` flag to the session for manager follow-up.

### Gap 5 (Low): Charge Amount Not Surfaced Post-Completion

After `handleCompleteSession` runs the charge chain, it closes the sheet immediately via `setShowComplete(false)`. The user never sees the calculated charges. The `existingCharges` query won't have the new data until it refetches.

**Fix:** After the completion loop, `await queryClient.invalidateQueries(['checkout-usage-charges'])` and briefly delay sheet close (or switch the sheet to a "completed" confirmation mode showing the calculated totals).

---

### Implementation Order

1. **Add "Complete Session" FAB** — Bug 1 (entire flow is unreachable without this)
2. **Multi-session stats aggregation** — Gap 2 + 3
3. **Post-completion charge visibility** — Gap 5
4. **Error recovery for completion chain** — Gap 4

### Scope
- 3 files modified: `DockServicesTab.tsx`, `useDockSessionStats.ts`, `DockSummaryTab.tsx`
- No database migrations
- No breaking changes

