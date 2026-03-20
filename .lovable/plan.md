
Goal: make the Dock demo bypass visible in Lovable preview/dev environments so the existing demo mode and device preview tools can actually be accessed.

Why it’s missing
- The bypass button already exists in `src/components/dock/DockPinGate.tsx`.
- It is currently wrapped in `import.meta.env.DEV`.
- Lovable preview runs a production-style preview build, so `import.meta.env.DEV` is false there.
- Result: demo mode infrastructure exists, but the entry point is hidden.

Implementation plan

1. Replace the current DEV-only gate with a safer “preview/dev only” check
- Create a small utility/hook for Dock preview gating, e.g. `src/hooks/dock/useDockDemoAccess.ts`.
- It should return `true` when the app is running in:
  - local development, or
  - Lovable preview/editor context
- It should return `false` on normal published production usage.

2. Update `DockPinGate.tsx`
- Replace `{import.meta.env.DEV && (...)}` with the new preview-access check.
- Keep the existing bypass payload:
  - `userId: 'dev-bypass-000'`
  - `displayName: 'Dev Tester'`
- Optionally rename the button copy to something slightly clearer like:
  - `Open Demo Mode`
  - or keep `Demo Mode →`

3. Keep demo internals unchanged
- `DockDemoContext` should continue to derive demo state from `staff.userId === 'dev-bypass-000'`.
- `DockLayout`, device switcher, badge, and mock-data hooks do not need architectural changes.

4. Add a small safety guard
- Centralize the rule so future demo-only UI uses the same logic instead of sprinkling `import.meta.env.DEV` checks around the Dock.
- This avoids the same issue recurring for the switcher/badge or future preview tools.

Recommended detection logic
- Prefer a helper that checks, in order:
  - `import.meta.env.DEV`
  - known preview query params already used in the repo (`preview`, `mode`)
  - optionally Lovable preview hostname patterns if needed
- That fits existing project patterns better than hardcoding only DEV.

Files to update
- New: `src/hooks/dock/useDockDemoAccess.ts`
- Edit: `src/components/dock/DockPinGate.tsx`

Technical notes
- No backend changes are needed.
- No auth or database changes are needed.
- The `validate_dock_pin` function is unrelated to why the bypass is hidden; this is strictly a frontend environment-gating issue.
- The preview screenshot matches this diagnosis: the PIN screen renders, but the DEV-only button is absent.

Acceptance criteria
- In Lovable preview, the Dock PIN screen shows the demo bypass button.
- Clicking it enters demo mode immediately.
- The DEMO badge appears after entry.
- The phone/tablet/full preview switcher is accessible in demo mode.
- On a published/live app, the demo bypass remains hidden.

Optional follow-up
- Add a tiny caption under the button like “Preview only” so team members know it’s a non-production shortcut.
