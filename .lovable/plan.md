

# Direct-Click for Single-Item Sections in Collapsed Sidebar

## Problem
`SidebarNavContent.tsx` renders every non-main section in the collapsed sidebar as a `HoverPopover`, even when the section has only one link (e.g., SYSTEM → Settings). The fix we previously applied to `CollapsibleNavGroup.tsx` doesn't apply here because the sidebar uses `SidebarNavContent.tsx` for these sections.

## Change — `src/components/dashboard/SidebarNavContent.tsx` (lines 667-758)

Add a single-item check before the `HoverPopover` block. If `filteredItems.length === 1`, render a `Tooltip`-wrapped direct-navigation button instead of the popover:

```tsx
// Line 667-758: replace the collapsed section rendering
{isCollapsed && sectionId !== 'main' ? (
  (() => {
    const SectionIcon = SECTION_ICONS[sectionId] || SECTION_ICONS.main;
    const isAnyActive = filteredItems.some(item => location.pathname === item.href);

    // Single-item section → direct click
    if (filteredItems.length === 1) {
      const singleItem = filteredItems[0];
      const Icon = singleItem.icon;
      const resolvedHref = dashPath(singleItem.href.replace(/^\/dashboard/, ''));
      const isActive = location.pathname === resolvedHref;
      const label = getNavLabel(singleItem);
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={resolvedHref}
              onClick={(e) => {
                e.preventDefault();
                navigate(resolvedHref, { state: { navTimestamp: Date.now() } });
                onNavClick();
              }}
              className={cn(
                "flex items-center justify-center px-2 py-2 mx-2 rounded-full",
                "transition-all duration-300 text-sm",
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

    // Multi-item section → existing HoverPopover (unchanged)
    return (
      <HoverPopover>
        ...existing popover code...
      </HoverPopover>
    );
  })()
)
```

Also add `Tooltip`, `TooltipTrigger`, `TooltipContent` imports if not already present.

### Files Modified
1. `src/components/dashboard/SidebarNavContent.tsx` — add single-item direct-click path in collapsed state

