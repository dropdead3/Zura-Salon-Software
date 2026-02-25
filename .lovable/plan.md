

## Add Collapse Toggle Button to Expanded Sidebar

The expanded sidebar currently has no visible way to collapse it -- the expand chevron only appears in the collapsed state. The fix is to add a collapse button at the bottom of the expanded sidebar, mirroring the expand button placement.

### Changes

**`src/components/dashboard/website-editor/WebsiteEditorSidebar.tsx`**

1. Import `ChevronsLeft` from lucide-react (already imports `ChevronsRight`).
2. At the bottom of the expanded sidebar (after the `ScrollArea`, before the closing `</div>`), add a footer strip with a `ChevronsLeft` icon button that calls `onToggleCollapse`. This mirrors the collapsed state's `ChevronsRight` expand button.

```tsx
{/* Collapse toggle at bottom of expanded sidebar */}
<div className="px-3 py-2 border-t flex-shrink-0">
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/60 text-muted-foreground text-xs transition-colors"
      >
        <ChevronsLeft className="h-4 w-4" />
        <span>Collapse</span>
      </button>
    </TooltipTrigger>
    <TooltipContent side="right">Collapse sidebar</TooltipContent>
  </Tooltip>
</div>
```

### Files Changed
- `src/components/dashboard/website-editor/WebsiteEditorSidebar.tsx`

