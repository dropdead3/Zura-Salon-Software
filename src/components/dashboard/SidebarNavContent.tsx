import { forwardRef, useEffect, useRef, useImperativeHandle, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useTranslation } from 'react-i18next';

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PopoverTrigger } from '@/components/ui/popover';
import { HoverPopover } from './HoverPopover';
import { SidebarPopoverContent } from './SidebarPopoverContent';
import { useDashboardTheme } from '@/contexts/DashboardThemeContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, Rocket, TrendingUp, Users, LayoutGrid, Briefcase, ArrowLeft, Shield, FlaskConical, PanelLeftClose, ChevronRight } from 'lucide-react';
import { NavBadge } from './NavBadge';
import { OrganizationLogo } from '@/components/brand/OrganizationLogo';
import { SidebarAnnouncementsWidget } from './SidebarAnnouncementsWidget';
import { SidebarGreeting } from './SidebarGreeting';
import { SidebarSyncStatusWidget } from './SidebarSyncStatusWidget';
import { SidebarLockButton } from './SidebarLockButton';
import { SidebarClockButton } from './SidebarClockButton';
import { SidebarFeedbackButtons } from './SidebarFeedbackButtons';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useSidebarLayout, SECTION_LABELS, SECTION_ICONS, DEFAULT_SECTION_ORDER, DEFAULT_LINK_ORDER, isBuiltInSection, getEffectiveHiddenSections, getEffectiveHiddenLinks, anyRoleHasOverrides } from '@/hooks/useSidebarLayout';
import { useAnalyticsSubtabFavorites } from '@/hooks/useAnalyticsSubtabFavorites';
import { useOpsHubFavorites } from '@/hooks/useOpsHubFavorites';
import { getIconByName } from '@/lib/iconResolver';

import { useConnectEntitlement } from '@/hooks/connect/useConnectEntitlement';
import { usePayrollEntitlement } from '@/hooks/payroll/usePayrollEntitlement';
import { useColorBarEntitlement } from '@/hooks/color-bar/useColorBarEntitlement';
import { AccountOwnerOrgSwitcher } from './AccountOwnerOrgSwitcher';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

type PlatformRole = 'platform_owner' | 'platform_admin' | 'platform_support' | 'platform_developer';

interface NavItem {
  href: string;
  label: string;
  labelKey?: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  roles?: string[];
  platformRoles?: PlatformRole[];
}

interface OnboardingProgress {
  completedCount: number;
  totalCount: number;
  percentage: number;
}

interface SidebarNavContentProps {
  mainNavItems: NavItem[];
  growthNavItems: NavItem[];
  statsNavItems: NavItem[];
  housekeepingNavItems: NavItem[];
  managerNavItems: NavItem[];
  websiteNavItems: NavItem[];
  adminOnlyNavItems: NavItem[];
  appsNavItems?: NavItem[];
  platformNavItems?: NavItem[];
  footerNavItems?: NavItem[];
  isPlatformUser?: boolean;
  isMultiOrgOwner?: boolean;
  unreadCount: number;
  roles: string[];
  effectiveIsCoach: boolean;
  filterNavItems: (items: NavItem[]) => NavItem[];
  onNavClick: () => void;
  isOnboardingComplete: boolean;
  onboardingProgress?: OnboardingProgress;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  greeting?: string;
  subtitle?: string;
  firstName?: string;
}

const SIDEBAR_SCROLL_KEY = 'dashboard-sidebar-scroll';

