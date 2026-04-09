

# Disable Auto-Lock During God Mode

## Change

**`src/hooks/useAutoLock.ts`** — Import `useOrganizationContext` and add an early return when `isImpersonating` is true. This skips all idle-timer logic while God Mode is active, so platform admins viewing an organization are never interrupted by the lock screen.

```typescript
const { isImpersonating } = useOrganizationContext();

// Skip auto-lock entirely in God Mode
if (isImpersonating) {
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  return;
}
```

The guard goes inside the existing `useEffect` (after the `isLocked` early-return block), so the timeout ref is still cleaned up properly. When the admin exits God Mode, normal auto-lock behavior resumes automatically since `isImpersonating` flips to `false` and the effect re-runs.

One file, ~4 lines added.

