import { useLocation, useNavigate } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
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
import { usePlatformBranding } from '@/hooks/usePlatformBranding';
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
  const { branding } = usePlatformBranding();
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

  const isDark = resolvedTheme === 'dark';

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

  // Choose logo based on theme
  const currentLogo = resolvedTheme === 'dark' 
    ? branding.primary_logo_url 
    : branding.secondary_logo_url;
  
  const currentIcon = resolvedTheme === 'dark'
    ? branding.icon_dark_url
    : branding.icon_light_url;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-56',
        isDark 
          ? 'bg-slate-900/95 backdrop-blur-xl'
          : 'bg-white/95 backdrop-blur-xl shadow-lg shadow-violet-500/5'
      )}
    >
      {/* Logo / Header with collapse toggle */}
      <div className={cn(
        'flex h-[60px] items-center justify-between px-4 shrink-0',
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            {currentLogo ? (
              <img
                src={currentLogo}
                alt="Platform logo"
                className="h-8 object-contain"
              />
            ) : (
              <>
                <div className={cn(
                  'p-1.5 rounded-lg shadow-lg',
                  'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/20'
                )}>
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className={cn(
                  'font-display',
                  isDark ? 'text-white' : 'text-slate-900'
                )}>Platform</span>
              </>
            )}
          </div>
        )}
        {collapsed && (
          <div className="mx-auto">
            {currentIcon ? (
              <img
                src={currentIcon}
                alt="Platform icon"
                className="h-8 w-8 object-contain"
              />
            ) : (
              <div className={cn(
                'p-1.5 rounded-lg shadow-lg',
                'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/20'
              )}>
                <Sparkles className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className={cn(
              'p-1 rounded-md active:scale-90 transition-all duration-150',
              isDark 
                ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60' 
                : 'text-slate-400 hover:text-violet-600 hover:bg-violet-50'
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsed(false)}
                className={cn(
                  'absolute -right-3 top-[18px] z-50 p-1 rounded-full border shadow-sm',
                  'active:scale-90 transition-all duration-150 hover:shadow-md hover:scale-105',
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700' 
                    : 'bg-white border-violet-200 text-slate-400 hover:text-violet-600 hover:bg-violet-50'
                )}
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Header fade divider */}
      <div className={cn(
        'h-px mx-3 shrink-0',
        isDark 
          ? 'bg-gradient-to-r from-transparent via-slate-700/60 to-transparent'
          : 'bg-gradient-to-r from-transparent via-violet-200/60 to-transparent'
      )} />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto relative">
        <div className={cn('py-3 space-y-4', collapsed ? 'px-1' : 'px-2')}>
          {visibleGroups.map((group, groupIndex) => (
            <div key={group.label}>
              {/* Section label */}
              {!collapsed && (
                <div className={cn(
                  'px-3 pb-1.5 text-[10px] font-medium uppercase tracking-[0.15em] transition-colors duration-200',
                  isDark ? 'text-slate-500' : 'text-slate-400'
                )}>
                  {group.label}
                </div>
              )}

              {/* Collapsed: thin separator between groups */}
              {collapsed && groupIndex > 0 && (
                <div className={cn(
                  'h-px mx-2 mb-2',
                  isDark ? 'bg-slate-700/40' : 'bg-violet-100/60'
                )} />
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
                        !collapsed && !isActive && !isDark && 'hover:shadow-sm',
                        isActive
                          ? isDark
                            ? 'bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20'
                            : 'bg-gradient-to-r from-violet-50 to-violet-100/60 text-violet-700'
                          : isDark
                            ? 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                            : 'text-slate-500 hover:bg-violet-50/80 hover:text-violet-700'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {/* Animated active accent bar */}
                      {isActive && (
                        <motion.div
                          layoutId="platform-nav-active"
                          className={cn(
                            'absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-full',
                            isDark
                              ? 'bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.4)]'
                              : 'bg-violet-500 shadow-[0_0_4px_rgba(124,58,237,0.3)]'
                          )}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      {/* Hover accent preview for non-active items */}
                      {!isActive && !collapsed && (
                        <div className={cn(
                          'absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                          isDark ? 'bg-violet-500/40' : 'bg-violet-400/40'
                        )} />
                      )}
                      <Icon className={cn(
                        'h-[18px] w-[18px] shrink-0 transition-transform duration-200',
                        isActive 
                          ? cn('scale-110', isDark ? 'text-violet-400' : 'text-violet-600')
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
        <div className={cn(
          'sticky bottom-0 left-0 right-0 h-6 pointer-events-none',
          isDark
            ? 'bg-gradient-to-t from-slate-900/95 to-transparent'
            : 'bg-gradient-to-t from-white/95 to-transparent'
        )} />
      </nav>

      {/* User Profile Section */}
      <div className={cn(
        'shrink-0 p-3',
      )}>
        {/* Profile divider */}
        <div className={cn(
          'h-px mx-1 mb-3',
          isDark 
            ? 'bg-gradient-to-r from-transparent via-slate-700/60 to-transparent'
            : 'bg-gradient-to-r from-transparent via-violet-200/60 to-transparent'
        )} />
        <button
          onClick={() => navigate('/dashboard/platform/settings')}
          className={cn(
            'w-full flex items-center gap-3 rounded-xl px-2 py-2 transition-all duration-200 active:scale-[0.98]',
            collapsed && 'justify-center',
            isDark 
              ? 'hover:bg-slate-800/60 hover:ring-1 hover:ring-violet-500/20' 
              : 'hover:bg-violet-50 hover:ring-1 hover:ring-violet-300/30'
          )}
          title={collapsed ? (profile?.display_name || profile?.full_name || 'Account') : undefined}
        >
          <Avatar className={cn(
              'h-8 w-8 border',
              isDark ? 'border-slate-600' : 'border-violet-200'
            )}>
              <AvatarImage src={profile?.photo_url || undefined} alt="Profile" className="object-cover" style={getAvatarStyle(profile)} />
              <AvatarFallback className={cn(
                'text-xs font-medium',
                isDark ? 'bg-slate-700 text-slate-300' : 'bg-violet-100 text-violet-700'
              )}>
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          {!collapsed && (
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-1.5">
                <p className={cn(
                  'text-sm font-medium truncate',
                  isDark ? 'text-white' : 'text-slate-900'
                )}>
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

