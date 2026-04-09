import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useHideNumbers } from '@/contexts/HideNumbersContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useUnreadAnnouncements } from '@/hooks/useUnreadAnnouncements';
import { cn } from '@/lib/utils';
import { getAvatarStyle } from '@/lib/avatar-utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationsPanel } from '@/components/dashboard/NotificationsPanel';
import { ThemeToggle } from '@/components/dashboard/ThemeToggle';
import { NextClientIndicator } from '@/components/dashboard/NextClientIndicator';
import { TopBarSearch } from '@/components/dashboard/TopBarSearch';

import { OrganizationSwitcher } from '@/components/platform/OrganizationSwitcher';
import {
  ArrowLeft,
  ArrowRight,
  UserCircle,
  LogOut,
  Eye,
  EyeOff,
  Bell,
  ChevronDown,
  X,
  BookOpen,
  BookX,
} from 'lucide-react';
import { useInfotainerSettings } from '@/hooks/useInfotainers';
import { useNavigationHistory } from '@/contexts/NavigationHistoryContext';
import type { RoleBadgeConfig } from '@/lib/roleBadgeConfig';
import type { Database } from '@/integrations/supabase/types';
import type React from 'react';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


type AppRole = Database['public']['Enums']['app_role'];

// ─── Types ──────────────────────────────────────────────────
interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  roles?: AppRole[];
  platformRoles?: string[];
}

interface SuperAdminTopBarProps {
  sidebarCollapsed: boolean;
  hideFooter?: boolean;
  headerHovered: boolean;
  onHeaderHoverEnd: () => void;
  filterNavItems: (items: NavItem[]) => NavItem[];
  ViewAsToggle: React.ComponentType<{ asMenuItem?: boolean }>;
  HideNumbersToggle: React.ComponentType;
  roleBadges: RoleBadgeConfig[];
  onSearchClick: () => void;
  isSearchOpen?: boolean;
  searchBarRef?: React.RefObject<HTMLButtonElement>;
  // State
  isAdmin: boolean;
  isPlatformUser: boolean;
  isStylistRole: boolean;
  isStylistAssistantRole: boolean;
  isViewingAsUser: boolean;
  viewAsUser: { id: string; full_name: string; photo_url?: string | null } | null;
}

