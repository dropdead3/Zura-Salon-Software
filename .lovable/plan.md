

# Fix Capital Control Tower Padding

## Problem

The `CapitalControlTower` page uses a bare `<div className="space-y-6">` as its root container. Every other platform page wraps content in `<PlatformPageContainer>`, which provides consistent responsive padding (`px-4 py-6 sm:px-6 sm:py-8 lg:px-8`, max-width 1600px, centered). This causes the Capital page to have no page-level padding.

## Fix

**File:** `src/pages/dashboard/platform/CapitalControlTower.tsx`

- Import `PlatformPageContainer` from `@/components/platform/ui/PlatformPageContainer`
- Replace the root `<div className="space-y-6">` with `<PlatformPageContainer className="space-y-6">`

One import, one line change. Matches the pattern used by every other platform page (Permissions, FeatureFlags, AuditLog, Onboarding, Notifications, Settings, etc.).

