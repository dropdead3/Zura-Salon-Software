

## Add More Left Padding to All Dock Components

**Problem:** Content sits too close to the left edge across the Dock UI. Currently using `px-5` (20px) everywhere.

### Approach

Increase horizontal padding from `px-5` to `px-7` (28px) across all Dock tab components and sheets. This is a global find-and-replace within the Dock component tree.

### Files to update

| File | Change |
|------|--------|
| `DockScheduleTab.tsx` | `px-5` → `px-7` on header, chemical toggle, scroll area |
| `DockSettingsTab.tsx` | `px-5` → `px-7` on header |
| `DockAppointmentDetail.tsx` | `px-5` → `px-7` on header |
| `DockSummaryTab.tsx` | `px-5` → `px-7` on container |
| `DockClientTab.tsx` | `px-5` → `px-7` on container |
| `DockNotesTab.tsx` | `px-5` → `px-7` on container |
| `DockScaleTab.tsx` | `px-5` → `px-7` on container |
| `DockNewBookingSheet.tsx` | `px-5` → `px-7` on internal sections |
| `DockNewClientSheet.tsx` | `px-5` → `px-7` on internal sections |
| `DockEditServicesSheet.tsx` | `px-5` → `px-7` on internal sections |
| `DockSessionCompleteSheet.tsx` | `px-5` → `px-7` on internal sections |
| `DockProductPicker.tsx` | `px-5` → `px-7` on internal sections |
| `DockClientQuickView.tsx` | `px-5` → `px-7` if applicable |

Mechanical class swap across ~17 files. No logic changes.

