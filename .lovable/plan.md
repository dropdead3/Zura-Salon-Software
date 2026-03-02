

## Remove Overflow Menu, Inline Controls into Top Bar

The overflow dropdown (Info icon) currently hides "Hide Numbers", "Next Client", and "Keyboard Shortcuts" behind a popover. You want these controls directly in the top bar instead, and Keyboard Shortcuts removed entirely.

### Changes

**`src/components/dashboard/SuperAdminTopBar.tsx`**
- Remove the `TopBarOverflowMenu` import and its entire `<div className="2xl:hidden">` block (lines 186-197)
- Change `HideNumbersToggle` wrapper from `hidden 2xl:flex` to just `flex` so it's always visible in the top bar regardless of viewport
- The `NextClientIndicator` stays in the center zone (already responsive at 2xl)

**`src/components/dashboard/DashboardLayout.tsx`**
- Remove the `KeyboardShortcutsDialog` import and its `<KeyboardShortcutsDialog />` render

**Files to leave in place but no longer actively used:**
- `TopBarOverflowMenu.tsx` — no longer imported (dead code, can be cleaned up later)
- `KeyboardShortcutsDialog.tsx` and `useKeyboardShortcuts.ts` — no longer rendered

### Result
- Hide Numbers toggle is always visible in the top bar at all breakpoints
- No more dropdown/overflow menu (Info icon gone)
- Keyboard Shortcuts dialog removed from the dashboard

