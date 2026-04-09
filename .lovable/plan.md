

# Fix: Lock Screen Still Appearing in God Mode

## Root Cause

Two bugs work together:

1. **Missing dependency in `useAutoLock`**: The `useEffect` deps array (line 44) includes `[isLocked, resetTimer]` but **not** `isImpersonating`. When God Mode activates after mount, the effect doesn't re-run — the existing 2-minute timer keeps ticking and fires `lock()`.

2. **No God Mode guard on the lock screen render**: In `DashboardLayout.tsx` line 584, `{isLocked && <DashboardLockScreen />}` renders unconditionally. Even if the timer somehow fires (race condition, manual lock button press), the lock screen should never appear in God Mode.

## Changes

| File | What |
|------|------|
| `src/hooks/useAutoLock.ts` | Add `isImpersonating` to the `useEffect` dependency array so the guard re-evaluates when God Mode toggles |
| `src/components/dashboard/DashboardLayout.tsx` | Change line 584 from `{isLocked && <DashboardLockScreen .../>}` to `{isLocked && !isImpersonating && <DashboardLockScreen .../>}` — `isImpersonating` is already available in scope |

Two lines changed, two files.

