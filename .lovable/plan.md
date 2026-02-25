

## Align Top Bar Heights Across Website Editor

The three top bars currently have mismatched padding, creating an uneven horizontal line across the editor:

| Bar | Current Padding | Effective Height |
|-----|----------------|-----------------|
| Editor toolbar | `px-3 py-2` | ~40px |
| Live Preview header | `p-3` (12px all sides) | ~44px |

The sidebar has two stacked sections (page selector + search) so it's inherently taller -- that's fine structurally. The fix is aligning the **editor toolbar** and **live preview header** to the same height.

### Changes

**1. `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` (line 793)**
- Change editor toolbar from `px-3 py-2` to `px-3 py-3` so it matches the preview header's vertical padding.

**2. `src/components/dashboard/website-editor/LivePreviewPanel.tsx` (line 82)**
- Both already use `p-3`, so once the toolbar matches, they'll be identical height. No change needed here.

This is a one-line change: `py-2` → `py-3` on the editor toolbar.

### Files Changed
- `src/pages/dashboard/admin/WebsiteSectionsHub.tsx`

