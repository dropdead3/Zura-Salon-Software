

## Move Edit Services Button to Top Right, Inline with Demo Badge

### Change — `src/components/dock/appointment/DockAppointmentDetail.tsx`

Restructure the header so the Edit Services button moves from below the subtitle to the top-right of the header row, sitting to the left of the Demo badge with a gap between them.

**Current layout:**
```text
[←]  RACHEL KIM                              [Demo badge is absolute-positioned elsewhere]
     Root Touch-Up + Gloss · 4:38–5:53 PM
     [Edit Services]
```

**New layout:**
```text
[←]  RACHEL KIM                    [Edit Services] [Demo]
     Root Touch-Up + Gloss · 4:38–5:53 PM
```

**Implementation:**
- Remove the Edit Services button from inside the `flex-1 min-w-0` subtitle div (lines 94–102)
- Add a right-side `div` with `flex items-center gap-3` after the `flex-1` div, containing:
  1. Edit Services button (same styling, slightly smaller padding to fit the row)
  2. Inline Demo badge (import `useDockDemo` + `DOCK_BADGE`, render conditionally when `isDemoMode`)
- The global `DockDemoBadge` component will still render but is hidden behind this inline badge when on the detail view — or we can rely on it being covered. Since it's absolute-positioned at `top-5 right-20`, moving the inline badge here provides the correct alignment.

### One file changed
`src/components/dock/appointment/DockAppointmentDetail.tsx`

