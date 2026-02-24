

## Fix Separator Position -- Flush With Scroll Boundary

### Problem

The separator line appears too low -- there's a gap between where the scroll area clips the "Settings" link and where the border renders. The border should sit flush at the top of the fixed footer area, acting as a clean visual edge where scrollable content ends.

### Root Cause

There's extra spacing between the `ScrollArea` closing tag and the separator div (the blank line on line 730), plus the footer container has `pt-2` that adds space below the separator. The separator itself is fine but needs to be tighter against the scroll boundary.

### Fix

**File: `src/components/dashboard/SidebarNavContent.tsx`**

1. **Line 730-732**: Remove the blank line between `</ScrollArea>` and the separator, and add `pt-2` to the separator div itself (acting as spacing below the line, not above):

```
// Before (lines 729-735):
</ScrollArea>

{/* Separator */}
<div className="mx-3 border-t border-border/40" />

{/* Fixed Footer Navigation - always at bottom */}
<div className="mt-auto shrink-0 flex flex-col gap-2 pt-2">

// After:
</ScrollArea>
{/* Separator */}
<div className="mx-3 border-t border-border/40 mt-0" />
{/* Fixed Footer Navigation - always at bottom */}
<div className="mt-auto shrink-0 flex flex-col gap-2 pt-2">
```

This removes any implicit spacing from blank lines/layout gaps and ensures the border renders right at the scroll clip boundary. The `mt-0` is explicit insurance against any flex gap from the parent container. The `pt-2` on the footer container provides breathing room below the line.

One class addition, one blank line removal. No other files affected.
