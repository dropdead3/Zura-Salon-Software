import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Crown, Shield } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLeadershipMembers, LeadershipMember } from '@/hooks/team-chat/useLeadershipMembers';
import { useDMChannels } from '@/hooks/team-chat/useDMChannels';
import { usePlatformPresenceContextSafe } from '@/contexts/PlatformPresenceContext';
import { OnlineIndicator } from '@/components/platform/ui/OnlineIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrganizations } from '@/hooks/useOrganizations';
import { cn } from '@/lib/utils';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
};

const roleIcons: Record<string, typeof Crown> = {
  super_admin: Crown,
  admin: Shield,
  manager: Shield,
};

interface MemberItemProps {
  member: LeadershipMember;
  isOnline: boolean;
  onSelect: (userId: string) => void;
  isLoading: boolean;
}

interface MemberItemProps {
  member: LeadershipMember;
  isOnline: boolean | null; // null means presence data unavailable
  onSelect: (userId: string) => void;
  isLoading: boolean;
}

function MemberItem({ member, isOnline, onSelect, isLoading }: MemberItemProps) {
  const RoleIcon = roleIcons[member.role] || Shield;
  const initials = member.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const hasPresenceData = isOnline !== null;

  return (
    <button
      onClick={() => onSelect(member.user_id)}
      disabled={isLoading}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl',
        'hover:bg-muted/60 transition-all duration-200 text-left',
        'disabled:opacity-50 disabled:cursor-wait'
      )}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.photo_url || undefined} alt={member.display_name} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        {hasPresenceData && (
          <div className="absolute -bottom-0.5 -right-0.5">
            <OnlineIndicator isOnline={isOnline} size="sm" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate">{member.display_name}</span>
          <RoleIcon className="h-3.5 w-3.5 text-primary shrink-0" />
        </div>
        <p className="text-xs text-muted-foreground">
          {roleLabels[member.role] || 'Leadership'}
          {hasPresenceData && ` • ${isOnline ? 'Online' : 'Offline'}`}
        </p>
      </div>

      <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

export function ChatLeadershipTab() {
  const { dashPath } = useOrgDashboardPath();
  const navigate = useNavigate();
  const { isPlatformUser } = useAuth();
  const { effectiveOrganization, setSelectedOrganization } = useOrganizationContext();
  const { data: organizations } = useOrganizations();
  const { members, isLoading } = useLeadershipMembers();
  const { createDM, isCreating } = useDMChannels();
  const presence = usePlatformPresenceContextSafe();

  // Auto-select org for platform users (mirrors TeamChat.tsx logic)
  useEffect(() => {
    if (isPlatformUser && !effectiveOrganization && organizations?.length > 0) {
      // Use first available organization instead of hardcoded default
      setSelectedOrganization(organizations[0]);
    }
  }, [isPlatformUser, effectiveOrganization, organizations, setSelectedOrganization]);
  
  // Helper to check online status - returns null if presence unavailable
  const checkOnline = (userId: string): boolean | null => {
    if (!presence) return null;
    return presence.isOnline(userId);
  };

  const handleSelectMember = async (userId: string) => {
    try {
      await createDM(userId);
      navigate(dashPath('/team-chat'));
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  if (isLoading) {
    return <DashboardLoader size="md" className="h-full" />;
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <MessageCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium">No managers available</p>
        <p className="text-xs text-muted-foreground mt-1">
          Leadership members will appear here when available
        </p>
      </div>
    );
  }

  // Sort by online status (if available), then by name
  const sortedMembers = [...members].sort((a, b) => {
    const aOnline = checkOnline(a.user_id);
    const bOnline = checkOnline(b.user_id);
    // If presence data is available, sort online users first
    if (aOnline !== null && bOnline !== null && aOnline !== bOnline) {
      return bOnline ? 1 : -1;
    }
    return a.display_name.localeCompare(b.display_name);
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/30 bg-muted/20">
        <h3 className="font-display text-sm tracking-wide uppercase">Chat with Leadership</h3>
        <p className="text-xs text-muted-foreground/70 mt-0.5 font-sans">
          Select someone to start a conversation
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sortedMembers.map((member) => (
            <MemberItem
              key={member.user_id}
              member={member}
              isOnline={checkOnline(member.user_id)}
              onSelect={handleSelectMember}
              isLoading={isCreating}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
