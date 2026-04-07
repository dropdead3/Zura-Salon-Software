

# Remove Redundant Title and Badge from Level Roadmap Cards

## Problem

Each level card in the roadmap shows the level name and configured/incomplete badge **twice**:
1. In the accordion header row (e.g., "1 NEW TALENT ✓ Configured")
2. Inside the expanded card content (e.g., "LEVEL 1 — NEW TALENT ✓ Configured")

This is redundant — the user sees the same information stacked directly on top of itself.

## Fix

Remove the inner header block (lines 506-526 in `LevelRoadmapView.tsx`) that duplicates the title and badge inside the expanded card content. The accordion header already displays the level number, name, and status badge.

For non-accordion mode (≤6 levels where there's no clickable accordion header), convert the accordion header from conditional (`useAccordion ? ... : null`) to always render as a static (non-clickable) row. This ensures the title is always shown exactly once regardless of mode.

### Technical Changes

**File: `src/components/dashboard/settings/LevelRoadmapView.tsx`**

1. **Make the accordion header always render** (lines 464-497): Remove the `useAccordion ? ... : null` conditional — always show the header row. When not in accordion mode, render it as a `div` instead of a `button` (no click handler, no chevron).

2. **Remove the inner duplicate header** (lines 506-526): Delete the `div.flex.items-start.justify-between.mb-4` block containing the second "Level {i+1} — {level.label}" heading and badge. Keep the "Entry Level — Retention Minimums" subtitle — move it into the always-visible header row.

3. **Keep the "not configured" warning banner** (lines 528-532) — that's not redundant.

## Scope
- Single file: `LevelRoadmapView.tsx`
- ~30 lines modified
- No database changes

