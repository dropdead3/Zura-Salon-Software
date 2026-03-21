import { useState, useMemo } from 'react';
import { Search, Users, Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeamChatAccess, type TeamMemberChatAccess } from '@/hooks/team-chat/useTeamChatAccess';
import { ManageChannelsDialog } from '../ManageChannelsDialog';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const ROLE_DISPLAY_NAMES: Record<AppRole, string> = {
  admin: 'Admin',
  admin_assistant: 'Admin Assistant',
  manager: 'Manager',
  stylist: 'Stylist',
  stylist_assistant: 'Stylist Assistant',
  assistant: 'Assistant',
  receptionist: 'Receptionist',
  booth_renter: 'Booth Renter',
  bookkeeper: 'Bookkeeper',
  operations_assistant: 'Operations Assistant',
  super_admin: 'Super Admin',
  inventory_manager: 'Inventory Manager',
};

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getPrimaryRole(roles: AppRole[]): string {
  const priority: AppRole[] = ['super_admin', 'admin', 'manager', 'stylist', 'assistant', 'receptionist', 'booth_renter'];
  for (const role of priority) {
    if (roles.includes(role)) {
      return ROLE_DISPLAY_NAMES[role];
    }
  }
  return 'Team Member';
}

interface MemberCardProps {
  member: TeamMemberChatAccess;
  onToggleChat: (userId: string, enabled: boolean) => void;
  onManageChannels: (member: TeamMemberChatAccess) => void;
  isUpdating: boolean;
}

function MemberCard({ member, onToggleChat, onManageChannels, isUpdating }: MemberCardProps) {
  const displayName = member.displayName || member.fullName || member.email || 'Unknown';
  const isSuperAdmin = member.accountRoles.includes('super_admin');

  const channelPreview = useMemo(() => {
    if (!member.chatEnabled) return '(Chat disabled)';
    if (member.channels.length === 0) return 'No channels';
    
    const sorted = [...member.channels].sort((a, b) => a.name.localeCompare(b.name));
    const shown = sorted.slice(0, 3);
    const remaining = sorted.length - shown.length;
    
    const names = shown.map(c => `#${c.name}`).join(', ');
    return remaining > 0 ? `${names}, +${remaining} more` : names;
  }, [member.channels, member.chatEnabled]);

  return (
    <div className="p-4 border rounded-lg bg-card space-y-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.photoUrl || undefined} alt={displayName} />
          <AvatarFallback className="text-xs bg-muted">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{displayName}</span>
            {isSuperAdmin && (
              <Badge variant="secondary" className="text-xs">Super Admin</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{getPrimaryRole(member.accountRoles)}</p>
        </div>
      </div>

      <div className="text-sm text-muted-foreground truncate">
        {channelPreview}
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onManageChannels(member)}
          disabled={!member.chatEnabled}
          className="gap-2"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Manage Channels
        </Button>

        <div className="flex items-center gap-2">
          <Label htmlFor={`chat-${member.userId}`} className="text-sm text-muted-foreground">
            Chat
          </Label>
          <Switch
            id={`chat-${member.userId}`}
            checked={member.chatEnabled}
            onCheckedChange={(checked) => onToggleChat(member.userId, checked)}
            disabled={isUpdating || isSuperAdmin}
            title={isSuperAdmin ? 'Cannot disable chat for Super Admins' : undefined}
          />
        </div>
      </div>
    </div>
  );
}

export function TeamMembersTab() {
  const { members, orgChannels, isLoading, toggleChat, updateChannels, isUpdating } = useTeamChatAccess();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<TeamMemberChatAccess | null>(null);

  const filteredMembers = useMemo(() => {
    let filtered = members;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.displayName?.toLowerCase().includes(query) ||
        m.fullName?.toLowerCase().includes(query) ||
        m.email?.toLowerCase().includes(query)
      );
    }

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(m => m.accountRoles.includes(roleFilter as AppRole));
    }

    // Sort: Super Admins first, then by name
    return filtered.sort((a, b) => {
      const aIsSuperAdmin = a.accountRoles.includes('super_admin');
      const bIsSuperAdmin = b.accountRoles.includes('super_admin');
      if (aIsSuperAdmin && !bIsSuperAdmin) return -1;
      if (!aIsSuperAdmin && bIsSuperAdmin) return 1;
      
      const aName = a.displayName || a.fullName || '';
      const bName = b.displayName || b.fullName || '';
      return aName.localeCompare(bName);
    });
  }, [members, searchQuery, roleFilter]);

  const handleToggleChat = (userId: string, enabled: boolean) => {
    toggleChat({ userId, enabled });
  };

  const handleManageChannels = (member: TeamMemberChatAccess) => {
    setSelectedMember(member);
  };

  const handleSaveChannels = (channelsToAdd: string[], channelsToRemove: string[]) => {
    if (!selectedMember) return;
    updateChannels({
      userId: selectedMember.userId,
      channelsToAdd,
      channelsToRemove,
    });
    setSelectedMember(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Team Member Access
        </h3>
        <p className="text-xs text-muted-foreground">
          Manage chat access and channel memberships for your team
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {Object.entries(ROLE_DISPLAY_NAMES).map(([role, label]) => (
              <SelectItem key={role} value={role}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Member List */}
      <div className="space-y-3">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery || roleFilter !== 'all' 
              ? 'No members match your filters'
              : 'No team members found'}
          </div>
        ) : (
          filteredMembers.map(member => (
            <MemberCard
              key={member.userId}
              member={member}
              onToggleChat={handleToggleChat}
              onManageChannels={handleManageChannels}
              isUpdating={isUpdating}
            />
          ))
        )}
      </div>

      {/* Channel Management Dialog */}
      {selectedMember && (
        <ManageChannelsDialog
          open={!!selectedMember}
          onOpenChange={(open) => !open && setSelectedMember(null)}
          member={selectedMember}
          orgChannels={orgChannels}
          onSave={handleSaveChannels}
        />
      )}
    </div>
  );
}
