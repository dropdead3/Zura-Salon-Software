

# Remove Sidebar Preview from Business Settings Dialog

## Changes

**File: `src/components/dashboard/settings/BusinessSettingsDialog.tsx`**

1. **Delete the `SidebarLogoPreview` component** (lines 428–525) — the entire inline sub-component definition.

2. **Delete the render call** (lines 642–651) — the conditional block that renders `<SidebarLogoPreview ... />`.

3. **Clean up unused imports** — remove `Sun`, `Moon` from the lucide-react import (line 8) since they're only used by the preview. Keep all other imports intact.

No other files affected.

