import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useHideNumbers } from '@/contexts/HideNumbersContext';
import { useDashboardTheme } from '@/contexts/DashboardThemeContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { DashboardLockProvider, useDashboardLock } from '@/contexts/DashboardLockContext';
import { ZuraNavigationProvider, useZuraNavigationSafe } from '@/contexts/ZuraNavigationContext';
import { NavigationHistoryProvider, useNavigationHistory } from '@/contexts/NavigationHistoryContext';
import { ZuraStickyGuidance } from '@/components/dashboard/ZuraStickyGuidance';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { PLATFORM_NAME } from '@/lib/brand';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
import SidebarNavContent from '@/components/dashboard/SidebarNavContent';
import { KeyboardShortcutsDialog } from '@/components/KeyboardShortcutsDialog';
import { OrganizationSwitcher } from '@/components/platform/OrganizationSwitcher';
import { PlatformContextBanner } from '@/components/platform/PlatformContextBanner';
import { useRoleUtils, getIconComponent } from '@/hooks/useRoleUtils';
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
} from '@/config/dashboardNav';
import Logo from '@/assets/brand-logo-secondary.svg';
import LogoWhite from '@/assets/brand-logo-secondary-white.svg';
import LogoIcon from '@/assets/brand-logo-secondary.svg';
import LogoIconWhite from '@/assets/brand-logo-secondary-white.svg';
// Dark mode is now scoped via DashboardThemeContext
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { NextClientIndicator } from '@/components/dashboard/NextClientIndicator';
import { TopBarSearch } from '@/components/dashboard/TopBarSearch';
import { SuperAdminTopBar } from '@/components/dashboard/SuperAdminTopBar';

import { ChaChingHistoryProvider } from '@/hooks/useChaChingHistory';
import { useChaChingDetector } from '@/hooks/useChaChingDetector';


/** Mounts the cha-ching detector exactly once inside the ChaChingHistoryProvider */
function ChaChingDetectorMount() {
  useChaChingDetector();
  return null;
}

// Role colors/icons now come from useRoleUtils hook

interface DashboardLayoutProps {
  children: React.ReactNode;
  hideFooter?: boolean;
  hideTopBar?: boolean;
  hideSidebar?: boolean;
}

type PlatformRole = 'platform_owner' | 'platform_admin' | 'platform_support' | 'platform_developer';

