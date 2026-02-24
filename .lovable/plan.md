
## Fix Desktop Top Bar Overlapping Sidebar on Schedule Page

### Problem

On the Schedule page (which uses `hideFooter` mode), the desktop top bar switches from `sticky` to `fixed` positioning. Its `left` offset is hardcoded to `312px` when the sidebar is expanded, but the actual content area starts at `344px` (sidebar width 320px + left offset 12px + padding 12px). This 32px mismatch causes the top bar pill to extend behind the sidebar.

### Fix

**File: `src/components/dashboard/DashboardLayout.tsx`** -- line 1143

Change the `left` value from `312px` to `344px` for the expanded sidebar state:

```
// Current (line 1143):
style={hideFooter ? { left: sidebarCollapsed ? '88px' : '312px' } : undefined}

// Updated:
style={hideFooter ? { left: sidebarCollapsed ? '88px' : '344px' } : undefined}
```

### Why This Works

- The sidebar is `w-80` (320px) positioned at `left-3` (12px from viewport edge), so its right edge is at 332px
- The content wrapper uses `pl-[344px]` which adds 12px of breathing room beyond the sidebar
- The top bar's `left` must match `344px` to align with the content area
- Collapsed state (`88px`) already aligns correctly with `pl-[88px]`

Single property change, one file, zero risk of side effects.
