

# View Level Roadmap with "Mark as Configured" Status

## Summary
Enhance the previously approved roadmap plan by adding an `is_configured` boolean column to `stylist_levels`. Each level starts unconfigured. The user explicitly marks a level as "configured" once they're satisfied with its setup. The roadmap view reflects this status — incomplete levels show a clear visual indicator so the operator knows at a glance what's done and what still needs attention.

## Database Change

### Migration: Add `is_configured` to `stylist_levels`

```sql
ALTER TABLE public.stylist_levels
  ADD COLUMN is_configured boolean NOT NULL DEFAULT false;
```

No RLS changes needed — existing policies cover this column.

## Code Changes

### 1. Update `StylistLevel` interface (`useStylistLevels.ts`)
Add `is_configured: boolean` to the `StylistLevel` interface and include it in the `useSaveStylistLevels` mutation payloads.

### 2. Add "Mark as Configured" toggle to editor (`StylistLevelsEditor.tsx`)
- Per-level toggle button (checkmark icon) in the level column header or level card area
- When clicked, calls `useUpdateStylistLevel` to set `is_configured = true/false`
- Visual state: configured levels show a green check badge; unconfigured show an amber "incomplete" indicator
- This is a deliberate user action — not auto-computed

### 3. Replace "Export Roadmap" with "View Level Roadmap" button (`StylistLevelsEditor.tsx`)
- Add `showRoadmap` state toggle
- Button uses `Eye` icon + "View Level Roadmap" label
- Opens the new `LevelRoadmapView` overlay

### 4. Create `LevelRoadmapView.tsx` (new file)
Full-screen white overlay (`fixed inset-0 z-50 bg-white overflow-auto`) with print-optimized layout.

**Structure:**
- **Sticky action bar** (hidden on print): Close, Download PDF, Print buttons
- **Org header**: Logo + org name + "Level Graduation Roadmap" + date
- **Career progression timeline**: Horizontal stepped nodes using `getLevelColor`, with configured/unconfigured badge per node
- **Per-level detail cards**:
  - Left accent bar using level color
  - Configuration status badge (green "Configured" or amber "Setup Incomplete")
  - Commission rates (service %, retail %, hourly)
  - KPI requirements grid (only enabled metrics from promotion criteria)
  - Evaluation window, tenure, manual approval
  - Retention policy summary
  - **Unconfigured levels**: Card shows a subtle amber border/background with "This level has not been marked as configured" notice — all data still visible but flagged
- **Footer**: "Confidential — For internal use only"

**Print styles:** `print:` Tailwind variants hide action bar, remove shadows, ensure `break-inside-avoid` on cards.

**Data sources:** Same props already available in editor — levels, promotionCriteria, retentionCriteria, commissions, org info. Plus the new `is_configured` field.

## Files

| File | Action |
|------|--------|
| `stylist_levels` table | **Migrate** — add `is_configured` column |
| `src/hooks/useStylistLevels.ts` | **Edit** — add field to interface + mutations |
| `src/components/dashboard/settings/LevelRoadmapView.tsx` | **Create** — roadmap overlay |
| `src/components/dashboard/settings/StylistLevelsEditor.tsx` | **Edit** — add configured toggle, swap button, render overlay |

