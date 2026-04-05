

# Graduation System — Pass 8: Levels Editor Gaps and Consolidation

## Current State

There are **two separate level editors** with divergent feature sets:
1. **Standalone page** (`StylistLevels.tsx` at `/admin/stylist-levels`) — has GraduationWizard, criteria summary, PDF export, color/card/tooltip previews, but **no commission rate editing**
2. **Settings embed** (`StylistLevelsContent.tsx` at `/admin/settings?category=levels`) — has commission rate editing and TeamCommissionRoster, but **no graduation wizard, no criteria summary, no previews**

Admins get a different experience depending on which path they take to manage levels.

---

## Gaps Found

### 1. Two editors, neither complete
The standalone page cannot edit commission rates (its `LocalStylistLevel` type omits them; `handleSave` doesn't persist them). The Settings embed cannot configure graduation/retention criteria (no GraduationWizard, no criteria hooks). This is confusing — an admin who configures levels in Settings never sees the graduation pathway button.

### 2. Stale "graduation" terminology in standalone editor
- "Configure Graduation" / "Graduation Configured" (line 522-523)
- "Graduation Roadmap" sidebar heading (line 606)
- PDF filename `graduation-roadmap.pdf` (line 303)
- Toast: "Graduation roadmap exported" (line 304)

These should say "Level Progression" or "Promotion Pathway" to match the system rename from earlier passes.

### 3. Retention criteria not shown inline
Retention criteria is fetched but only passed to the PDF export. The roadmap sidebar and the inline criteria summary beneath each level only show promotion criteria. Admins can't see retention ("Required to Stay") status at a glance in the editor.

### 4. Broken link from GraduationTracker
`GraduationTracker.tsx` line 118 links to `/admin/settings/stylist-levels` — this route doesn't exist. The actual routes are `/admin/stylist-levels` (standalone) or `/admin/settings?category=levels` (Settings embed).

### 5. Delete without reassignment
When deleting a level with assigned stylists, the confirmation dialog warns about the count but clicking "Delete" proceeds without offering to reassign those stylists to another level. This can orphan stylists with a stale `stylist_level` value that no longer maps to any level.

### 6. Slug collision on add
`handleAddNew` generates slugs from names (`name.toLowerCase().replace(/\s+/g, '-')`) but doesn't check if the slug already exists among current levels. Adding "New Talent" after a deleted "new-talent" would create a duplicate slug conflict.

---

## Plan

### 1. Consolidate to one editor surface
Remove `StylistLevelsContent.tsx` as a standalone implementation. Instead, have the Settings `levels` category render the full `StylistLevels` component (without the `DashboardLayout` wrapper) or redirect to the standalone page. This eliminates the feature parity gap.

**Approach**: Extract the core editor from `StylistLevels.tsx` into a shared `StylistLevelsEditor` component that both surfaces can render. Add commission rate fields to the standalone editor's `LocalStylistLevel` type and `handleSave`. Integrate `TeamCommissionRoster` into the standalone page.

### 2. Rename stale graduation terminology
- "Configure Graduation" → "Configure Criteria"
- "Graduation Configured" → "Criteria Configured"
- "Graduation Roadmap" → "Progression Roadmap"
- PDF filename → `level-progression-roadmap.pdf`
- Toast → "Progression roadmap exported"

### 3. Show retention criteria inline
Add retention criteria summary beneath each level row (similar to promotion criteria summary). Format: "Required to Stay: $5K rev · 8% retail — 90d grace · Coaching" using the existing retention data.

### 4. Fix broken GraduationTracker link
Update the link from `/admin/settings/stylist-levels` to `/admin/stylist-levels`.

### 5. Add reassignment on level delete
When deleting a level that has assigned stylists, show a select dropdown in the confirmation dialog asking which level to reassign them to. On confirm, bulk-update the affected `employee_profiles` before deleting the level.

### 6. Add slug deduplication
Before adding a new level, check if the generated slug already exists in the current `levels` array. If so, append a numeric suffix (e.g., `new-talent-2`).

---

## File Changes

| File | Action |
|------|--------|
| `src/pages/dashboard/admin/StylistLevels.tsx` | **Modify** — Add commission rate fields to LocalStylistLevel and handleSave, add retention criteria inline summary, rename graduation terminology, add slug dedup, add reassignment on delete, integrate TeamCommissionRoster |
| `src/components/dashboard/settings/StylistLevelsContent.tsx` | **Modify** — Replace with redirect/render of the consolidated editor (or thin wrapper around shared component) |
| `src/pages/dashboard/admin/GraduationTracker.tsx` | **Modify** — Fix broken link to `/admin/stylist-levels` |

**0 new files, 3 modified files, 0 migrations.**

