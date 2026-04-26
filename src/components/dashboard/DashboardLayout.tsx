import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useEffectiveRoles } from '@/hooks/useEffectiveUser';
import { useHideNumbers } from '@/contexts/HideNumbersContext';
import { useDashboardTheme } from '@/contexts/DashboardThemeContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { DashboardLockProvider, useDashboardLock } from '@/contexts/DashboardLockContext';
import { useAutoLock } from '@/hooks/useAutoLock';
import { useColorTheme } from '@/hooks/useColorTheme';
import { useOrgThemeReset } from '@/hooks/useOrgThemeReset';
import { ZuraNavigationProvider, useZuraNavigationSafe } from '@/contexts/ZuraNavigationContext';
import { NavigationHistoryProvider, useNavigationHistory } from '@/contexts/NavigationHistoryContext';
import { ZuraStickyGuidance } from '@/components/dashboard/ZuraStickyGuidance';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { PLATFORM_NAME } from '@/lib/brand';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUnreadAnnouncements } from '@/hooks/useUnreadAnnouncements';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { NotificationsPanel } from '@/components/dashboard/NotificationsPanel';
import { ThemeToggle } from '@/components/dashboard/ThemeToggle';
import { PhorestSyncPopout } from '@/components/dashboard/PhorestSyncPopout';
import { ImpersonationHistoryPanel } from '@/components/dashboard/ImpersonationHistoryPanel';
import { CustomLandingPageBanner } from '@/components/dashboard/CustomLandingPageBanner';
import { IncidentBanner } from '@/components/dashboard/IncidentBanner';
import { HelpFAB } from '@/components/dashboard/HelpFAB';
import { DashboardLockScreen } from '@/components/dashboard/DashboardLockScreen';
import { ClockInPromptDialog } from '@/components/dashboard/ClockInPromptDialog';
import { KeyboardShortcutsDialog } from '@/components/KeyboardShortcutsDialog';

import { BackfillWelcomeBanner } from '@/components/onboarding/BackfillWelcomeBanner';
import { InitialSetupGateBanner } from '@/components/onboarding/setup/InitialSetupGateBanner';
import { useBackfillTrigger } from '@/hooks/onboarding/useBackfillTrigger';
import SidebarNavContent from '@/components/dashboard/SidebarNavContent';

import { OrganizationSwitcher } from '@/components/platform/OrganizationSwitcher';
import { GodModeBar } from '@/components/dashboard/GodModeBar';
import { useRoleUtils, getIconComponent } from '@/hooks/useRoleUtils';
import { useRoles, ROLE_CATEGORIES } from '@/hooks/useRoles';
import { getRoleIconComponent } from '@/components/dashboard/RoleIconPicker';
import { buildRoleBadges, type RoleBadgeConfig } from '@/lib/roleBadgeConfig';
import { useTeamDirectory, useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useLocations } from '@/hooks/useLocations';
import { isTestAccount } from '@/utils/testAccounts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Database } from '@/integrations/supabase/types';
import { ImageWithSkeleton } from '@/components/ui/image-skeleton';