const SidebarNavContent = forwardRef<HTMLElement, SidebarNavContentProps>((
  {
    mainNavItems,
    growthNavItems,
    statsNavItems,
    housekeepingNavItems,
    managerNavItems,
    websiteNavItems,
    adminOnlyNavItems,
    appsNavItems: appsNavItemsProp = [],
    platformNavItems = [],
    footerNavItems = [],
    isPlatformUser = false,
    isMultiOrgOwner = false,
    unreadCount,
    roles,
    effectiveIsCoach,
    filterNavItems,
    onNavClick,
    isOnboardingComplete,
    onboardingProgress,
    isCollapsed = false,
    onToggleCollapse,
    greeting,
    subtitle,
    firstName,
  }, ref) => {
  const { dashPath } = useOrgDashboardPath();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const { resolvedTheme } = useDashboardTheme();
  const internalRef = useRef<HTMLElement>(null);
  const { data: businessSettings } = useBusinessSettings();
  const { data: sidebarLayout } = useSidebarLayout();
  const { favorites: opsHubFavorites } = useOpsHubFavorites();
  const { groupedFavorites, toggleFavorite: toggleSubtabFavorite } = useAnalyticsSubtabFavorites();
  
  const { isEntitled: isConnectEntitled } = useConnectEntitlement();
  const { isEntitled: isPayrollEntitled } = usePayrollEntitlement();
  const { isEntitled: isColorBarEntitled } = useColorBarEntitlement();
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const organizationId = effectiveOrganization?.id;

  const { data: hasPayrollEnrollment } = useQuery({
    queryKey: ['my-payroll-enrollment', user?.id, organizationId],
    queryFn: async () => {
      const { count } = await supabase
        .from('employee_payroll_settings')
        .select('id', { count: 'exact', head: true })
        .eq('employee_id', user!.id)
        .eq('organization_id', organizationId!);
      return (count ?? 0) > 0;
    },
    enabled: !!user?.id && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  // Map section IDs to nav items (for built-in sections)
  // New consolidated sections: myTools (replaces growth+stats), manage (replaces manager), system (replaces adminOnly)
  // Legacy IDs still mapped for backward compat with stored layouts
  const sectionItemsMap = useMemo(() => ({
    main: mainNavItems,
    myTools: [...growthNavItems, ...statsNavItems].filter((item, index, arr) => arr.findIndex(i => i.href === item.href) === index),
    ops: managerNavItems.filter(item => item.href.includes('team-hub')),
    data: managerNavItems.filter(item => item.href.includes('analytics') || item.href.includes('reports')),
    apps: appsNavItemsProp,
    system: adminOnlyNavItems,
    housekeeping: housekeepingNavItems,
    website: websiteNavItems,
    platform: platformNavItems,
    // Legacy mappings
    growth: growthNavItems,
    stats: statsNavItems,
    manager: managerNavItems,
    adminOnly: adminOnlyNavItems,
  }), [mainNavItems, growthNavItems, statsNavItems, housekeepingNavItems, managerNavItems, websiteNavItems, adminOnlyNavItems, appsNavItemsProp, platformNavItems]);

  // Create a map of all nav items by href (for custom sections that can contain any link)
  const allNavItemsByHref = useMemo(() => {
    const allItems = [
      ...mainNavItems,
      ...growthNavItems,
      ...statsNavItems,
      ...housekeepingNavItems,
      ...managerNavItems,
      ...websiteNavItems,
      ...adminOnlyNavItems,
      ...appsNavItemsProp,
      ...platformNavItems,
    ];
    const map: Record<string, NavItem> = {};
    allItems.forEach(item => {
      map[item.href] = item;
    });
    return map;
  }, [mainNavItems, growthNavItems, statsNavItems, housekeepingNavItems, managerNavItems, websiteNavItems, adminOnlyNavItems, appsNavItemsProp, platformNavItems]);

  // Apply custom link ordering to nav items
  const getOrderedItems = (sectionId: string, items: NavItem[]): NavItem[] => {
    const linkOrder = sidebarLayout?.linkOrder?.[sectionId];
    if (!linkOrder || linkOrder.length === 0) return items;
    
    // Sort items based on their position in linkOrder
    return [...items].sort((a, b) => {
      const aIndex = linkOrder.indexOf(a.href);
      const bIndex = linkOrder.indexOf(b.href);
      // Items not in order go to the end
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  };

  // Get section order from layout or use default, filtering out hidden sections (including role-based)
  const sectionOrder = useMemo(() => {
    const order = sidebarLayout?.sectionOrder || DEFAULT_SECTION_ORDER;
    // Get effective hidden sections based on user's roles
    const effectiveHiddenSections = getEffectiveHiddenSections(sidebarLayout, roles);
    return order.filter(id => !effectiveHiddenSections.includes(id));
  }, [sidebarLayout, roles]);

  // Get hidden links map (including role-based visibility)
  const hiddenLinks = useMemo(() => {
    return getEffectiveHiddenLinks(sidebarLayout, roles);
  }, [sidebarLayout, roles]);
  
  // Logo/icon helpers — collapsed now follows theme like expanded
  const orgLogoTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const orgLogoUrl = resolvedTheme === 'dark' ? businessSettings?.logo_dark_url : businessSettings?.logo_light_url;
  const orgIconUrl = resolvedTheme === 'dark' ? businessSettings?.icon_dark_url : businessSettings?.icon_light_url;
  const orgName = businessSettings?.business_name || 'Salon';
  
  // Expose the internal ref
  useImperativeHandle(ref, () => internalRef.current!, []);

  // Track scroll position
  useEffect(() => {
    const nav = internalRef.current;
    if (!nav) return;
    
    const handleScroll = () => {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(nav.scrollTop));
    };
    
    nav.addEventListener('scroll', handleScroll, { passive: true });
    return () => nav.removeEventListener('scroll', handleScroll);
  }, []);

  // Restore scroll position on mount and after navigation
  useEffect(() => {
    const savedPosition = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    if (!savedPosition) return;
    
    const scrollPos = parseInt(savedPosition, 10);
    if (isNaN(scrollPos) || scrollPos === 0) return;

    const restoreScroll = () => {
      if (internalRef.current) {
        internalRef.current.scrollTop = scrollPos;
      }
    };
    
    // Multiple attempts to ensure content is ready
    restoreScroll();
    requestAnimationFrame(restoreScroll);
    const timer1 = setTimeout(restoreScroll, 50);
    const timer2 = setTimeout(restoreScroll, 150);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [location.pathname]);

  // Dynamic label: i18n when labelKey set, role-based for stats, else fallback to label
  const getNavLabel = (item: NavItem): string => {
    if (item.href === '/dashboard/stats') {
      const isAdminUser = roles.includes('admin') || roles.includes('super_admin') || roles.includes('manager');
      return isAdminUser ? t('nav.team_stats') : t('nav.my_stats');
    }
    if (item.labelKey) return t(`nav.${item.labelKey}`);
    return item.label;
  };

  const NavLink = ({ 
    href, 
    label, 
    icon: Icon, 
    badgeCount,
    inFooter = false
  }: { 
    href: string; 
    label: string; 
    icon: React.ComponentType<{ className?: string }>; 
    badgeCount?: number;
    inFooter?: boolean;
  }) => {
    const resolvedHref = dashPath(href.replace(/^\/dashboard/, ''));
    const isExactRoot = resolvedHref === dashPath('') || resolvedHref === dashPath('/');
    const isActive = isExactRoot
      ? location.pathname === resolvedHref
      : location.pathname === resolvedHref || location.pathname.startsWith(resolvedHref + '/');
    const displayLabel = label;
    
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      // Always navigate with a fresh timestamp to trigger state reset on same-route navigation
      navigate(resolvedHref, { state: { navTimestamp: Date.now() } });
      onNavClick();
    };
    
    const linkContent = (
      <a
        href={href}
        onClick={handleClick}
        className={cn(
          "flex items-center gap-3 text-sm font-sans cursor-pointer",
          "transition-all duration-300 ease-out", isCollapsed ? "rounded-full" : "rounded-lg",
          isCollapsed 
            ? cn("px-2 py-2.5 justify-center", inFooter ? "mx-0" : "mx-2")
            : cn("px-3 py-2.5", inFooter ? "mx-0" : "mx-3"),
          isActive 
            ? "bg-muted/80 text-foreground ring-1 ring-border/40 shadow-sm backdrop-blur-sm" 
            : isCollapsed
              ? "text-foreground/60 hover:text-foreground hover:bg-foreground/10"
              : "text-muted-foreground hover:text-foreground hover:bg-foreground/10 hover:translate-x-0.5"
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {!isCollapsed && <span className="flex-1">{displayLabel}</span>}
        {!isCollapsed && badgeCount !== undefined && badgeCount > 0 && (
          <NavBadge count={badgeCount} isActive={isActive} />
        )}
        {isCollapsed && badgeCount !== undefined && badgeCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
        )}
      </a>
    );
    
    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              {linkContent}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-sans">
            {displayLabel}
            {badgeCount !== undefined && badgeCount > 0 && ` (${badgeCount})`}
          </TooltipContent>
        </Tooltip>
      );
    }
    
    return linkContent;
  };

  return (
    <div className={cn("flex flex-col h-full", isCollapsed && resolvedTheme === 'dark' && "sidebar-dark")}>
      {/* Logo & Collapse Toggle */}
      <div className={cn("border-b border-border/40", isCollapsed ? "p-3" : "px-5 py-4")}>
        <div className={cn("flex items-center", isCollapsed ? "flex-col-reverse gap-2" : "justify-between")}>
          <Link to={dashPath('/')} className="block min-w-0">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <OrganizationLogo
                    variant="sidebar-icon"
                    logoUrl={orgLogoUrl}
                    iconUrl={orgIconUrl}
                    theme={orgLogoTheme}
                    alt={orgName}
                    className="h-6 w-auto max-w-[32px]"
                  />
                </TooltipTrigger>
                <TooltipContent side="right">{orgName}</TooltipContent>
              </Tooltip>
            ) : (
              <OrganizationLogo
                variant="sidebar"
                logoUrl={orgLogoUrl}
                theme={orgLogoTheme}
                alt={orgName}
                className="h-7 w-auto max-w-[160px]"
              />
            )}
          </Link>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full bg-muted hover:bg-muted/80 text-foreground/60 hover:text-foreground dark:bg-white/10 dark:hover:bg-white/15 dark:text-white/60 dark:hover:text-white"
                  onClick={onToggleCollapse}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
              onClick={onToggleCollapse}
            >
              <PanelLeftClose className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Animated Greeting - below logo, auto-dismisses after 7s */}
      {!isCollapsed && greeting && firstName && (
        <SidebarGreeting greeting={greeting} subtitle={subtitle} firstName={firstName} />
      )}

      {/* Platform Hub link removed - access via platform routes only */}

      {/* Multi-Org Owner Switcher - shows when user has access to multiple orgs */}
      {isMultiOrgOwner && (
        <div className={cn("border-b border-border", isCollapsed ? "p-2" : "px-4 py-3")}>
          <AccountOwnerOrgSwitcher isCollapsed={isCollapsed} />
        </div>
      )}

      {/* Announcements Widget - at the very top (hide when collapsed) */}
      {!isCollapsed && <SidebarAnnouncementsWidget onNavClick={onNavClick} />}

      {/* Phorest Sync Status Widget moved to header popout */}

      {/* Navigation */}
      <ScrollArea className="flex-1 min-h-0">
        <nav ref={internalRef} className="sidebar-nav pt-4 pb-2 overscroll-none">
        {/* START HERE Priority Section - Only shows when onboarding incomplete (not for super_admin/owners) */}
        {!isOnboardingComplete && !roles.includes('super_admin') && (
          <div className="mb-4">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to={dashPath('/onboarding')}
                    onClick={onNavClick}
                    className={cn(
                      "flex items-center justify-center px-2 py-2.5 mx-2 text-sm font-sans",
                      "transition-all duration-300 ease-out rounded-full",
                      location.pathname === '/dashboard/onboarding'
                        ? "bg-muted/80 text-foreground ring-1 ring-border/40 shadow-sm backdrop-blur-sm" 
                        : "text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                    )}
                  >
                    <Rocket className="w-4 h-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  START HERE {onboardingProgress && `(${onboardingProgress.percentage}%)`}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Link
                to={dashPath('/onboarding')}
                onClick={onNavClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 mx-3 text-sm font-sans",
                  "transition-all duration-300 ease-out rounded-lg",
                  location.pathname === '/dashboard/onboarding'
                    ? "bg-muted/80 text-foreground ring-1 ring-border/40 shadow-sm backdrop-blur-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                )}
              >
                <Rocket className="w-4 h-4" />
                <span className="flex-1 font-display">START HERE</span>
                {onboardingProgress && (
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${onboardingProgress.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {onboardingProgress.percentage}%
                    </span>
                  </div>
                )}
              </Link>
            )}
            <div className={cn("my-3", isCollapsed ? "px-2" : "px-4")}>
              <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
            </div>
          </div>
        )}

        {/* Dynamic Section Rendering Based on Custom Layout */}
        {sectionOrder.map((sectionId, index) => {
          // Check if this is a custom section
          const isCustom = !isBuiltInSection(sectionId);
          
          // Get the items for this section
          let sectionItems: NavItem[];
          
          if (isCustom) {
            // For custom sections, get items from linkOrder using the allNavItemsByHref map
            const customLinks = sidebarLayout?.linkOrder?.[sectionId] || [];
            sectionItems = customLinks
              .map(href => allNavItemsByHref[href])
              .filter((item): item is NavItem => !!item);
          } else {
            sectionItems = sectionItemsMap[sectionId as keyof typeof sectionItemsMap];
          }
          
          if (!sectionItems || sectionItems.length === 0) return null;
          
          // Apply custom link ordering (for built-in sections)
          const orderedItems = isCustom ? sectionItems : getOrderedItems(sectionId, sectionItems);
          
          // First, apply permission-based filtering (security layer)
          const permissionFilteredItems = filterNavItems(orderedItems);
          
          // Then apply dynamic visibility from the configurator (this is the PRIMARY control)
          // The configurator overrides permission-based visibility
          const sectionHiddenLinks = hiddenLinks[sectionId] || [];
          const hasConfiguratorOverrides = anyRoleHasOverrides(sidebarLayout, roles);
          
          // Always enforce role-based filtering first (security layer)
          const roleFilteredItems = orderedItems.filter(item => {
            if (!item.roles || item.roles.length === 0) return true;
            return item.roles.some(r => roles.includes(r));
          });

          // If configurator has overrides for this role, use it as the source of truth
          // Otherwise fall back to permission filtering only
          let visibleItems: typeof roleFilteredItems;
          if (hasConfiguratorOverrides) {
            // Configurator controls visibility within role-appropriate items
            visibleItems = roleFilteredItems.filter(item => !sectionHiddenLinks.includes(item.href));
          } else {
            // No configurator overrides - use permission filtering + role filtering, then apply hidden links
            const permFiltered = permissionFilteredItems.filter(item => {
              if (!item.roles || item.roles.length === 0) return true;
              return item.roles.some(r => roles.includes(r));
            });
            visibleItems = permFiltered.filter(item => !sectionHiddenLinks.includes(item.href));
          }
          
          let filteredItems = visibleItems;
          let shouldShow = filteredItems.length > 0;
          
          // Get section label - use custom name for custom sections
          let sectionLabel: string;
          if (isCustom) {
            sectionLabel = sidebarLayout?.customSections?.[sectionId]?.name || sectionId;
          } else {
            sectionLabel = SECTION_LABELS[sectionId] || sectionId;
          }
          
          // Section-specific logic (only for built-in sections)
          // Note: When configurator has overrides, these are informational only
          // The configurator is the primary control for visibility
          if (sectionId === 'housekeeping') {
            const isSuperAdmin = roles.includes('super_admin');
            // Super admins never see onboarding (it's for staff, not owners)
            // Admins always see it in housekeeping
            // Other roles see it here only when complete (otherwise it's in START HERE)
            if (isSuperAdmin || (!isOnboardingComplete && !roles.includes('admin'))) {
              filteredItems = filteredItems.filter(item => 
                item.href !== '/dashboard/onboarding'
              );
            }
            shouldShow = filteredItems.length > 0;
          }
          
          // For manage and system sections, only apply hardcoded checks 
          // when configurator doesn't have role-specific overrides
          if (!hasConfiguratorOverrides) {
            if (sectionId === 'manage' || sectionId === 'manager' || sectionId === 'ops' || sectionId === 'data') {
              shouldShow = effectiveIsCoach && filteredItems.length > 0;
            }
            
            if (sectionId === 'system' || sectionId === 'adminOnly') {
              shouldShow = (roles.includes('admin') || roles.includes('super_admin')) && filteredItems.length > 0;
            }
          }
          
          // Unified entitlement-based filtering for gated features
          // Maps href suffixes to their entitlement checks
          const ENTITLEMENT_GATES: Array<{ hrefSuffix: string; entitled: boolean }> = [
            { hrefSuffix: '/my-pay', entitled: isPayrollEntitled && hasPayrollEnrollment },
            { hrefSuffix: '/admin/payroll', entitled: isPayrollEntitled },
            { hrefSuffix: '/admin/connect', entitled: isConnectEntitled },
            { hrefSuffix: '/team-chat', entitled: isConnectEntitled },
            { hrefSuffix: '/admin/color-bar-settings', entitled: isColorBarEntitled },
          ];

          filteredItems = filteredItems.filter(item => {
            const gate = ENTITLEMENT_GATES.find(g => item.href.endsWith(g.hrefSuffix));
            return gate ? gate.entitled : true;
          });

          // Apps section: hide if no items remain after entitlement filtering
          if (sectionId === 'apps') {
            shouldShow = filteredItems.length > 0;
          }
          if (filteredItems.length === 0) shouldShow = false;

          // Platform section should NEVER show in org dashboard
          if (sectionId === 'platform') {
            shouldShow = false;
          }
          
          if (!shouldShow) return null;
          
          // Get badge count for specific items
          const getBadgeCount = (href: string) => {
            if (href === '/dashboard' && sectionId === 'main') return unreadCount;
            return undefined;
          };
          
          return (
            <div key={sectionId}>
              {/* Show divider for all sections except the first one */}
              {index > 0 && (
                <div className={cn("my-4", isCollapsed ? "px-2" : "px-4")}>
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                </div>
              )}
              
              {/* Section header */}
              {!isCollapsed && sectionId !== 'main' && sectionId !== 'system' && (
                <div className="px-4 mb-2">
                  {sectionId === 'apps' ? (
                    <Link
                      to={dashPath('/apps')}
                      className="text-xs uppercase tracking-wider text-foreground font-display font-medium hover:text-primary transition-colors inline-flex items-center gap-1"
                    >
                      {sectionLabel}
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  ) : (
                    <p className="text-xs uppercase tracking-wider text-foreground font-display font-medium">
                      {sectionLabel}
                    </p>
                  )}
                </div>
              )}
              
              {/* Links - all sections now render as flat links */}
              {isCollapsed && sectionId !== 'main' ? (
                // Collapsed: single section icon with popover menu (skip for main section)
                (() => {
                  const SectionIcon = SECTION_ICONS[sectionId] || SECTION_ICONS.main;
                  const isAnyActive = filteredItems.some(item => location.pathname === item.href);
                  return (
                    <HoverPopover>
                      <PopoverTrigger asChild>
                        <button
                          className={cn(
                            "flex items-center justify-center px-2 py-2 mx-2 rounded-full",
                            "transition-all duration-300 text-sm",
                            isAnyActive
                              ? "bg-foreground/10 text-foreground"
                              : "text-foreground/50 hover:text-foreground hover:bg-foreground/10"
                          )}
                          style={{ width: 'calc(100% - 16px)' }}
                        >
                          <SectionIcon className="w-4 h-4" />
                        </button>
                      </PopoverTrigger>
                      <SidebarPopoverContent>
                        <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider font-display">
                          {sectionLabel}
                        </p>
                        {/* Ops Hub favorites in collapsed popover */}
                        {sectionId === 'ops' && opsHubFavorites.length > 0 && (
                          <>
                            <div className="mx-3 my-1.5 h-px bg-border/40" />
                            <p className="px-3 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider font-display">
                              Favorites
                            </p>
                            {opsHubFavorites.map((fav) => {
                              const isActive = location.pathname === fav.href || location.pathname.startsWith(fav.href + '/');
                              return (
                                <a
                                  key={fav.href}
                                  href={fav.href}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate(fav.href, { state: { navTimestamp: Date.now() } });
                                    onNavClick();
                                  }}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-sans",
                                    "transition-all duration-300 cursor-pointer",
                                    isActive
                                      ? "bg-muted/80 text-foreground"
                                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                                  )}
                                >
                                  <span className="w-1 h-1 rounded-full bg-current opacity-40 shrink-0" />
                                  <span>{fav.label}</span>
                                </a>
                              );
                            })}
                          </>
                        )}
                      </SidebarPopoverContent>
                    </HoverPopover>
                  );
                })()
              ) : (
                <div className="space-y-1">
                  {filteredItems.map((item) => (
                    <NavLink 
                      key={item.href} 
                      href={item.href}
                      label={getNavLabel(item)}
                      icon={item.icon}
                      badgeCount={getBadgeCount(item.href)}
                    />
                  ))}
                  {/* Ops Hub favorites sub-links */}
                  {sectionId === 'ops' && opsHubFavorites.length > 0 && !isCollapsed && (
                    <div className="space-y-0.5 mt-1">
                      {opsHubFavorites.map((fav) => {
                        const resolvedHref = fav.href;
                        const isActive = location.pathname === resolvedHref || location.pathname.startsWith(resolvedHref + '/');
                        return (
                          <a
                            key={fav.href}
                            href={resolvedHref}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(resolvedHref, { state: { navTimestamp: Date.now() } });
                              onNavClick();
                            }}
                            className={cn(
                              "flex items-center gap-2 pl-8 pr-3 py-1.5 mx-3 text-xs font-sans rounded-md",
                              "transition-all duration-200 cursor-pointer",
                              isActive
                                ? "text-foreground bg-muted/60"
                                : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                            )}
                          >
                            <span className="w-1 h-1 rounded-full bg-current opacity-40 shrink-0" />
                            <span className="truncate">{fav.label}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      </ScrollArea>
      {/* Separator */}
      <div className="mx-3 border-t border-border/40" />

      {/* Fixed Footer Navigation - always at bottom */}
      <div className="mt-auto shrink-0 flex flex-col gap-2 pt-2">
        {/* Beta Badge */}
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mx-2 flex items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/15 p-1.5 cursor-default">
                <FlaskConical className="h-3.5 w-3.5 text-amber-600" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Beta Testing V.1.1</TooltipContent>
          </Tooltip>
        ) : (
          <div className="mx-3 flex items-center justify-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 cursor-default">
              <FlaskConical className="h-3 w-3 text-amber-600" />
              <span className="font-display tracking-widest text-[10px] text-amber-600">BETA TESTING V.1.1</span>
            </div>
          </div>
        )}

        <div className={cn(
          "bg-muted/30 border border-border/50",
          isCollapsed ? "mx-2 p-1 rounded-full" : "mx-3 p-1.5 rounded-lg"
        )}>
          <SidebarFeedbackButtons isCollapsed={isCollapsed} />
        </div>
        <div className={cn(
          "bg-muted/30 border border-border/50",
          isCollapsed ? "mx-2 p-1 rounded-full" : "mx-3 p-1.5 rounded-lg"
        )}>
          <div className={cn(isCollapsed ? "space-y-1" : "space-y-0.5")}>
            <SidebarClockButton isCollapsed={isCollapsed} />
            <SidebarLockButton isCollapsed={isCollapsed} />
          </div>
        </div>
        <div className="h-1" />
      </div>
    </div>
  );
});

SidebarNavContent.displayName = 'SidebarNavContent';

export default SidebarNavContent;
