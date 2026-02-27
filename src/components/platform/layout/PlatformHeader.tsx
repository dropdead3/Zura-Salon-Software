import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { usePlatformTheme } from '@/contexts/PlatformThemeContext';
import { usePlatformPresenceContext } from '@/contexts/PlatformPresenceContext';
import { cn } from '@/lib/utils';
import { getAvatarStyle } from '@/lib/avatar-utils';
import { User, LogOut, Settings, Crown, Shield, Headphones, Code, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PlatformBadge } from '../ui/PlatformBadge';
import { OnlineIndicator } from '../ui/OnlineIndicator';
import type { PlatformRole } from '@/hooks/usePlatformRoles';

const roleConfig: Record<PlatformRole, { label: string; icon: React.ComponentType<{ className?: string }>; variant: 'warning' | 'info' | 'success' | 'primary' }> = {
  platform_owner: { label: 'Owner', icon: Crown, variant: 'warning' },
  platform_admin: { label: 'Admin', icon: Shield, variant: 'info' },
  platform_support: { label: 'Support', icon: Headphones, variant: 'success' },
  platform_developer: { label: 'Developer', icon: Code, variant: 'primary' },
};

export function PlatformHeader() {
  const navigate = useNavigate();
  const { user, signOut, platformRoles } = useAuth();
  const { data: profile } = useEmployeeProfile();
  const { resolvedTheme } = usePlatformTheme();
  const { isConnected, onlineUsers, onlineCount } = usePlatformPresenceContext();
  const isDark = resolvedTheme === 'dark';

  const primaryRole = platformRoles[0] as PlatformRole | undefined;
  const roleInfo = primaryRole ? roleConfig[primaryRole] : null;

  // Get other online users (exclude current user)
  const otherOnlineUsers = Array.from(onlineUsers.entries())
    .filter(([id]) => id !== user?.id)
    .map(([id, data]) => ({ id, ...data }));

  const getInitials = (name?: string, email?: string) => {
    const source = name || email;
    if (!source) return '?';
    return source.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleViewProfile = () => {
    navigate('/dashboard/platform/settings');
  };
  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-14 border-b backdrop-blur-xl',
        isDark
          ? 'border-slate-700/50 bg-slate-900/80'
          : 'border-violet-200/50 bg-white/80'
      )}
    >
      <div className="flex h-full items-center justify-between px-6">
        {/* Left: Online Users */}
        <div className="flex items-center gap-4">
          {/* Online Users Section */}
          {onlineCount > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Users className={cn('h-4 w-4', isDark ? 'text-slate-400' : 'text-slate-500')} />
                <span className={cn(
                  'text-sm font-medium',
                  isDark ? 'text-slate-300' : 'text-slate-600'
                )}>
                  {onlineCount} online
                </span>
              </div>
              
              {otherOnlineUsers.length > 0 && (
                <div className={cn(
                  'h-6 w-px mx-1',
                  isDark ? 'bg-slate-700' : 'bg-violet-200'
                )} />
              )}
              
              {/* Other Online Users Avatars */}
              <TooltipProvider delayDuration={200}>
                <div className="flex -space-x-2">
                  {otherOnlineUsers.slice(0, 5).map((onlineUser) => (
                    <Tooltip key={onlineUser.id}>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <Avatar className={cn(
                            'h-8 w-8 border-2 ring-2',
                            isDark 
                              ? 'border-slate-900 ring-emerald-500/30' 
                              : 'border-white ring-emerald-500/30'
                          )}>
                            <AvatarImage src={onlineUser.photo_url || undefined} alt={onlineUser.full_name} />
                            <AvatarFallback className={cn(
                              'text-xs font-medium',
                              isDark ? 'bg-slate-700 text-slate-300' : 'bg-violet-100 text-violet-700'
                            )}>
                              {getInitials(onlineUser.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <OnlineIndicator 
                            isOnline={true} 
                            size="sm" 
                            className="absolute -bottom-0.5 -right-0.5 ring-2 ring-slate-900"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="bottom"
                        className={isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}
                      >
                        <p className="font-medium">{onlineUser.full_name || 'Team Member'}</p>
                        <p className="text-xs text-emerald-400">Online</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  
                  {otherOnlineUsers.length > 5 && (
                    <div className={cn(
                      'h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-medium',
                      isDark 
                        ? 'border-slate-900 bg-slate-700 text-slate-300' 
                        : 'border-white bg-violet-100 text-violet-700'
                    )}>
                      +{otherOnlineUsers.length - 5}
                    </div>
                  )}
                </div>
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                isDark
                  ? 'hover:bg-slate-800/60'
                  : 'hover:bg-violet-50'
              )}
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Avatar className={cn(
                    'h-8 w-8 border',
                    isDark ? 'border-slate-600' : 'border-violet-200'
                  )}>
                    <AvatarImage src={profile?.photo_url || undefined} alt="Profile" className="object-cover" style={getAvatarStyle(profile)} />
                    <AvatarFallback className={cn(
                      'text-xs font-medium',
                      isDark ? 'bg-slate-700 text-slate-300' : 'bg-violet-100 text-violet-700'
                    )}>
                      {getInitials(profile?.full_name || profile?.display_name, user?.email)}
                    </AvatarFallback>
                  </Avatar>
                  {isConnected && (
                    <OnlineIndicator 
                      isOnline={true} 
                      size="sm" 
                      className="absolute -bottom-0.5 -right-0.5"
                    />
                  )}
                </div>
                
                <div className="hidden sm:block text-left">
                  <span className={cn(
                    'text-sm font-medium block',
                    isDark ? 'text-white' : 'text-slate-900'
                  )}>
                    {profile?.display_name || profile?.full_name?.split(' ')[0] || 'Account'}
                  </span>
                  {roleInfo && (
                    <PlatformBadge variant={roleInfo.variant} size="sm" className="gap-1">
                      <roleInfo.icon className="w-2.5 h-2.5" />
                      {roleInfo.label}
                    </PlatformBadge>
                  )}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent
            align="end"
            className={cn(
              'w-56',
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-violet-200'
            )}
          >
            <div className={cn(
              'px-3 py-2 border-b',
              isDark ? 'border-slate-700' : 'border-violet-100'
            )}>
              <p className={cn(
                'text-sm font-medium',
                isDark ? 'text-white' : 'text-slate-900'
              )}>
                {profile?.full_name || 'Platform User'}
              </p>
              <p className={cn(
                'text-xs truncate',
                isDark ? 'text-slate-400' : 'text-slate-500'
              )}>
                {user?.email}
              </p>
            </div>
            
            <DropdownMenuItem
              onClick={handleViewProfile}
              className={cn(
                'cursor-pointer',
                isDark ? 'text-slate-300 focus:bg-slate-700 focus:text-white' : ''
              )}
            >
              <User className="mr-2 h-4 w-4" />
              View Profile
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={handleViewProfile}
              className={cn(
                'cursor-pointer',
                isDark ? 'text-slate-300 focus:bg-slate-700 focus:text-white' : ''
              )}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className={isDark ? 'bg-slate-700' : ''} />
            
            <DropdownMenuItem
              onClick={handleSignOut}
              className={cn(
                'cursor-pointer text-red-500',
                isDark ? 'focus:bg-red-500/10 focus:text-red-400' : 'focus:bg-red-50 focus:text-red-600'
              )}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}