// Nav items from canonical registry (src/config/dashboardNav.ts)
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
  const zuraCtx = useZuraNavigationSafe();
  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  
  const toggleSidebarCollapsed = () => setSidebarCollapsed(prev => !prev);
  const { user, isCoach, roles: actualRoles, permissions: actualPermissions, hasPermission: actualHasPermission, signOut, isPlatformUser, hasPlatformRoleOrHigher } = useAuth();
  const { isImpersonating, isMultiOrgOwner } = useOrganizationContext();
  const { viewAsRole, setViewAsRole, isViewingAs, viewAsUser, setViewAsUser, isViewingAsUser, clearViewAs } = useViewAs();
  const { hideNumbers, toggleHideNumbers } = useHideNumbers();
  const { data: employeeProfile } = useEmployeeProfile();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const hasZuraGuidance = !!(zuraCtx?.savedState && location.pathname !== '/dashboard');
  const navigate = useNavigate();
  const { resolvedTheme } = useDashboardTheme();
  const { data: businessSettings } = useBusinessSettings();
  const { data: unreadCount = 0 } = useUnreadAnnouncements();
  const { percentage: profileCompletion } = useProfileCompletion();
  const { isComplete: isOnboardingComplete, percentage: onboardingPercentage, tasksCompleted, tasksTotal, handbooksCompleted, handbooksTotal, hasBusinessCard, hasHeadshot } = useOnboardingProgress();
  
  // Check if custom logos are uploaded
  const hasCustomLogo = () => {
    const isDark = resolvedTheme === 'dark';
    const customLogo = isDark ? businessSettings?.logo_dark_url : businessSettings?.logo_light_url;
    return !!customLogo;
  };
  
  // Get the appropriate logo based on theme and settings
  const getLogo = () => {
    const isDark = resolvedTheme === 'dark';
    const customLogo = isDark ? businessSettings?.logo_dark_url : businessSettings?.logo_light_url;
    const fallbackLogo = isDark ? LogoWhite : Logo;
    return customLogo || fallbackLogo;
  };

  // Secondary (icon) logo for scrolled header state
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
    return isDark ? LogoIconWhite : LogoIcon;
  };

  // Scroll-driven logo transition (mobile header)
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

  // Calculate total items for progress display
  const onboardingTotalItems = tasksTotal + handbooksTotal + 2; // +2 for business card and headshot
  const onboardingCompletedItems = tasksCompleted + handbooksCompleted + (hasBusinessCard ? 1 : 0) + (hasHeadshot ? 1 : 0);
  const onboardingProgress = {
    completedCount: onboardingCompletedItems,
    totalCount: onboardingTotalItems,
    percentage: onboardingPercentage,
  };
  const { roles: dbRoles, roleNames: ALL_ROLES, roleLabels: ROLE_LABELS, getRoleBadgeClasses, getRoleIcon, getRoleDescription } = useRoleUtils();

  // Greeting computation for sidebar
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';
  const isLeadershipUser = actualRoles.includes('super_admin') || actualRoles.includes('manager') || (employeeProfile as any)?.is_super_admin;
  const hasStylistRoleForGreeting = actualRoles.includes('stylist') || actualRoles.includes('stylist_assistant') || actualRoles.includes('booth_renter');
  const isFrontDeskForGreeting = actualRoles.includes('receptionist');
  
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

  // Close mobile sidebar on navigation
  const handleNavClick = () => {
    setSidebarOpen(false);
  };
  
  // Fetch team members for user impersonation picker - include test accounts for admin View As feature
  const { data: teamMembers = [] } = useTeamDirectory(undefined, { includeTestAccounts: true });
  const { data: locations = [] } = useLocations();

  // Use simulated role if viewing as a role, or the impersonated user's roles
  const roles = isViewingAsUser && viewAsUser 
    ? viewAsUser.roles 
    : (isViewingAs && viewAsRole ? [viewAsRole] : actualRoles);
  const isAdmin = actualRoles.includes('admin') || actualRoles.includes('super_admin');
  // isCoach should use simulated roles for nav visibility
  const effectiveIsCoach = isViewingAs 
    ? (viewAsRole === 'admin' || viewAsRole === 'manager' || viewAsRole === 'super_admin' || viewAsUser?.roles.some(r => r === 'admin' || r === 'manager' || r === 'super_admin')) 
    : isCoach;

  // Permission checking that respects View As mode
  // When viewing as a role, we need to simulate that role's permissions
  const getSimulatedPermissions = (role: AppRole): string[] => {
    // These are the default permissions for each role - should match database seed
    const rolePermissionMap: Record<AppRole, string[]> = {
      super_admin: [
        'view_command_center', 'view_team_directory', 'view_training', 'access_client_engine',
        'ring_the_bell', 'view_leaderboard', 'view_own_stats', 'view_assistant_schedule',
        'request_assistant', 'manage_assistant_schedule', 'schedule_meetings', 'view_onboarding',
        'view_handbooks', 'view_team_overview', 'manage_announcements', 'view_all_stats',
        'approve_accounts', 'manage_user_roles', 'manage_handbooks', 'manage_homepage_stylists',
        'manage_settings', 'grant_super_admin', 'view_booking_calendar', 'view_all_locations_calendar',
        'view_team_appointments', 'create_appointments', 'add_appointment_notes'
      ],
      admin: [
        'view_command_center', 'view_team_directory', 'view_training', 'access_client_engine',
        'ring_the_bell', 'view_leaderboard', 'view_own_stats', 'view_assistant_schedule',
        'request_assistant', 'manage_assistant_schedule', 'schedule_meetings', 'view_onboarding',
        'view_handbooks', 'view_team_overview', 'manage_announcements', 'view_all_stats',
        'approve_accounts', 'manage_user_roles', 'manage_handbooks', 'manage_homepage_stylists',
        'manage_settings', 'grant_super_admin', 'view_booking_calendar', 'view_all_locations_calendar',
        'view_team_appointments', 'create_appointments', 'add_appointment_notes'
      ],
      manager: [
        'view_command_center', 'view_team_directory', 'view_training', 'access_client_engine',
        'ring_the_bell', 'view_leaderboard', 'view_own_stats', 'view_assistant_schedule',
        'request_assistant', 'schedule_meetings', 'view_onboarding', 'view_handbooks',
        'view_team_overview', 'manage_announcements', 'view_all_stats', 'view_booking_calendar',
        'view_all_locations_calendar', 'view_team_appointments', 'create_appointments', 'add_appointment_notes'
      ],
      stylist: [
        'view_command_center', 'view_team_directory', 'view_training', 'access_client_engine',
        'ring_the_bell', 'view_leaderboard', 'view_own_stats', 'view_assistant_schedule',
        'request_assistant', 'schedule_meetings', 'view_onboarding', 'view_handbooks',
        'view_booking_calendar', 'view_own_appointments'
      ],
      receptionist: [
        'view_command_center', 'view_team_directory', 'view_training', 'view_leaderboard',
        'schedule_meetings', 'view_onboarding', 'view_handbooks', 'view_booking_calendar',
        'view_all_locations_calendar', 'view_team_appointments', 'create_appointments', 'add_appointment_notes'
      ],
      assistant: [ // Legacy
        'view_command_center', 'view_team_directory', 'view_training', 'view_leaderboard',
        'view_assistant_schedule', 'manage_assistant_schedule', 'schedule_meetings',
        'view_onboarding', 'view_handbooks', 'view_booking_calendar', 'view_own_appointments'
      ],
      stylist_assistant: [
        'view_command_center', 'view_team_directory', 'view_training', 'view_leaderboard',
        'view_assistant_schedule', 'manage_assistant_schedule', 'schedule_meetings',
        'view_onboarding', 'view_handbooks', 'view_booking_calendar', 'view_own_appointments'
      ],
      admin_assistant: [
        'view_command_center', 'view_team_directory', 'view_training', 'view_leaderboard',
        'schedule_meetings', 'view_onboarding', 'view_handbooks', 'view_team_overview',
        'view_booking_calendar', 'view_team_appointments'
      ],
      operations_assistant: [
        'view_command_center', 'view_team_directory', 'view_training', 'view_leaderboard',
        'view_assistant_schedule', 'manage_assistant_schedule', 'schedule_meetings',
        'view_onboarding', 'view_handbooks', 'view_booking_calendar', 'view_own_appointments'
      ],
      booth_renter: [
        'view_command_center', 'view_team_directory', 'view_handbooks', 'view_onboarding',
        'view_own_stats', 'view_booking_calendar', 'view_own_appointments'
      ],
      bookkeeper: [
        'view_command_center', 'manage_payroll', 'view_payroll_reports', 'manage_employee_compensation',
        'view_transactions', 'view_sales_analytics', 'view_all_stats', 'view_all_locations_analytics',
        'view_rent_analytics', 'export_financial_data'
      ],
    };
    return rolePermissionMap[role] || [];
  };

  // Get effective permissions based on actual permissions or simulated role
  const effectivePermissions = isViewingAs && viewAsRole 
    ? getSimulatedPermissions(viewAsRole)
    : actualPermissions;

  const hasPermission = (permissionName: string): boolean => {
    return effectivePermissions.includes(permissionName);
  };

  // Compute dynamic nav items based on effective role
  const isStylistRole = roles.includes('stylist');
  const isStylistAssistantRole = roles.includes('stylist_assistant') || roles.includes('assistant');
  const isAdminOrManager = roles.includes('admin') || roles.includes('manager') || roles.includes('super_admin');
  
  // Team Tools items are now in managerNavItems (Management section) - no separate transformation needed

  const dbColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    dbRoles.forEach((r) => {
      if (r.color) map[r.name] = r.color;
    });
    return map;
  }, [dbRoles]);

  // Build multi-role badge array
  const roleBadges = useMemo(
    () => buildRoleBadges(actualRoles, !!employeeProfile?.is_primary_owner, dbColorMap),
    [actualRoles, employeeProfile?.is_primary_owner, dbColorMap]
  );

  // Legacy single-badge helpers kept for any remaining consumers
  const getAccessLabel = () => roleBadges[0]?.label ?? 'Team Member';
  const getAccessBadgeColor = () => roleBadges[0]?.colorClasses ?? '';
  const AccessIcon = roleBadges[0]?.icon ?? User;

  const handleSignOut = async () => {
    clearViewAs(); // Clear all view as modes on sign out
    await signOut();
    navigate('/login');
  };

  // Filter nav items based on permissions AND roles (both must pass if specified)
  const filterNavItems = (items: NavItem[]) => {
    return items.filter(item => {
      // Check platform role restriction first (uses hierarchy)
      if (item.platformRoles && item.platformRoles.length > 0) {
        const hasRequiredPlatformRole = item.platformRoles.some(
          role => hasPlatformRoleOrHigher(role)
        );
        if (!hasRequiredPlatformRole) return false;
      }
      
      // Check permission if specified
      let hasRequiredPermission = true;
      if (item.permission) {
        hasRequiredPermission = hasPermission(item.permission);
      }
      
      // Check roles if specified
      let hasRequiredRole = true;
      if (item.roles && item.roles.length > 0) {
        hasRequiredRole = item.roles.some(role => roles.includes(role));
      }
      
      // Must have both permission (if specified) AND role (if specified)
      return hasRequiredPermission && hasRequiredRole;
    });
  };



  // View As Component for admins - allows viewing dashboard as different roles or specific users
  const ViewAsToggle = ({ asMenuItem = false }: { asMenuItem?: boolean }) => {
    if (!isAdmin) return null;

    // roleIcons and roleDescriptions now come from useRoleUtils

    // Separate test accounts from real users using the utility
    const testAccounts = teamMembers
      .filter(member => member.user_id !== user?.id && isTestAccount(member))
      .filter(member => 
        !userSearch || 
        member.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        member.email?.toLowerCase().includes(userSearch.toLowerCase())
      );

    const realUsers = teamMembers
      .filter(member => member.user_id !== user?.id && !isTestAccount(member))
      .filter(member => 
        !userSearch || 
        member.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        member.email?.toLowerCase().includes(userSearch.toLowerCase())
      );

    // Get display text for button
    const getButtonText = () => {
      if (isViewingAsUser && viewAsUser) {
        return `Viewing as ${viewAsUser.full_name.split(' ')[0]}`;
      }
      if (viewAsRole) {
        return `Viewing as ${ROLE_LABELS[viewAsRole]}`;
      }
      return 'View As';
    };

    return (
      <DropdownMenu onOpenChange={(open) => { if (!open) setUserSearch(''); }}>
        <DropdownMenuTrigger asChild>
          {asMenuItem ? (
            <Button 
              variant="ghost" 
              className={cn(
                "w-full justify-start gap-2 h-auto px-2 py-1.5 rounded-sm font-normal text-sm",
                isViewingAs && "text-amber-500"
              )}
            >
              {isViewingAs ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {getButtonText()}
              {isViewingAs && (
                <span className="ml-auto h-2 w-2 rounded-full bg-amber-500" />
              )}
            </Button>
          ) : (
            <Button 
              variant={isViewingAs ? "default" : "outline"} 
              className={cn(
                "h-9 rounded-full px-4 gap-2 text-xs",
                isViewingAs && "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
              )}
            >
              {isViewingAs ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="hidden sm:inline">{getButtonText()}</span>
              {isViewingAsUser && viewAsUser && (
                <Avatar className="h-5 w-5 border border-white/50">
                  <AvatarImage src={viewAsUser.photo_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-white/20 text-white">
                    {viewAsUser.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              )}
              {viewAsRole && !isViewingAsUser && (
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs px-1.5 py-0 ml-1", getRoleBadgeClasses(viewAsRole))}
                >
                  {ROLE_LABELS[viewAsRole]?.charAt(0)}
                </Badge>
              )}
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0 bg-card border border-border shadow-lg max-h-[70vh] overflow-hidden flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-card p-2 border-b border-border">
              <div className="flex items-center gap-3 px-2 py-3">
                <div className="p-2 bg-muted">
                  <Eye className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="font-display text-sm font-medium">View Dashboard As</p>
                  <p className="text-xs text-muted-foreground">Preview how roles or team members see the app</p>
                </div>
              </div>
              
              {/* Exit button when viewing */}
              {isViewingAs && (
                <DropdownMenuItem
                  onClick={() => clearViewAs()}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 mt-2"
                >
                  <div className="p-1.5 bg-amber-500 text-white">
                    <X className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Exit Preview Mode</p>
                    <p className="text-xs text-amber-600 dark:text-amber-500">Return to your admin view</p>
                  </div>
                </DropdownMenuItem>
              )}
            </div>
            
            {/* Tabbed content */}
            <Tabs defaultValue="roles" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
                <TabsTrigger 
                  value="roles" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 text-xs"
                >
                  Roles
                </TabsTrigger>
                <TabsTrigger 
                  value="test" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 text-xs gap-1"
                >
                  <FlaskConical className="w-3 h-3" />
                  Test ({testAccounts.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="team" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 text-xs"
                >
                  Team
                </TabsTrigger>
              </TabsList>

              {/* Roles Tab */}
              <TabsContent value="roles" className="flex-1 overflow-y-auto m-0 p-2">
                <div className="space-y-1">
                  {ALL_ROLES.map(role => {
                    const RoleIcon = getRoleIcon(role);
                    const isSelected = viewAsRole === role && !isViewingAsUser;
                    return (
                      <DropdownMenuItem
                        key={role}
                        onClick={() => setViewAsRole(role as AppRole)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 cursor-pointer transition-all group",
                          isSelected && "bg-accent"
                        )}
                      >
                        <div className={cn(
                          "p-1.5 transition-all border border-transparent group-hover:border-foreground/30",
                          getRoleBadgeClasses(role)
                        )}>
                          <RoleIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{ROLE_LABELS[role]}</p>
                        </div>
                        {isSelected && (
                          <div className="p-1 bg-amber-500 text-white">
                            <Eye className="w-3 h-3" />
                          </div>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Test Accounts Tab */}
              <TabsContent value="test" className="flex-1 overflow-y-auto m-0 p-2">
                <div className="space-y-1">
                  {testAccounts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No test accounts found
                    </p>
                  ) : (
                    testAccounts.map(member => {
                      const isSelected = viewAsUser?.id === member.user_id;
                      const memberRoles = member.roles as AppRole[];
                      const primaryRole = memberRoles[0];
                      
                      return (
                        <DropdownMenuItem
                          key={member.user_id}
                          onClick={() => setViewAsUser({
                            id: member.user_id,
                            full_name: member.full_name,
                            photo_url: member.photo_url,
                            roles: memberRoles,
                          })}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 cursor-pointer transition-all",
                            isSelected && "bg-accent"
                          )}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.photo_url || undefined} />
                            <AvatarFallback className="text-xs bg-amber-100 text-amber-800">
                              {member.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{member.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {primaryRole ? ROLE_LABELS[primaryRole] : 'No role'}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="p-1 bg-amber-500 text-white">
                              <Eye className="w-3 h-3" />
                            </div>
                          )}
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              {/* Team Members Tab */}
              <TabsContent value="team" className="flex-1 overflow-y-auto m-0 p-0">
                {/* Search input */}
                <div className="p-2 border-b">
                  <Input
                    placeholder="Search team members..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="p-2 space-y-1">
                  {realUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {userSearch ? 'No team members found' : 'No team members available'}
                    </p>
                  ) : (
                    (() => {
                      // Build location lookup
                      const locationMap = new Map(locations.map(l => [l.id, l.name]));
                      
                      // Group users by location_id
                      const groups = new Map<string, typeof realUsers>();
                      realUsers.forEach(member => {
                        const key = member.location_id || '__unassigned__';
                        if (!groups.has(key)) groups.set(key, []);
                        groups.get(key)!.push(member);
                      });

                      // Sort members within each group by role hierarchy then name
                      const getRoleSortOrder = (memberRoles: string[]) => {
                        if (!memberRoles.length) return 999;
                        return Math.min(...memberRoles.map(r => {
                          const idx = ALL_ROLES.indexOf(r);
                          return idx === -1 ? 999 : idx;
                        }));
                      };

                      groups.forEach((members) => {
                        members.sort((a, b) => {
                          const aOrder = getRoleSortOrder(a.roles as string[]);
                          const bOrder = getRoleSortOrder(b.roles as string[]);
                          if (aOrder !== bOrder) return aOrder - bOrder;
                          return (a.full_name || '').localeCompare(b.full_name || '');
                        });
                      });

                      // Order groups: named locations alphabetically, then unassigned last
                      const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
                        if (a === '__unassigned__') return 1;
                        if (b === '__unassigned__') return -1;
                        const nameA = locationMap.get(a) || '';
                        const nameB = locationMap.get(b) || '';
                        return nameA.localeCompare(nameB);
                      });

                      return sortedKeys.map((key, groupIdx) => {
                        const groupName = key === '__unassigned__' ? 'Unassigned' : (locationMap.get(key) || 'Unknown');
                        const members = groups.get(key)!;
                        return (
                          <div key={key}>
                            {/* Section header */}
                            <div className={cn(
                              "font-display text-[10px] tracking-wider text-muted-foreground px-3 py-1.5",
                              groupIdx > 0 && "border-t border-border mt-2 pt-2"
                            )}>
                              {groupName.toUpperCase()}
                            </div>
                            {/* Members */}
                            {members.map(member => {
                              const isSelected = viewAsUser?.id === member.user_id;
                              const memberRoles = member.roles as AppRole[];
                              const primaryRole = memberRoles[0];
                              
                              return (
                                <DropdownMenuItem
                                  key={member.user_id}
                                  onClick={() => setViewAsUser({
                                    id: member.user_id,
                                    full_name: member.full_name,
                                    photo_url: member.photo_url,
                                    roles: memberRoles,
                                  })}
                                  className={cn(
                                    "flex items-center gap-3 px-3 py-2 cursor-pointer transition-all",
                                    isSelected && "bg-accent"
                                  )}
                                >
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={member.photo_url || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {member.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{member.full_name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {primaryRole ? ROLE_LABELS[primaryRole] : 'No role'}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <div className="p-1 bg-amber-500 text-white">
                                      <Eye className="w-3 h-3" />
                                    </div>
                                  )}
                                </DropdownMenuItem>
                              );
                            })}
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Footer with History */}
            <div className="border-t p-2">
              <Dialog>
                <DialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                  >
                    <div className="p-1.5 bg-muted">
                      <History className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">View History</p>
                      <p className="text-xs text-muted-foreground">See all impersonation activity</p>
                    </div>
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Impersonation Audit Log</DialogTitle>
                  </DialogHeader>
                  <ImpersonationHistoryPanel limit={50} />
                </DialogContent>
              </Dialog>
            </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Hide Numbers Toggle Component
  const HideNumbersToggle = () => {
    const { hideNumbers, toggleHideNumbers } = useHideNumbers();
    
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

  return (
    <div className={cn("bg-background", hideFooter ? "h-screen overflow-hidden" : "min-h-screen")}>
      {/* Desktop Sidebar */}
      {!hideSidebar && (
      <aside 
        className={cn(
          "hidden lg:fixed lg:top-3 lg:bottom-3 lg:left-3 lg:z-50 lg:block lg:border lg:backdrop-blur-xl lg:overflow-hidden lg:shadow-sm transition-[width,background-color,border-color,border-radius] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
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

      {/* Content wrapper - flex column when hideFooter for proper height chain */}
      <div className={cn(
        "w-full transition-[padding-left] duration-200 ease-in-out min-w-0 overflow-x-clip",
        hideSidebar ? "lg:pl-0" : (sidebarCollapsed ? "lg:pl-[88px]" : "lg:pl-[344px]"),
        hideFooter && "h-screen flex flex-col"
      )}>
      {/* Platform Incident Banner - above everything */}
      <IncidentBanner />
      {/* Mobile Header */}
      {!hideSidebar && (
      <header className={cn(
        "lg:hidden sticky top-0 z-40 flex items-center justify-between h-16 px-4 border-b border-border bg-background",
        hideFooter && "shrink-0"
      )}>
        <div className="flex items-center gap-3 min-w-0">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SidebarNavContent
                mainNavItems={mainNavItems}
                growthNavItems={growthNavItems}
                statsNavItems={statsNavItems}
                housekeepingNavItems={housekeepingNavItems}
                managerNavItems={managerNavItems}
                websiteNavItems={websiteNavItems}
                adminOnlyNavItems={adminOnlyNavItems}
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
                greeting={sidebarGreeting}
                subtitle={sidebarSubtitle}
                firstName={firstName}
              />
            </SheetContent>
          </Sheet>
          <Link to="/dashboard" className="min-w-0 flex items-center h-8">
            <span className="relative inline-flex items-center h-6 min-w-0">
              {/* Primary logo/text – visible when not scrolled or scrolling up */}
              <span
                className="inline-flex items-center h-6 min-w-0"
                style={{
                  opacity: !headerScrolled || headerScrollingUp ? 1 : 0,
                  transform: headerScrolled && !headerScrollingUp ? 'scale(0.96)' : 'scale(1)',
                  transition: 'opacity 0.35s ease-out, transform 0.35s ease-out',
                }}
              >
                {hasCustomLogo() ? (
                  <ImageWithSkeleton
                    src={getLogo()}
                    alt={businessSettings?.business_name || 'Salon'}
                    className="h-4 w-auto max-w-full object-contain"
                    wrapperClassName="inline-flex"
                  />
                ) : (
                  <span className="font-display text-sm uppercase tracking-wider text-foreground truncate">
                    {businessSettings?.business_name || 'Salon'}
                  </span>
                )}
              </span>
              {/* Secondary (icon) logo – visible when scrolled and scrolling down */}
              <ImageWithSkeleton
                src={getSecondaryLogo()}
                alt={businessSettings?.business_name || 'Salon'}
                className="h-4 w-auto pointer-events-none object-contain"
                wrapperClassName="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  opacity: headerScrolled && !headerScrollingUp ? 1 : 0,
                  transform: headerScrolled && !headerScrollingUp ? 'scale(1) translateY(-50%)' : 'scale(0.96) translateY(-50%)',
                  transition: 'opacity 0.35s ease-out 0.06s, transform 0.35s ease-out 0.06s',
                }}
              />
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {roleBadges.map((badge, i) => {
            const Icon = badge.icon;
            return (
              <Badge key={i} variant="outline" className={cn("text-xs font-medium gap-1.5", badge.colorClasses)}>
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{badge.label}</span>
              </Badge>
            );
          })}
          <ViewAsToggle />
          <ThemeToggle />
          <NotificationsPanel unreadCount={unreadCount} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                {employeeProfile?.photo_url ? (
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={employeeProfile.photo_url} alt="Profile" />
                    <AvatarFallback><UserCircle className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                ) : (
                  <UserCircle className="w-4 h-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard/profile" className="flex items-center gap-2 cursor-pointer">
                  <UserCircle className="w-4 h-4" />
                  View/Edit Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/dashboard/notifications" className="flex items-center gap-2 cursor-pointer">
                  <Bell className="w-4 h-4" />
                  Notification Preferences
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      )}

      {/* Impersonation Indicator Banner */}
      <AnimatePresence>
        {isViewingAs && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-amber-950 text-center text-sm font-medium overflow-hidden shadow-sm relative mx-3 mt-3 rounded-xl"
          >
            {/* Animated background pattern */}
            <motion.div 
              className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)' }}
              animate={{ backgroundPosition: ['0px 0px', '40px 0px'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
            
            <motion.div 
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              exit={{ y: -20 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="flex items-center justify-center gap-3 py-2.5 px-4 relative z-10"
            >
              {/* Pulsing eye indicator */}
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="flex items-center gap-2"
              >
                <div className="p-1.5 bg-amber-950/20 rounded-full">
                  <Eye className="w-4 h-4" />
                </div>
              </motion.div>

              {/* User/Role info */}
              <div className="flex items-center gap-2">
                {isViewingAsUser && viewAsUser ? (
                  <>
                    <Avatar className="h-6 w-6 border-2 border-amber-950/30 shadow-sm">
                      <AvatarImage src={viewAsUser.photo_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-amber-950/20 text-amber-950 font-medium">
                        {viewAsUser.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start leading-tight">
                      <span className="font-medium">{viewAsUser.full_name}</span>
                      <span className="text-[10px] text-amber-950/70">Impersonating User</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-start leading-tight">
                    <span className="font-medium">{viewAsRole ? ROLE_LABELS[viewAsRole] : 'Unknown'}</span>
                    <span className="text-[10px] text-amber-950/70">Viewing as Role</span>
                  </div>
                )}
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-amber-950/20 mx-1" />

              {/* Warning text */}
              <span className="text-xs text-amber-950/80 hidden sm:inline">
                Preview mode – Actions are read-only
              </span>

              {/* Exit button with ESC hint */}
              <Button 
                variant="outline"
                size={tokens.button.inline} 
                onClick={() => clearViewAs()}
                className="h-7 px-3 bg-amber-950 text-amber-100 border-amber-950 hover:bg-amber-900 hover:text-white ml-2 gap-1.5 font-medium shadow-sm"
              >
                <X className="w-3.5 h-3.5" />
                Exit View
                <kbd className="hidden sm:inline-flex items-center justify-center h-4 px-1.5 ml-1 text-[10px] font-mono bg-amber-100/20 text-amber-100 rounded border border-amber-100/30">
                  ESC
                </kbd>
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Platform Organization Context Banner - spans full width above everything */}
      {!hideFooter && <PlatformContextBanner />}

      {/* Custom Landing Page Banner - hide in full-screen mode */}
      {!hideFooter && <CustomLandingPageBanner sidebarCollapsed={sidebarCollapsed} />}

      {/* Hot zone trigger for auto-hide header — suppressed when hideTopBar is true */}
      {hideFooter && !hideTopBar && (
        <div
          className="hidden lg:block fixed top-0 left-0 right-0 h-10 z-50"
          onMouseEnter={() => setHeaderHovered(true)}
        />
      )}

      {/* Desktop Top Bar - Extracted Super Admin Console */}
      {!hideTopBar && (
        <SuperAdminTopBar
          sidebarCollapsed={sidebarCollapsed}
          hideFooter={hideFooter}
          headerHovered={headerHovered}
          onHeaderHoverEnd={() => hideFooter && setHeaderHovered(false)}
          filterNavItems={filterNavItems}
          ViewAsToggle={ViewAsToggle}
          HideNumbersToggle={HideNumbersToggle}
          roleBadges={roleBadges}
          isAdmin={isAdmin}
          isPlatformUser={isPlatformUser}
          isStylistRole={isStylistRole}
          isStylistAssistantRole={isStylistAssistantRole}
          isViewingAsUser={isViewingAsUser}
          viewAsUser={isViewingAsUser && viewAsUser ? { id: viewAsUser.id, full_name: viewAsUser.full_name, photo_url: viewAsUser.photo_url } : null}
        />
      )}

      {/* Main Content */}
      <main className={cn(
        hideFooter ? "flex-1 min-h-0 overflow-hidden flex flex-col" : ""
      )}>
        <div className={cn(
          hideFooter ? "flex-1 min-h-0 flex flex-col" : "min-h-screen flex flex-col",
          isAdmin && "lg:pt-0",
          hasZuraGuidance && !hideFooter && "pb-64"
        )}>
          <div className={cn("w-full max-w-none flex-1 min-h-0 min-w-0", hideFooter && "flex flex-col overflow-hidden")}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${location.pathname}${location.search}`}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
          {/* Dashboard Footer - hidden for full-screen pages */}
          {!hideFooter && (
            <footer className="py-8 text-center mt-auto">
              <div className="mx-auto w-48 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mb-6" />
              <p className="font-display text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                © {new Date().getFullYear()} {businessSettings?.business_name || 'Salon'} · Powered by {PLATFORM_NAME}
              </p>
            </footer>
          )}
        </div>
      </main>
      
      {/* Help FAB */}
      <HelpFAB />
      
      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog />
      </div>
    </div>
  );
}

// Wrapper that adds lock screen functionality
function DashboardLayoutWithLock(props: DashboardLayoutProps) {
  const { isLocked, unlock } = useDashboardLock();
  const [clockInTrigger, setClockInTrigger] = useState(false);

  const handleUnlock = (user?: { user_id: string; display_name: string }) => {
    unlock(user);
    // Clear any previous dismissal so prompt shows again (only if not clocked in)
    sessionStorage.removeItem('clock-in-prompt-dismissed');
    // Trigger clock-in prompt after unlock
    setClockInTrigger(prev => !prev);
  };

  return (
    <>
      <DashboardLayoutInner {...props} />
      <ClockInPromptDialog trigger={clockInTrigger} />
      <AnimatePresence>
        {isLocked && <DashboardLockScreen onUnlock={handleUnlock} />}
      </AnimatePresence>
    </>
  );
}

// Export wrapper component that applies scoped dark mode
export function DashboardLayout(props: DashboardLayoutProps) {
  const { resolvedTheme } = useDashboardTheme();
  const location = useLocation();
  
  // Check if we're on a platform route
  const isPlatformRoute = location.pathname.startsWith('/dashboard/platform');
  
  // Get color theme from localStorage to apply alongside dark class
  // This is needed because dark mode CSS selectors use .dark.theme-{color}
  const colorTheme = typeof window !== 'undefined' 
    ? localStorage.getItem('dd-color-theme') || 'cream'
    : 'cream';
  
  // Sync dark mode and theme classes to document root for proper CSS variable cascade
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme class to root
    root.classList.remove('theme-cream', 'theme-rose', 'theme-sage', 'theme-ocean');
    root.classList.add(`theme-${colorTheme}`);
    
    // Apply dark mode to root - ensures all CSS variables inherit correctly
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Cleanup on unmount (e.g., navigating away from dashboard)
    return () => {
      // Don't remove classes on cleanup to avoid flash during navigation
      // They'll be managed by the next layout component
    };
  }, [resolvedTheme, colorTheme]);
  
  return (
    <ChaChingHistoryProvider>
      <DashboardLockProvider>
        <ZuraNavigationProvider>
          <NavigationHistoryProvider>
            <div className={cn(
              resolvedTheme === 'dark' && 'dark',
              `theme-${colorTheme}`,
              'bg-background text-foreground',
              isPlatformRoute && 'platform-theme platform-gradient-radial min-h-screen'
            )}>
              <DashboardLayoutWithLock {...props} />
              <ChaChingDetectorMount />
              
              <ZuraStickyGuidance />
            </div>
          </NavigationHistoryProvider>
        </ZuraNavigationProvider>
      </DashboardLockProvider>
    </ChaChingHistoryProvider>
  );
}
