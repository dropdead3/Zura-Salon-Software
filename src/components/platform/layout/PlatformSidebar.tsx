import { useLocation, useNavigate } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Headphones,
  Code,
  Shield,
} from 'lucide-react';
import { platformNavGroups } from '@/config/platformNav';
import { cn } from '@/lib/utils';
import { getAvatarStyle } from '@/lib/avatar-utils';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { PlatformLogo } from '@/components/brand/PlatformLogo';
import { usePlatformTheme } from '@/contexts/PlatformThemeContext';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { usePlatformPresenceContext } from '@/contexts/PlatformPresenceContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OnlineIndicator } from '../ui/OnlineIndicator';
import { PlatformBadge } from '../ui/PlatformBadge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import type { PlatformRole } from '@/hooks/usePlatformRoles';

const roleConfig: Record<PlatformRole, { label: string; icon: React.ComponentType<{ className?: string }>; variant: 'warning' | 'info' | 'success' | 'primary' }> = {
  platform_owner: { label: 'Owner', icon: Crown, variant: 'warning' },
  platform_admin: { label: 'Admin', icon: Shield, variant: 'info' },
  platform_support: { label: 'Support', icon: Headphones, variant: 'success' },
  platform_developer: { label: 'Developer', icon: Code, variant: 'primary' },
};

const SIDEBAR_COLLAPSED_KEY = 'platform-sidebar-collapsed';