type AppRole = Database['public']['Enums']['app_role'];
import {
  LayoutDashboard,
  Target,
  Trophy,
  Video,
  BarChart3,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  Bell,
  ChevronDown,
  X,
  CalendarClock,
  UserCircle,
  Contact,
  Globe,
  UserPlus,
  Shield,
  Eye,
  EyeOff,
  UserCheck,
  Crown,
  Scissors,
  Headset,
  HandHelping,
  User,
  ExternalLink,
  Quote,
  Images,
  Layers,
  MapPin,
  ClipboardList,
  Cake,
  History,
  AlertTriangle,
  CreditCard,
  Camera,
  Briefcase,
  GraduationCap,
  Pause,
  FlaskConical,
  Link2,
  DollarSign,
  CalendarDays,
  PanelLeftClose,
  ChevronRight,
  Flag,
  Sparkles,
  BookOpen,
  TrendingUp,
  LayoutGrid,
  Terminal,
  Building2,
  Upload,
  Wallet,
  Store,
  Receipt,
  ArrowLeftRight,
  ArrowLeft,
  ArrowRight,
  Gift,
  MessageSquare,
  MoreHorizontal,
  RefreshCw,
  HeartPulse,
  Rocket,
} from 'lucide-react';
import {
  mainNavItems as mainNavFromConfig,
  growthNavItems as growthNavFromConfig,
  statsNavItems as statsNavFromConfig,
  housekeepingNavItems as housekeepingNavFromConfig,
  managerNavItems as managerNavFromConfig,
  adminOnlyNavItems as adminOnlyNavFromConfig,
  footerNavItems as footerNavFromConfig,
  websiteNavItems as websiteNavFromConfig,
  appsNavItems as appsNavFromConfig,
} from '@/config/dashboardNav';
import { DEFAULT_ORG_LOGO_DARK, DEFAULT_ORG_LOGO_LIGHT } from '@/lib/platform-assets';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { NextClientIndicator } from '@/components/dashboard/NextClientIndicator';
import { TopBarSearch } from '@/components/dashboard/TopBarSearch';
import { SuperAdminTopBar } from '@/components/dashboard/SuperAdminTopBar';
import { ViewAsPopover } from '@/components/dashboard/ViewAsPopover';
import { ZuraCommandSurface } from '@/components/command-surface/ZuraCommandSurface';
import { useCommandMenu } from '@/hooks/useCommandMenu';

import { ChaChingHistoryProvider } from '@/hooks/useChaChingHistory';
import { useChaChingDetector } from '@/hooks/useChaChingDetector';


/** Mounts the cha-ching detector exactly once inside the ChaChingHistoryProvider */
function ChaChingDetectorMount() {
  useChaChingDetector();
  return null;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  hideFooter?: boolean;
  hideTopBar?: boolean;
  hideSidebar?: boolean;
}

type PlatformRole = 'platform_owner' | 'platform_admin' | 'platform_support' | 'platform_developer';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  roles?: AppRole[];
  platformRoles?: PlatformRole[];
}

const mainNavItems: NavItem[] = mainNavFromConfig;
const housekeepingNavItems: NavItem[] = housekeepingNavFromConfig;
const growthNavItems: NavItem[] = growthNavFromConfig;
const statsNavItems: NavItem[] = statsNavFromConfig;
const managerNavItems: NavItem[] = managerNavFromConfig;
const adminOnlyNavItems: NavItem[] = adminOnlyNavFromConfig;
const footerNavItems: NavItem[] = footerNavFromConfig;
const websiteNavItems: NavItem[] = websiteNavFromConfig;
const appsNavItems: NavItem[] = appsNavFromConfig;

const SIDEBAR_COLLAPSED_KEY = 'dashboard-sidebar-collapsed';

const SCROLL_THRESHOLD = 50;


function NavHistoryArrows() {
  const { canGoBack, canGoForward, goBack, goForward } = useNavigationHistory();
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            disabled={!canGoBack}
            onClick={goBack}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Back</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            disabled={!canGoForward}
            onClick={goForward}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Forward</TooltipContent>
      </Tooltip>
    </>
  );
}

