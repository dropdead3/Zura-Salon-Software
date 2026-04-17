import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useActualEmployeeProfile } from '@/hooks/useActualEmployeeProfile';
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
  const { data: profile } = useActualEmployeeProfile();
  const { resolvedTheme } = usePlatformTheme();
  const { isConnected, onlineUsers, onlineCount } = usePlatformPresenceContext();

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
    navigate('/login');
  };

  const handleViewProfile = () => {
    navigate('/platform/settings');
  };
  return (
    <header
      className="sticky top-3 z-30 h-14 mx-4 rounded-[18px] backdrop-blur-xl border border-[hsl(var(--platform-border)/0.3)] bg-[hsl(var(--platform-bg)/0.6)] shadow-lg shadow-black/[0.06]"
    >
      <div className="flex h-full items-center justify-between px-6">
        {/* Left: Online Users */}
        <div className="flex items-center gap-4">
          {/* Online Users Section */}
          {onlineCount > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[hsl(var(--platform-foreground-muted))]" />
                <span className="text-sm font-medium text-[hsl(var(--platform-foreground)/0.85)]">
                  {onlineCount} online
                </span>
              </div>
              
              {otherOnlineUsers.length > 0 && (
                <div className="h-6 w-px mx-1 bg-[hsl(var(--platform-border))]" />
              )}
              
              {/* Other Online Users Avatars */}
              <TooltipProvider delayDuration={200}>
                <div className="flex -space-x-2">
                  {otherOnlineUsers.slice(0, 5).map((onlineUser) => (
                    <Tooltip key={onlineUser.id}>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <Avatar className="h-8 w-8 border-2 ring-2 border-[hsl(var(--platform-bg))] ring-emerald-500/30">
                            <AvatarImage src={onlineUser.photo_url || undefined} alt={onlineUser.full_name} />
                            <AvatarFallback className="text-xs font-medium bg-[hsl(var(--platform-bg-hover))] text-[hsl(var(--platform-foreground-muted))]">
                              {getInitials(onlineUser.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <OnlineIndicator 
                            isOnline={true} 
                            size="sm" 
                            className="absolute -bottom-0.5 -right-0.5 ring-2 ring-[hsl(var(--platform-bg))]"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="font-medium">{onlineUser.full_name || 'Team Member'}</p>
                        <p className="text-xs text-emerald-400">Online</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  
                  {otherOnlineUsers.length > 5 && (
                    <div className="h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-medium border-[hsl(var(--platform-bg))] bg-[hsl(var(--platform-bg-hover))] text-[hsl(var(--platform-foreground-muted))]">
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
              className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[hsl(var(--platform-bg-hover))]"
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Avatar className="h-8 w-8 border border-[hsl(var(--platform-border))]">
                    <AvatarImage src={profile?.photo_url || undefined} alt="Profile" className="object-cover" style={getAvatarStyle(profile)} />
                    <AvatarFallback className="text-xs font-medium bg-[hsl(var(--platform-bg-hover))] text-[hsl(var(--platform-foreground-muted))]">
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
                  <span className="text-sm font-medium block text-[hsl(var(--platform-foreground))]">
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
            className="w-56 bg-[hsl(var(--platform-bg-elevated))] border-[hsl(var(--platform-border))]"
          >
            <div className="px-3 py-2 border-b border-[hsl(var(--platform-border))]">
              <p className="text-sm font-medium text-[hsl(var(--platform-foreground))]">
                {profile?.full_name || 'Platform User'}
              </p>
              <p className="text-xs truncate text-[hsl(var(--platform-foreground-muted))]">
                {user?.email}
              </p>
            </div>
            
            <DropdownMenuItem
              onClick={handleViewProfile}
              className="cursor-pointer text-[hsl(var(--platform-foreground)/0.85)] focus:bg-[hsl(var(--platform-bg-hover))] focus:text-[hsl(var(--platform-foreground))]"
            >
              <User className="mr-2 h-4 w-4" />
              View Profile
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={handleViewProfile}
              className="cursor-pointer text-[hsl(var(--platform-foreground)/0.85)] focus:bg-[hsl(var(--platform-bg-hover))] focus:text-[hsl(var(--platform-foreground))]"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="bg-[hsl(var(--platform-border))]" />
            
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-400"
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
