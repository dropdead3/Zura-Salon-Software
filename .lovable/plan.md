

# Remove PostSetupOrientationOverlay (defer to future wave)

The post-setup 3-pointer orientation tour (`PostSetupOrientationOverlay`) shipped earlier is too sparse to honor the "guided intelligence for scaling operators" promise — three generic copy blocks over a blurred backdrop is not orientation, it's a TODO. Remove it cleanly so we can rebuild it properly later (anchored to real DOM targets, persona-scaled, telemetry-instrumented).

## What changes

1. **Delete the component file** — `src/components/onboarding/PostSetupOrientationOverlay.tsx`.
2. **Remove its mount points** — find every place it's rendered (likely the dashboard root or a layout wrapper) and strip the import + JSX.
3. **Leave the `localStorage` key alone** — the `zura.orientation.completed` key in users' browsers becomes inert. No migration needed; it's harmless dead data and the future implementation will use a new key/table anyway.
4. **Leave `auth.users.user_metadata.orientation_completed_at` alone** — same reasoning. Best-effort writes that landed are inert.

## Files affected

- **Delete**: `src/components/onboarding/PostSetupOrientationOverlay.tsx`
- **Edit**: whichever file mounts `<PostSetupOrientationOverlay />` (I'll grep for it before editing — most likely a dashboard layout or `OrgDashboardRoute`/Command Center root). Strip the import and the JSX.

No DB changes. No edge-function changes. No memory updates (this component wasn't load-bearing in the wizard contract memory).

## Acceptance

1. After login, no orientation overlay appears on the dashboard.
2. No console errors or stale imports of `PostSetupOrientationOverlay` anywhere in the codebase (`grep` returns zero hits post-change).
3. The wizard's completion flow still routes the user to the dashboard normally — only the overlay is gone.

## Doctrine compliance

- **Silence is valid output**: removing a half-built surface is preferable to keeping a noisy one.
- **Anti-noop**: the orientation tour wasn't reducing ambiguity or surfacing leverage; it was decorative.
- **Future re-build**: when revisited, it should be anchored to real elements (Command Center top lever, Compensation Hub gate, Team rail), persona-scaled, and emit `orientation_step_viewed` / `orientation_dismissed` telemetry — not three modal cards.

