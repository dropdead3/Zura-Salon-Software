

# Fix Dialog Centering to Account for Sidebar

## Problem

All dialogs (`DialogContent`) use `left-[50%] translate-x-[-50%]` which centers them relative to the full viewport. The persistent sidebar (320px expanded / 64px collapsed + margins) eats into the visible content area, causing dialogs to appear shifted left and partially hidden behind the sidebar on narrower screens.

## Solution — CSS Custom Property on Layout Root

Set a CSS variable `--sidebar-offset` on the `DashboardLayout` root that equals **half the sidebar's occupied width**. The dialog component reads this variable to shift its center point into the content area.

```
Viewport:  |--- sidebar (340px) ---|------------- content area --------------|
Old center:                    ↑ (50% of viewport — partially behind sidebar)
New center:                                      ↑ (50% of content area)
```

### How the math works

- Sidebar expanded: occupies ~340px → offset = 170px → dialog `left: calc(50% + 170px)`
- Sidebar collapsed: occupies ~88px → offset = 44px → dialog `left: calc(50% + 44px)`  
- Mobile (no sidebar): offset = 0 → standard centering

### Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/DashboardLayout.tsx` | Set `--sidebar-offset` CSS variable on the layout wrapper, reactive to `sidebarCollapsed` state. Only applied at `lg:` breakpoint. |
| `src/components/ui/dialog.tsx` | Replace `left-[50%]` with inline style `left: calc(50% + var(--sidebar-offset, 0px))`. Update slide-in/slide-out animations to match. |
| `src/components/dashboard/drilldownDialogStyles.ts` | Same left-offset adjustment for drill-down dialogs. |

### Why CSS variable instead of React context

- Zero coupling between the dialog primitive and dashboard layout
- Works for all dialogs globally — no per-dialog prop needed
- The variable naturally falls back to `0px` outside the dashboard (login pages, public pages)
- Animations stay in CSS, no JS re-renders on sidebar toggle

### Edge cases handled

- **Mobile**: No sidebar → variable unset → `var(--sidebar-offset, 0px)` = standard centering
- **Hidden sidebar** (`hideSidebar` routes): Variable set to 0
- **Sidebar toggle animation**: Variable updates with the same 500ms transition as the sidebar
- **Drilldown dialogs**: Use the same variable via the shared constant

