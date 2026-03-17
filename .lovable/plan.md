

# Fix Org Logo Display Size in Dashboard Sidebar

## Problem
Org-uploaded logos display tiny in the sidebar because:
1. The sidebar logo has `h-3.5` (14px) height constraint — too small for logos with padding/whitespace
2. No processing on upload — a 600×600 square image with a tiny logo in the center stays as-is
3. No guidance to org admins about ideal logo dimensions

## Solution — Two-pronged approach

### 1. Increase sidebar logo display size
In `SidebarNavContent.tsx`, change the expanded logo from `h-3.5 max-w-[140px]` to `h-7 max-w-[160px]` (~28px height). This doubles the visual size and better fills the sidebar header area. Also bump the collapsed icon from `h-4 max-w-[32px]` to `h-6 max-w-[32px]`.

In `DashboardLayout.tsx`, apply matching increases to the mobile header logo display.

### 2. Add upload guidance + image trimming on upload
In `BusinessSettingsDialog.tsx`:
- Add a canvas-based **auto-trim** step during `uploadLogo` that strips transparent/white padding from PNG images before uploading (SVGs pass through unchanged). This handles the "600×600 with tiny logo" problem automatically.
- Add clearer upload guidance text: "Use a horizontal/wordmark logo. Transparent background recommended. Avoid square logos with excess padding."
- Increase the preview `max-h` from `[80px]` to `[100px]` so admins see a more realistic preview.

### Files to modify
- `src/components/dashboard/SidebarNavContent.tsx` — bump logo height classes (lines 346, 360)
- `src/components/dashboard/DashboardLayout.tsx` — bump mobile logo height if present
- `src/components/dashboard/settings/BusinessSettingsDialog.tsx` — add auto-trim utility on PNG upload, improve guidance text, increase preview size

