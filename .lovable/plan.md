

## Show PIN Gate First in Demo Mode

**Problem:** When `?demo=<orgId>` is present, `urlDemoSession` immediately populates `effectiveStaff`, bypassing the PIN entry screen.

**Fix in `src/pages/Dock.tsx`:**

1. Stop using `urlDemoSession` to set `effectiveStaff` directly. Instead, only use it to enable the demo context (device switcher frame, demo badge).
2. Change `effectiveStaff` to always rely on `staff` state (set only after PIN success).
3. When PIN succeeds in demo mode, override the session with demo-specific fields (userId `dev-bypass-000`, the demo orgId) so `DockDemoProvider` still recognizes demo mode.
4. The PIN gate already renders inside the device frame when `canAccessDemo` is true — that stays as-is.

**Concrete change:** ~10 lines in `Dock.tsx`:
- `effectiveStaff` becomes just `staff` (remove the `urlDemoSession` ternary)
- `handlePinSuccess` in demo mode wraps the real PIN result with demo overrides (`userId: 'dev-bypass-000'`, `organizationId: demoOrgId`)
- The `if (!effectiveStaff)` block uses `canAccessDemo` (already does) to show the device frame around the PIN gate
- Remove the early-return `urlDemoSession` auto-boot logic

