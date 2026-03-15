

# Fix Zura Backroom Page — Platform Design Alignment

## Problem

The Backroom admin page (`/dashboard/platform/backroom`) is the only platform page that uses `DashboardPageHeader` and raw `<div className="space-y-6">` instead of the platform UI primitives. Every other platform page uses `PlatformPageContainer` + `PlatformPageHeader`. This causes inconsistent padding, typography, and visual treatment compared to the rest of the platform backend.

## Changes

### 1. BackroomAdmin.tsx — Use platform primitives

Replace `DashboardPageHeader` with `PlatformPageContainer` + `PlatformPageHeader` to match every other platform page (Benchmarks, Revenue, AuditLog, FeatureFlags, etc.):

- Wrap content in `<PlatformPageContainer className="space-y-6">`
- Replace `DashboardPageHeader` with `PlatformPageHeader` (title + description)
- Keep the existing `Tabs` structure intact

### 2. Tab content cards — Minor consistency fixes

All five tab components already use `tokens.card.title`, `tokens.table.columnHeader`, and the luxury glass card aesthetic (`rounded-xl border-border/60 bg-card/80 backdrop-blur-xl`). These are correct. No structural changes needed to the tab components themselves.

### Summary of edits

| File | Change |
|------|--------|
| `BackroomAdmin.tsx` | Swap `DashboardPageHeader` → `PlatformPageContainer` + `PlatformPageHeader` |

This is a small, targeted fix — one file, ~10 lines changed.