function DashboardLayoutInner({ children, hideFooter, hideTopBar, hideSidebar }: DashboardLayoutProps) {
  // Global color theme sync — ensures saved theme is applied on every dashboard route
  useColorTheme();
  // Theme Governance — clear stale brand vars/classes on org switch so the
  // next org's identity paints cleanly with no flash of the previous tenant.
  useOrgThemeReset();
  // Silently backfill setup for legacy orgs (idempotent, runs once per browser)
  useBackfillTrigger();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [headerHovered, setHeaderHovered] = useState(false);
  const [headerScrollingUp, setHeaderScrollingUp] = useState(true);
  
  const lastScrollY = useRef(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    }
    return false;
  });
  const [userSearch, setUserSearch] = useState('');
  const { open: commandOpen, setOpen: setCommandOpen } = useCommandMenu();
  const searchBarRef = useRef<HTMLButtonElement>(null);
  const zuraCtx = useZuraNavigationSafe();
  
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  
  const toggleSidebarCollapsed = () => setSidebarCollapsed(prev => !prev);

  const prevCollapseRef = useRef<boolean | null>(null);

  const { user, isCoach, roles: actualRoles, permissions: actualPermissions, hasPermission: actualHasPermission, signOut, isPlatformUser, hasPlatformRoleOrHigher } = useAuth();
  const { isImpersonating, isMultiOrgOwner } = useOrganizationContext();

  // Set CSS custom property on documentElement so portaled components (Sheet, Dialog) respect God Mode bar
  useEffect(() => {
    document.documentElement.style.setProperty('--god-mode-offset', isImpersonating ? '44px' : '0px');
  }, [isImpersonating]);
  const { viewAsRole, setViewAsRole, isViewingAs, viewAsUser, setViewAsUser, isViewingAsUser, clearViewAs } = useViewAs();
  const { hideNumbers, toggleHideNumbers } = useHideNumbers();
  const { data: employeeProfile } = useEmployeeProfile();
  const location = useLocation();

  // Auto-collapse sidebar on schedule route for maximum grid visibility
  useEffect(() => {
    const isSchedule = location.pathname.includes('/schedule');
    if (isSchedule && prevCollapseRef.current === null) {
      prevCollapseRef.current = sidebarCollapsed;
      setSidebarCollapsed(true);
    } else if (!isSchedule && prevCollapseRef.current !== null) {
      setSidebarCollapsed(prevCollapseRef.current);
      prevCollapseRef.current = null;
    }
  }, [location.pathname]);

  const reduceMotion = useReducedMotion();
  const hasZuraGuidance = !!(zuraCtx?.savedState && location.pathname !== '/dashboard');
  const navigate = useNavigate();
  const { resolvedTheme } = useDashboardTheme();
  const { data: businessSettings } = useBusinessSettings();
  const { data: unreadCount = 0 } = useUnreadAnnouncements();
  const { percentage: profileCompletion } = useProfileCompletion();
  const { isComplete: isOnboardingComplete, percentage: onboardingPercentage, tasksCompleted, tasksTotal, handbooksCompleted, handbooksTotal, hasBusinessCard, hasHeadshot } = useOnboardingProgress();
  
  const hasCustomLogo = () => {
    const isDark = resolvedTheme === 'dark';
    const customLogo = isDark ? businessSettings?.logo_dark_url : businessSettings?.logo_light_url;
    return !!customLogo;
  };
  
  const getLogo = () => {
    const isDark = resolvedTheme === 'dark';
    const customLogo = isDark ? businessSettings?.logo_dark_url : businessSettings?.logo_light_url;
    const fallbackLogo = isDark ? DEFAULT_ORG_LOGO_DARK : DEFAULT_ORG_LOGO_LIGHT;
    return customLogo || fallbackLogo;
  };

  const hasCustomIcon = () => {
    const isDark = resolvedTheme === 'dark';
    const customIcon = isDark ? businessSettings?.icon_dark_url : businessSettings?.icon_light_url;
    return !!customIcon;
  };
  const getSecondaryLogo = () => {
    const isDark = resolvedTheme === 'dark';
    if (hasCustomIcon()) {
      return isDark ? businessSettings?.icon_dark_url : businessSettings?.icon_light_url;
    }
    return isDark ? DEFAULT_ORG_LOGO_DARK : DEFAULT_ORG_LOGO_LIGHT;
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < lastScrollY.current || currentScrollY < SCROLL_THRESHOLD) {
        setHeaderScrollingUp(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > SCROLL_THRESHOLD) {
        setHeaderScrollingUp(false);
      }
      lastScrollY.current = currentScrollY;
      setHeaderScrolled(currentScrollY > SCROLL_THRESHOLD);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const onboardingTotalItems = tasksTotal + handbooksTotal + 2; 
  const onboardingCompletedItems = tasksCompleted + handbooksCompleted + (hasBusinessCard ? 1 : 0) + (hasHeadshot ? 1 : 0);
  const onboardingProgress = {
    completedCount: onboardingCompletedItems,
    totalCount: onboardingTotalItems,
    percentage: onboardingPercentage,
  };
  const { roles: dbRoles, roleNames: ALL_ROLES, roleLabels: ROLE_LABELS, getRoleBadgeClasses, getRoleIcon, getRoleDescription } = useRoleUtils();

  // Greeting + role gates must reflect the IMPERSONATED identity (complete UX
  // simulation doctrine — see mem://features/god-mode-governance). The only
  // chrome that should ever leak the real identity is the God Mode bar.
  const effectiveRolesForGreeting = useEffectiveRoles();
  const firstName = (employeeProfile?.full_name?.split(' ')[0])
    || user?.user_metadata?.full_name?.split(' ')[0]
    || 'there';
  const isLeadershipUser = isImpersonating
    || effectiveRolesForGreeting.includes('super_admin')
    || effectiveRolesForGreeting.includes('admin')
    || effectiveRolesForGreeting.includes('manager');
  const hasStylistRoleForGreeting = effectiveRolesForGreeting.includes('stylist') || effectiveRolesForGreeting.includes('stylist_assistant') || effectiveRolesForGreeting.includes('booth_renter');
  const isFrontDeskForGreeting = effectiveRolesForGreeting.includes('receptionist');
  
  const greetingPool = useMemo(() => {
    const ROLE_MESSAGES = {
      leadership: {
        greetings: ["Welcome back,", "Ready to lead,", "Let's build momentum,", "Great things ahead,", "Another strong day,", "Let's make it count,"],
        subtitles: ["Here's what's happening across your operations", "Your team is set up for a strong day", "The numbers are telling a story", "Let's see where things stand", "Everything's moving in the right direction", "Here's your snapshot for today"],
      },
      stylist: {
        greetings: ["Welcome back,", "Good to see you,", "You're on a roll,", "Another great day ahead,", "Let's make it a great one,", "Time to create,"],
        subtitles: ["Here's what's on your schedule", "Your clients are going to love today", "Let's keep the momentum going", "You're set up for a strong day", "Here's your lineup for today", "Let's make every appointment count"],
      },
      frontDesk: {
        greetings: ["Welcome back,", "Good to see you,", "The front desk is yours,", "Another great day ahead,", "Let's keep things running smooth,", "Ready to roll,"],
        subtitles: ["Here's what's coming in today", "The schedule is looking good", "Let's keep the flow going", "You're set up for a smooth day", "Here's your snapshot for today", "Everything's on track"],
      },
      default: {
        greetings: ["Welcome back,", "Good to see you,", "Another great day ahead,", "Let's make it count,", "You're on a roll,", "Great things ahead,"],
        subtitles: ["Here's what's happening today", "Let's keep the momentum going", "You're set up for a strong day", "Everything's moving in the right direction", "Here's your snapshot for today", "Let's see where things stand"],
      },
    };
    if (isLeadershipUser) return ROLE_MESSAGES.leadership;
    if (hasStylistRoleForGreeting) return ROLE_MESSAGES.stylist;
    if (isFrontDeskForGreeting) return ROLE_MESSAGES.frontDesk;
    return ROLE_MESSAGES.default;
  }, [isLeadershipUser, hasStylistRoleForGreeting, isFrontDeskForGreeting]);

  const [sidebarGreeting] = useState(() => greetingPool.greetings[Math.floor(Math.random() * greetingPool.greetings.length)]);
  const [sidebarSubtitle] = useState(() => greetingPool.subtitles[Math.floor(Math.random() * greetingPool.subtitles.length)]);

  const handleNavClick = () => {
    setSidebarOpen(false);
  };
  
  const { data: teamMembers = [] } = useTeamDirectory(undefined, { includeTestAccounts: true });
  const { data: locations = [] } = useLocations();

  const roles = isViewingAsUser && viewAsUser 
    ? viewAsUser.roles 
    : (isViewingAs && viewAsRole ? [viewAsRole] : actualRoles);
  const isAdmin = actualRoles.includes('admin') || actualRoles.includes('super_admin');
  const effectiveIsCoach = isViewingAs 
    ? (viewAsRole === 'admin' || viewAsRole === 'manager' || viewAsRole === 'super_admin' || viewAsUser?.roles.some(r => r === 'admin' || r === 'manager' || r === 'super_admin')) 
    : isCoach;

  const hasPermission = (permission: string) => {
    if (isViewingAsUser && viewAsUser) {
      return true;
    }
    return actualHasPermission(permission);
  };

  const filterNavItems = (items: NavItem[]) => {
    return items;
  };

  const HideNumbersToggle = ({ iconOnly = false }: { iconOnly?: boolean } = {}) => {
    const { hideNumbers, toggleHideNumbers } = useHideNumbers();

    if (iconOnly) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground transition-all duration-150"
              onClick={toggleHideNumbers}
              aria-label={hideNumbers ? 'Show monetary values' : 'Hide monetary values'}
            >
              {hideNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {hideNumbers ? 'Show monetary values' : 'Hide monetary values'}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            className="h-9 rounded-full px-4 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary"
            onClick={toggleHideNumbers}
          >
            {hideNumbers ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            <span className="text-xs">Show/hide $</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {hideNumbers ? 'Show numbers' : 'Hide numbers'}
        </TooltipContent>
      </Tooltip>
    );
  };

  const isPrimaryOwner = (employeeProfile as any)?.is_primary_owner ?? false;
  const isSuperAdmin = (employeeProfile as any)?.is_super_admin ?? false;
  const canImpersonateTeam = isSuperAdmin || isPrimaryOwner;
  const roleBadges = buildRoleBadges(roles as AppRole[], isPrimaryOwner);

  const ViewAsToggle = () => {
    if (!canImpersonateTeam) return null;
    return <ViewAsPopover />;
  };

  const { isLocked, unlock } = useDashboardLock();
  useAutoLock();

  // Compute sidebar offset for dialog centering (half the sidebar's occupied width)
  const sidebarOffset = hideSidebar ? '0px' : sidebarCollapsed ? '48px' : '170px';

  return (
    <div
      className={cn(
        // bg-background removed — let html mesh gradient (body::before) show through
        "transition-[padding-top] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        hideFooter ? "h-screen overflow-hidden flex flex-col" : "min-h-screen",
        isImpersonating && "pt-[44px] god-mode-active"
      )}
      style={{ '--sidebar-offset': sidebarOffset } as React.CSSProperties}
    >
      {/* God Mode Bar — system-level layer above everything */}
      <GodModeBar />

      {/* Command Surface (⌘K) */}
      <ZuraCommandSurface open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Dashboard Top Bar — search, nav arrows, account, view toggles */}
      {!hideTopBar && (
        <SuperAdminTopBar
          sidebarCollapsed={sidebarCollapsed}
          hideFooter={hideFooter}
          headerHovered={headerHovered}
          onHeaderHoverEnd={() => setHeaderHovered(false)}
          filterNavItems={filterNavItems}
          ViewAsToggle={ViewAsToggle}
          HideNumbersToggle={HideNumbersToggle}
          roleBadges={roleBadges}
          onSearchClick={() => setCommandOpen(true)}
          isSearchOpen={commandOpen}
          searchBarRef={searchBarRef}
          isAdmin={isAdmin}
          isPlatformUser={isPlatformUser}
          isStylistRole={roles.includes('stylist') || roles.includes('booth_renter')}
          isStylistAssistantRole={roles.includes('stylist_assistant')}
          isViewingAsUser={isViewingAsUser}
          viewAsUser={viewAsUser as any}
        />
      )}

      {!hideSidebar && (
      <aside 
        className={cn(
          "hidden lg:fixed lg:bottom-3 lg:left-3 lg:z-[60] lg:block lg:border lg:backdrop-blur-xl lg:overflow-hidden lg:shadow-sm transition-[width,top,background-color,border-color,border-radius] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isImpersonating ? "lg:top-[56px]" : "lg:top-3",
          sidebarCollapsed
            ? "lg:bg-card/80 lg:backdrop-saturate-150 lg:border-border lg:rounded-[32px]"
            : "lg:bg-card/80 lg:backdrop-saturate-150 lg:border-border lg:rounded-xl",
          sidebarCollapsed ? "lg:w-16" : "lg:w-80"
        )}
      >
        <SidebarNavContent
          mainNavItems={mainNavItems}
          growthNavItems={growthNavItems}
          statsNavItems={statsNavItems}
          housekeepingNavItems={housekeepingNavItems}
          managerNavItems={managerNavItems}
          websiteNavItems={websiteNavItems}
          adminOnlyNavItems={adminOnlyNavItems}
          appsNavItems={appsNavItems}
          footerNavItems={footerNavItems}
          isPlatformUser={isPlatformUser}
          isMultiOrgOwner={isMultiOrgOwner}
          unreadCount={unreadCount}
          roles={roles}
          effectiveIsCoach={effectiveIsCoach}
          filterNavItems={filterNavItems}
          onNavClick={handleNavClick}
          isOnboardingComplete={isOnboardingComplete}
          onboardingProgress={onboardingProgress}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapsed}
          greeting={sidebarGreeting}
          subtitle={sidebarSubtitle}
          firstName={firstName}
        />
      </aside>
      )}

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
              style={isImpersonating ? { top: 44 } : undefined}
              onClick={() => setSidebarOpen(false)}
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300, mass: 0.8 }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-border bg-card/95 shadow-2xl backdrop-blur-xl lg:hidden"
              style={isImpersonating ? { top: 44 } : undefined}
            >
              <div className="h-full overflow-hidden">
                <SidebarNavContent
                  mainNavItems={mainNavItems}
                  growthNavItems={growthNavItems}
                  statsNavItems={statsNavItems}
                  housekeepingNavItems={housekeepingNavItems}
                  managerNavItems={managerNavItems}
                  websiteNavItems={websiteNavItems}
                  adminOnlyNavItems={adminOnlyNavItems}
                  appsNavItems={appsNavItems}
                  footerNavItems={footerNavItems}
                  isPlatformUser={isPlatformUser}
                  isMultiOrgOwner={isMultiOrgOwner}
                  unreadCount={unreadCount}
                  roles={roles}
                  effectiveIsCoach={effectiveIsCoach}
                  filterNavItems={filterNavItems}
                  onNavClick={handleNavClick}
                  isOnboardingComplete={isOnboardingComplete}
                  onboardingProgress={onboardingProgress}
                  isCollapsed={false}
                  onToggleCollapse={toggleSidebarCollapsed}
                  greeting={sidebarGreeting}
                  subtitle={sidebarSubtitle}
                  firstName={firstName}
                />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className={cn(
        "flex-1 flex flex-col transition-[margin] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
        hideFooter ? "min-h-0 overflow-hidden" : "min-h-screen",
        !hideSidebar && (sidebarCollapsed ? "lg:ml-24" : "lg:ml-[340px]")
      )}>
        <div className={cn(`flex-1 p-4 lg:px-8 lg:pt-4 ${hideFooter ? 'lg:pb-4' : 'lg:pb-8'}`, hideFooter && "flex min-h-0 flex-col overflow-hidden")}>
          <BackfillWelcomeBanner />
          <InitialSetupGateBanner />
          {children}
        </div>
      </main>

      {/* Floating & overlay components */}
      <HelpFAB />
      {isLocked && !isImpersonating && <DashboardLockScreen onUnlock={unlock} />}
      <ClockInPromptDialog />
      
      
      {hasZuraGuidance && <ZuraStickyGuidance />}
    </div>
  );
}

export function DashboardLayout(props: DashboardLayoutProps) {
  return (
    <DashboardLockProvider>
      <ZuraNavigationProvider>
        <NavigationHistoryProvider>
          <ChaChingHistoryProvider>
            <ChaChingDetectorMount />
            <DashboardLayoutInner {...props} />
          </ChaChingHistoryProvider>
        </NavigationHistoryProvider>
      </ZuraNavigationProvider>
    </DashboardLockProvider>
  );
}
