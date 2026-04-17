
## Prompt review

Sharp visual catch — the screenshot clearly shows the top bar (search, Account Owner, View As, etc.) overlapping/colliding with the collapsed sidebar's `DD°` logo and grid icon. The top bar is sitting *over* the sidebar instead of starting to its right. Good observation.

Tighter framing for next time: mention whether this happened right after the previous fix (restoring `SuperAdminTopBar`) — that pinpoints the regression to that change rather than a pre-existing layout bug. I'll assume it's tied to the restore.

## Diagnosis

In the previous turn I re-mounted `SuperAdminTopBar` inside `DashboardLayout.tsx`, but I likely placed it at the wrong level in the flex tree — outside the main content column, so it spans the full viewport width instead of being constrained to the area right of the sidebar.

Standard dashboard layout pattern:
```
<div flex>
  <Sidebar />               ← fixed width column
  <div flex-1 flex-col>     ← main column
    <SuperAdminTopBar />    ← lives HERE, inside main column
    <main>{children}</main>
  </div>
</div>
```

If `SuperAdminTopBar` is mounted as a sibling of the outer flex (or before the sidebar), it will render full-width and visually overlap the sidebar — exactly what the screenshot shows.

## Investigation needed

1. Read `src/components/dashboard/DashboardLayout.tsx` to confirm where `SuperAdminTopBar` was placed.
2. Confirm sidebar width / container structure so the top bar can be re-nested correctly.

## Plan

**1. Re-nest `SuperAdminTopBar` inside the main content column**
- Move the `<SuperAdminTopBar />` JSX so it's a sibling of `<main>` *inside* the flex-1 main column, not at the layout root.
- `ZuraCommandSurface` (the ⌘K palette) is a portal/dialog and can stay at the root — it doesn't affect layout flow.

**2. Verify no duplicate top bar instance**
- Make sure another component (e.g., a parent wrapper, a route layout) isn't already rendering its own `SuperAdminTopBar`. If so, remove the duplicate from `DashboardLayout` to avoid two bars stacking.

**3. Confirm sticky/positioning**
- If `SuperAdminTopBar` uses `sticky top-0` or `fixed`, ensure its container has correct width constraints (i.e., is inside the main column, not the root flex).

## Acceptance checks

1. Top bar starts immediately to the right of the sidebar — no visual overlap with `DD°` logo or sidebar icons.
2. Sidebar collapse/expand still works; top bar width adjusts accordingly.
3. Search bar (⌘K) still opens the command palette.
4. God Mode bar remains pinned at the very top above everything.
5. No duplicate top bar rendered.
6. Mobile viewport: top bar still spans full width when sidebar is hidden/drawer.

**Files to investigate & likely modify:**
- `src/components/dashboard/DashboardLayout.tsx` (re-nest top bar inside main column)
- Possibly check parent route components if a duplicate exists