export function PlatformSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasPlatformRoleOrHigher, platformRoles } = useAuth();
  const { resolvedTheme } = usePlatformTheme();
  const { data: profile } = useEmployeeProfile();
  const { isConnected } = usePlatformPresenceContext();
  
  const primaryRole = platformRoles[0] as PlatformRole | undefined;
  const roleInfo = primaryRole ? roleConfig[primaryRole] : null;
  
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(collapsed));
  }, [collapsed]);

  const getInitials = () => {
    const name = profile?.full_name || profile?.display_name || user?.email;
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Filter groups to only show items the user has access to
  const visibleGroups = platformNavGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (!item.platformRoles || item.platformRoles.length === 0) return true;
        return item.platformRoles.some(role => hasPlatformRoleOrHigher(role));
      }),
    }))
    .filter(group => group.items.length > 0);

  const logoTheme = resolvedTheme === 'dark' ? 'dark' : 'light';

  return (
    <aside
      className={cn(
        'fixed left-3 top-3 bottom-3 z-40 flex flex-col transition-all duration-300',
        'rounded-[22px]',
        collapsed ? 'w-16' : 'w-56',
        'bg-[hsl(var(--platform-sidebar-bg)/0.85)] backdrop-blur-xl',
        'border border-[hsl(var(--platform-border)/0.3)]',
        'shadow-xl shadow-black/10'
      )}
    >
      {/* Logo / Header with collapse toggle */}
      <div className={cn(
        'flex h-[60px] items-center justify-between px-4 shrink-0',
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <PlatformLogo variant="sidebar" theme={logoTheme} className="h-8" />
          </div>
        )}
        {collapsed && (
          <div className="mx-auto">
            <PlatformLogo variant="sidebar-icon" theme={logoTheme} className="h-8 w-8" />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-md active:scale-90 transition-all duration-150 text-[hsl(var(--platform-foreground-subtle))] hover:text-[hsl(var(--platform-foreground))] hover:bg-[hsl(var(--platform-bg-hover))]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsed(false)}
                className="absolute -right-3 top-[18px] z-50 p-1 rounded-full border shadow-sm active:scale-90 transition-all duration-150 hover:shadow-md hover:scale-105 bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border))] text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] hover:bg-[hsl(var(--platform-bg-hover))]"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Header fade divider */}
      <div className="h-px mx-3 shrink-0 bg-gradient-to-r from-transparent via-[hsl(var(--platform-border)/0.6)] to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto relative">
        <div className={cn('py-3 space-y-4', collapsed ? 'px-1' : 'px-2')}>
          {visibleGroups.map((group, groupIndex) => (
            <div key={group.label}>
              {/* Section label */}
              {!collapsed && (
                <div className="px-3 pb-1.5 font-display text-[10px] tracking-[0.12em] uppercase transition-colors duration-200 text-[hsl(var(--platform-foreground-subtle))]">
                  {group.label}
                </div>
              )}

              {/* Collapsed: thin separator between groups */}
              {collapsed && groupIndex > 0 && (
                <div className="h-px mx-2 mb-2 bg-[hsl(var(--platform-border)/0.4)]" />
              )}

              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  
                  const linkContent = (
                    <NavLink
                      to={item.href}
                      className={cn(
                        'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                        'transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] will-change-transform',
                        collapsed && 'justify-center px-2',
                        !collapsed && !isActive && 'hover:translate-x-[2px]',
                        isActive
                          ? 'bg-[hsl(var(--platform-primary)/0.1)] text-[hsl(var(--platform-primary))] ring-1 ring-[hsl(var(--platform-primary)/0.2)]'
                          : 'text-[hsl(var(--platform-foreground-muted))] hover:bg-[hsl(var(--platform-bg-hover))] hover:text-[hsl(var(--platform-foreground)/0.9)]'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {/* Animated active accent bar */}
                      {isActive && (
                        <motion.div
                          layoutId="platform-nav-active"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-full bg-[hsl(var(--platform-primary))] shadow-[0_0_6px_hsl(var(--platform-primary)/0.4)]"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      {/* Hover accent preview for non-active items */}
                      {!isActive && !collapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-[hsl(var(--platform-primary)/0.4)]" />
                      )}
                      <Icon className={cn(
                        'h-[18px] w-[18px] shrink-0 transition-transform duration-200',
                        isActive 
                          ? 'scale-110 text-[hsl(var(--platform-primary))]'
                          : 'group-hover:scale-105'
                      )} />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  );

                  if (collapsed) {
                    return (
                      <li key={item.href} className="group">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {linkContent}
                          </TooltipTrigger>
                          <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  }

                  return <li key={item.href} className="group">{linkContent}</li>;
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Scroll fade hint */}
        <div className="sticky bottom-0 left-0 right-0 h-6 pointer-events-none bg-gradient-to-t from-[hsl(var(--platform-sidebar-bg)/0.85)] to-transparent" />
      </nav>

      {/* User Profile Section */}
      <div className="shrink-0 p-3">
        {/* Profile divider */}
        <div className="h-px mx-1 mb-3 bg-gradient-to-r from-transparent via-[hsl(var(--platform-border)/0.6)] to-transparent" />
        <button
          onClick={() => navigate('/platform/settings')}
          className={cn(
            'w-full flex items-center gap-3 rounded-xl px-2 py-2 transition-all duration-200 active:scale-[0.98]',
            collapsed && 'justify-center',
            'hover:bg-[hsl(var(--platform-bg-hover))] hover:ring-1 hover:ring-[hsl(var(--platform-primary)/0.2)]'
          )}
          title={collapsed ? (profile?.display_name || profile?.full_name || 'Account') : undefined}
        >
          <Avatar className="h-8 w-8 border border-[hsl(var(--platform-border))]">
            <AvatarImage src={profile?.photo_url || undefined} alt="Profile" className="object-cover" style={getAvatarStyle(profile)} />
            <AvatarFallback className="text-xs font-medium bg-[hsl(var(--platform-bg-hover))] text-[hsl(var(--platform-foreground-muted))]">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate text-[hsl(var(--platform-foreground))]">
                  {profile?.display_name || profile?.full_name?.split(' ')[0] || 'Account'}
                </p>
                {isConnected && (
                  <OnlineIndicator isOnline={true} size="sm" />
                )}
              </div>
              {roleInfo && (
                <PlatformBadge variant={roleInfo.variant} size="sm" className="gap-1 mt-0.5">
                  <roleInfo.icon className="w-2.5 h-2.5" />
                  {roleInfo.label}
                </PlatformBadge>
              )}
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
