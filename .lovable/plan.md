

# Direct-Click for Single-Link Nav Groups (Collapsed Sidebar)

## Problem
In the collapsed sidebar, groups with only one visible link still require hovering to reveal a popover menu, then clicking the link inside. The screenshot shows the "SYSTEM" section with just "Settings" — this should navigate directly on click.

## Change — `src/components/dashboard/CollapsibleNavGroup.tsx` (lines 176-229)

In the collapsed `isCollapsed` branch, add a check: if a group has exactly 1 visible item, render a direct-navigation icon button (with tooltip) instead of the `HoverPopover`. The existing popover behavior stays for groups with 2+ items.

```tsx
// Inside the isCollapsed block, for each group:
if (items.length === 1) {
  const singleItem = items[0];
  const Icon = singleItem.icon;
  const isActive = location.pathname === singleItem.href;
  const label = getNavLabel ? getNavLabel(singleItem) : singleItem.label;
  
  return (
    <Tooltip key={group.id}>
      <TooltipTrigger asChild>
        <a
          href={singleItem.href}
          onClick={(e) => {
            e.preventDefault();
            navigate(singleItem.href, { state: { navTimestamp: Date.now() } });
            onNavClick();
          }}
          className={cn(
            "flex items-center justify-center px-2 py-2 mx-2 rounded-lg",
            "transition-all duration-200 text-sm",
            isActive
              ? "bg-foreground/10 text-foreground"
              : "text-foreground/50 hover:text-foreground hover:bg-foreground/10"
          )}
          style={{ width: 'calc(100% - 16px)' }}
        >
          <Icon className="w-4 h-4" />
        </a>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

// else: existing HoverPopover code for multi-item groups
```

### Files Modified
1. `src/components/dashboard/CollapsibleNavGroup.tsx` — single-item groups navigate directly on click in collapsed state

