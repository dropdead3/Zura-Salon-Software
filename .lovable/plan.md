

# Zura Pay Build Audit — Gaps, Bugs & Enhancements

## BUG 1 (Critical): Test Appointment Fails — Wrong Time Format

**Status**: Broken (confirmed via session replay)

**Error**: `invalid input syntax for type time: "2026-04-14T17:00:00.000Z"`

**Root cause**: `start_time` and `end_time` in the `appointments` table are PostgreSQL `time` columns (e.g. `"14:30:00"`), but the code sends full ISO timestamps (`startTime.toISOString()`).

**Fix** in `ZuraPayActivationChecklist.tsx` (lines 89-90):
```typescript
// Before (broken):
start_time: startTime.toISOString(),
end_time: endTime.toISOString(),

// After (correct):
start_time: startTime.toTimeString().slice(0, 8),  // "14:30:00"
end_time: endTime.toTimeString().slice(0, 8),        // "15:00:00"
```

---

## BUG 2 (Medium): `handleTestDisplay` Doesn't Check Response Data for Errors

**Status**: Inconsistent error handling

The `handleTestDisplay` function (line 276) only checks `setError` from the Supabase invocation wrapper but doesn't inspect `data?.error` from the edge function response — unlike `handleClearDisplay` which properly checks both. A Stripe API error would be silently treated as success.

**Fix**: Add `data` destructuring and check `data?.error` the same way `handleClearDisplay` does.

---

## BUG 3 (Low): Auto-Clear Timer Not Cleaned on Unmount

**Status**: Potential memory leak

`testTimerRef.current` holds a `setTimeout` ID but there's no cleanup on component unmount. If the user navigates away during the 10s window, the timer fires on an unmounted component.

**Fix**: Add a `useEffect` cleanup that clears the timer on unmount.

---

## ENHANCEMENT 1: Test Appointment Duplicate Prevention

**Status**: Missing guard

Users can click "Create Test Appointment" multiple times (across page refreshes — `testApptCreated` state resets). This creates duplicate $0.50 appointments on the schedule.

**Fix**: Before inserting, query for an existing `import_source = 'zura_test'` appointment for today. If found, skip insertion and show the "View Schedule" link directly. Also check on mount so the button shows the correct state after refresh.

---

## ENHANCEMENT 2: Test Appointment Cleanup

**Status**: No cleanup mechanism

Test appointments (`import_source: 'zura_test'`) persist indefinitely. After the first real transaction is processed, old test appointments clutter the schedule.

**Fix**: Add a "Remove Test Appointment" option in the success state, or auto-clean test appointments older than 24 hours via a simple check in the same component.

---

## ENHANCEMENT 3: Edge Function — `clear_reader_display` vs `cancel_action` Duplication

**Status**: Redundant code paths

Both `clear_reader_display` (line 124) and `cancel_action` (line 149) now call the identical Stripe method (`stripe.terminal.readers.cancelAction`). This is correct behavior but creates maintenance confusion.

**Fix**: Add a code comment clarifying that `clear_reader_display` is the public-facing alias for clearing test carts, while `cancel_action` cancels payment collection. They share the same Stripe method because Stripe uses `cancelAction` for both purposes.

---

## Summary of Changes

| # | Type | File | Description |
|---|------|------|-------------|
| 1 | Bug fix | `ZuraPayActivationChecklist.tsx` | Format `start_time`/`end_time` as `HH:MM:SS` not ISO |
| 2 | Bug fix | `ZuraPayFleetTab.tsx` | Check `data?.error` in `handleTestDisplay` |
| 3 | Bug fix | `ZuraPayFleetTab.tsx` | Clean up auto-clear timer on unmount |
| 4 | Enhancement | `ZuraPayActivationChecklist.tsx` | Prevent duplicate test appointments |
| 5 | Enhancement | `ZuraPayActivationChecklist.tsx` | Add "Remove Test Appointment" action |
| 6 | Enhancement | `terminal-reader-display/index.ts` | Clarify comment on duplicate code paths |

