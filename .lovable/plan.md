

## Remove Swipe-to-Lock Gesture

The `useDockLockGesture` hook is no longer needed since the Lock FAB handles locking. Remove it from `DockLayout.tsx`.

### Change — `src/components/dock/DockLayout.tsx`

1. Remove the import of `useDockLockGesture`
2. Remove the `useDockLockGesture` hook call (containerRef, lockProgress)
3. Simplify the merged ref assignment to only use `idleRef`

One file, three deletions.

