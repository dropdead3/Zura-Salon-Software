import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PopoverTrigger } from '@/components/ui/popover';
import { HoverPopover } from './HoverPopover';
import { SidebarPopoverContent } from './SidebarPopoverContent';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  roles?: string[];
}

export interface AnalyticsSubLink {
  tab: string;
  subtab: string;
  label: string;
}

export interface NavSubGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

interface CollapsibleNavGroupProps {
  groups: NavSubGroup[];
  sectionLabel: string;
  isCollapsed?: boolean;
  onNavClick: () => void;
  getNavLabel?: (item: NavItem) => string;
  hiddenLinks?: string[];
  analyticsSubLinks?: AnalyticsSubLink[];
  analyticsHubHref?: string;
  onRemoveSubLink?: (tab: string, subtab: string) => void;
}

const COLLAPSED_STATE_KEY = 'sidebar-nav-group-collapsed';

export function CollapsibleNavGroup({
  groups,
  sectionLabel,
  isCollapsed = false,
  onNavClick,
  getNavLabel,
  hiddenLinks = [],
  analyticsSubLinks = [],
  analyticsHubHref = '/dashboard/admin/analytics',
  onRemoveSubLink,
}: CollapsibleNavGroupProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Load collapsed state from localStorage
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(COLLAPSED_STATE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return {};
        }
      }
    }
    // Default: first group open
    const defaults: Record<string, boolean> = {};
    groups.forEach((group, index) => {
      defaults[group.id] = index === 0;
    });
    return defaults;
  });

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem(COLLAPSED_STATE_KEY, JSON.stringify(openGroups));
  }, [openGroups]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Check if any item in a group is active
  const isGroupActive = (group: NavSubGroup) => {
    return group.items.some(item => location.pathname === item.href);
  };

  // Filter out hidden links from items
  const getVisibleItems = (items: NavItem[]) => {
    return items.filter(item => !hiddenLinks.includes(item.href));
  };

  // Filter groups to only those with visible items
  const visibleGroups = groups.filter(group => getVisibleItems(group.items).length > 0);

  if (visibleGroups.length === 0) return null;

  const NavLink = ({ 
    item,
    isNested = false,
  }: { 
    item: NavItem;
    isNested?: boolean;
  }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.href;
    const label = getNavLabel ? getNavLabel(item) : item.label;
    
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      navigate(item.href, { state: { navTimestamp: Date.now() } });
      onNavClick();
    };

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={item.href}
              onClick={handleClick}
              className={cn(
                "flex items-center justify-center px-2 py-2 mx-2 rounded-lg",
                "transition-all duration-200 ease-out text-sm",
                isActive 
                  ? "bg-foreground text-background shadow-sm dark:bg-muted dark:text-foreground dark:shadow-none" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Icon className="w-4 h-4" />
            </a>
          </TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <a
        href={item.href}
        onClick={handleClick}
        className={cn(
          "flex items-center gap-3 text-sm font-sans cursor-pointer",
          "transition-all duration-200 ease-out rounded-lg",
          isNested ? "px-3 py-2 mx-3 pl-9" : "px-3 py-2.5 mx-3",
          isActive 
            ? "bg-foreground text-background shadow-sm dark:bg-muted dark:text-foreground dark:shadow-none" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1">{label}</span>
      </a>
    );
  };

  // When sidebar is collapsed, show one icon per group with popover menus
  if (isCollapsed) {
    return (
      <div className="space-y-1">
        {visibleGroups.map((group) => {
          const GroupIcon = group.icon;
          const active = isGroupActive(group);
          const items = getVisibleItems(group.items);
          return (
            <HoverPopover key={group.id}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "flex items-center justify-center px-2 py-2 mx-2 rounded-lg",
                    "transition-all duration-200 text-sm",
                    active
                      ? "bg-foreground/10 text-foreground"
                      : "text-foreground/50 hover:text-foreground hover:bg-muted/60"
                  )}
                  style={{ width: 'calc(100% - 16px)' }}
                >
                  <GroupIcon className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <SidebarPopoverContent>
                <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider font-display">
                  {group.label}
                </p>
                {items.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  const label = getNavLabel ? getNavLabel(item) : item.label;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(item.href, { state: { navTimestamp: Date.now() } });
                        onNavClick();
                      }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-sans",
                        "transition-all duration-200 cursor-pointer",
                        isActive
                          ? "bg-foreground text-background shadow-sm dark:bg-muted dark:text-foreground dark:shadow-none"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{label}</span>
                    </a>
                  );
                })}
              </SidebarPopoverContent>
            </HoverPopover>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {visibleGroups.map((group) => {
        const GroupIcon = group.icon;
        const isOpen = openGroups[group.id] ?? false;
        const active = isGroupActive(group);
        const items = getVisibleItems(group.items);

        return (
          <Collapsible
            key={group.id}
            open={isOpen}
            onOpenChange={() => toggleGroup(group.id)}
          >
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 mx-3 rounded-lg",
                  "text-sm font-sans transition-all duration-200 ease-out",
                  "hover:bg-muted/60",
                  active && !isOpen 
                    ? "text-foreground font-medium" 
                    : "text-muted-foreground"
                )}
                style={{ width: 'calc(100% - 24px)' }}
              >
                <GroupIcon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronRight 
                  className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    isOpen && "rotate-90"
                  )} 
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
              <div className="pt-1 space-y-0.5">
                {items.map(item => (
                  <div key={item.href}>
                    <NavLink item={item} isNested />
                    {/* Render favorited subtab sublinks beneath Analytics Hub */}
                    {item.href === analyticsHubHref && analyticsSubLinks.length > 0 && (
                      <div className="space-y-0.5 mt-0.5">
                        {analyticsSubLinks.map(subLink => {
                          const subHref = `${analyticsHubHref}?tab=${subLink.tab}&subtab=${subLink.subtab}`;
                          const isSubActive = location.pathname === analyticsHubHref 
                            && location.search.includes(`tab=${subLink.tab}`) 
                            && location.search.includes(`subtab=${subLink.subtab}`);
                          return (
                            <a
                              key={`${subLink.tab}-${subLink.subtab}`}
                              href={subHref}
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(subHref, { state: { navTimestamp: Date.now() } });
                                onNavClick();
                              }}
                              className={cn(
                                "flex items-center gap-2 text-xs font-sans cursor-pointer group/sublink",
                                "transition-all duration-200 ease-out rounded-lg",
                                "px-3 py-1.5 mx-3 pl-14",
                                isSubActive
                                  ? "bg-foreground text-background shadow-sm dark:bg-muted dark:text-foreground dark:shadow-none"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                              )}
                            >
                              <ChevronRight className={cn("w-3 h-3 flex-shrink-0", isSubActive ? "" : "text-muted-foreground/50")} />
                              <span className="flex-1">{subLink.label}</span>
                              {onRemoveSubLink && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onRemoveSubLink(subLink.tab, subLink.subtab);
                                  }}
                                  className="opacity-0 group-hover/sublink:opacity-100 transition-opacity"
                                  aria-label={`Unpin ${subLink.label}`}
                                >
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                </button>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

export default CollapsibleNavGroup;