// ─── Nav History Arrows ─────────────────────────────────────
function NavHistoryArrows() {
  const { canGoBack, canGoForward, goBack, goForward } = useNavigationHistory();
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground transition-all duration-150"
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
            className="h-8 w-8 text-muted-foreground hover:text-foreground transition-all duration-150"
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

// ─── SuperAdminTopBar ───────────────────────────────────────
export function SuperAdminTopBar({
  sidebarCollapsed,
  hideFooter,
  headerHovered,
  onHeaderHoverEnd,
  filterNavItems,
  ViewAsToggle,
  HideNumbersToggle,
  roleBadges,
  onSearchClick,
  isSearchOpen,
  isAdmin,
  isPlatformUser,
  isStylistRole,
  isStylistAssistantRole,
  isViewingAsUser,
  viewAsUser,
}: SuperAdminTopBarProps) {
  const { dashPath } = useOrgDashboardPath();
  const { user, signOut } = useAuth();
  const { data: employeeProfile } = useEmployeeProfile();
  const { data: unreadCount = 0 } = useUnreadAnnouncements();
  const { hideNumbers, toggleHideNumbers } = useHideNumbers();
  const { isViewingAs } = useViewAs();
  const { isImpersonating } = useOrganizationContext();
  const { showInfotainers, toggleInfotainers, isToggling } = useInfotainerSettings();
  const location = useLocation();

  const showNextClient = isStylistRole || isStylistAssistantRole;
  const currentUserId = isViewingAsUser && viewAsUser ? viewAsUser.id : user?.id;

  return (
    <div
      className={cn(
        "dashboard-top-bar hidden lg:block z-30 px-3 pt-3 pb-3",
        hideFooter
          ? cn("fixed right-0 z-50 transition-transform duration-300 ease-in-out", isImpersonating ? "top-[44px]" : "top-0")
          : cn("sticky", isImpersonating ? "top-[44px]" : "top-0"),
        hideFooter && !headerHovered && "-translate-y-full",
        hideFooter && headerHovered && "translate-y-0",
        hideFooter && "shrink-0"
      )}
      style={hideFooter ? { left: sidebarCollapsed ? '88px' : '344px' } : undefined}
      onMouseLeave={onHeaderHoverEnd}
    >
      {/* Extended blur zone */}
      <div
        className="absolute inset-0 -bottom-8 backdrop-blur-md pointer-events-none"
        style={{
          maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
        }}
      />

      {/* ── Three-Zone Bar ── */}
      <div className="relative w-full max-w-none flex items-center h-14 px-6 bg-card/80 backdrop-blur-xl backdrop-saturate-150 border border-border rounded-full overflow-x-hidden">

        {/* ── LEFT ZONE: Nav + Search ── */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <NavHistoryArrows />
          {isPlatformUser && location.pathname.startsWith('/platform') && (
            <OrganizationSwitcher compact />
          )}
          <div className="min-w-0 w-full max-w-[280px] lg:max-w-md xl:max-w-lg 2xl:max-w-xl">
            <TopBarSearch onClick={onSearchClick} isOpen={isSearchOpen} />
          </div>
        </div>

        {/* ── CENTER ZONE: Status ── */}
        <div className="flex-1 flex items-center justify-center min-w-0 px-4">
          {showNextClient && (
            <div className="hidden 2xl:flex items-center min-w-0">
              <NextClientIndicator userId={currentUserId} />
            </div>
          )}
        </div>

        {/* ── RIGHT ZONE: Admin Controls (never wraps) ── */}
        <div className="flex items-center gap-2 shrink-0 flex-nowrap">

          {/* Show/Hide $ — always visible */}
          {(isPlatformUser || isAdmin) && (
            <div className="flex">
              <HideNumbersToggle />
            </div>
          )}

          {/* Page Explainers toggle — admin only */}
          {(isPlatformUser || isAdmin) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-full transition-all duration-150",
                    showInfotainers
                      ? "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => toggleInfotainers(!showInfotainers)}
                  disabled={isToggling}
                >
                  {showInfotainers ? <BookOpen className="w-4 h-4" /> : <BookX className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {showInfotainers ? 'Hide page explainers' : 'Show page explainers (resets dismissed)'}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Primary role badge — only highest-priority shown */}
          {(isPlatformUser || isAdmin) && roleBadges.length > 0 && (() => {
            const badge = roleBadges[0];
            const Icon = badge.icon;
            const isStylistAdmin = badge.label === 'Stylist' && isAdmin;
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "h-9 rounded-full inline-flex items-center gap-1.5 text-xs font-medium border transition-all duration-150",
                    "px-3 xl:px-4",
                    badge.colorClasses
                  )}>
                    <Icon className="w-3 h-3" />
                    <span className="hidden 2xl:inline">{badge.label}</span>
                    <span className="hidden xl:inline 2xl:hidden">{badge.shortLabel}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                  {isStylistAdmin
                    ? "This user is an admin who also performs services. Managed via the 'I also perform services' toggle in Profile Settings."
                    : roleBadges.length > 1
                      ? `Roles: ${roleBadges.map(b => b.label).join(', ')}`
                      : badge.label}
                </TooltipContent>
              </Tooltip>
            );
          })()}

          {/* View As — Tier 0, always visible */}
          {isAdmin && <ViewAsToggle />}

          {/* Theme toggle — visible ≥xl, in overflow below */}
          <div className="hidden xl:flex">
            <ThemeToggle />
          </div>

          {/* Notifications — Tier 0 */}
          <NotificationsPanel unreadCount={unreadCount} />

          {/* Avatar menu — Tier 0 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full transition-all duration-150">
                {employeeProfile?.photo_url ? (
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={employeeProfile.photo_url} alt="Profile" className="object-cover" style={getAvatarStyle(employeeProfile)} />
                    <AvatarFallback><UserCircle className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                ) : (
                  <UserCircle className="w-4 h-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border border-border">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              {roleBadges.length > 1 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">Roles</DropdownMenuLabel>
                  {roleBadges.map((badge, i) => {
                    const BadgeIcon = badge.icon;
                    return (
                      <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                        <div className={cn("h-6 rounded-full inline-flex items-center gap-1.5 px-2.5 text-[10px] font-medium border", badge.colorClasses)}>
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={dashPath('/profile')} className="flex items-center gap-2 cursor-pointer">
                  <UserCircle className="w-4 h-4" />
                  View/Edit Profile
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
      </div>
    </div>
  );
}
