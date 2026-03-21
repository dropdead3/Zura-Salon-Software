import { useState, useMemo } from 'react';
import { Users, Crown, Shield, UserMinus, Search, ArrowUpDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeamChatContext } from '@/contexts/TeamChatContext';
import { useChannelMembers } from '@/hooks/team-chat/useChannelMembers';
import { useTeamMembers } from '@/hooks/team-chat/useTeamMembers';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, MoreHorizontal, UserPlus } from 'lucide-react';
import { ALL_ROLES, ROLE_LABELS } from '@/hooks/useUserRoles';
import { getIconByName } from '@/lib/iconResolver';
import type { Database } from '@/integrations/supabase/types';

type SortOption = 'name-asc' | 'name-desc' | 'role';
type AppRole = Database['public']['Enums']['app_role'];

interface ChannelMembersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChannelMembersSheet({ open, onOpenChange }: ChannelMembersSheetProps) {
  const { user } = useAuth();
  const { activeChannel } = useTeamChatContext();
  const { members, isLoading, addMember, removeMember, updateRole, isAdmin } = useChannelMembers(activeChannel?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('role');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const { members: teamMembers } = useTeamMembers(searchQuery);

  // Get unique account roles present in the channel for the filter dropdown
  const availableAccountRoles = useMemo(() => {
    const rolesInChannel = new Set<AppRole>();
    members.forEach((m) => {
      m.accountRoles.forEach((role) => rolesInChannel.add(role));
    });
    return ALL_ROLES.filter((role) => rolesInChannel.has(role));
  }, [members]);

  // Get primary display role for a member (first account role, or fallback)
  const getPrimaryAccountRole = (accountRoles: AppRole[]): string => {
    if (accountRoles.length === 0) return 'Team Member';
    const roleOrder: AppRole[] = ['super_admin', 'admin', 'manager', 'stylist', 'receptionist', 'stylist_assistant', 'admin_assistant', 'operations_assistant', 'booth_renter', 'bookkeeper', 'assistant'];
    for (const role of roleOrder) {
      if (accountRoles.includes(role)) {
        return ROLE_LABELS[role] || role;
      }
    }
    return ROLE_LABELS[accountRoles[0]] || accountRoles[0];
  };

  // Filter and sort members
  const filteredAndSortedMembers = useMemo(() => {
    let result = [...members];

    // Filter by search query
    if (memberSearchQuery) {
      const query = memberSearchQuery.toLowerCase();
      result = result.filter((m) => {
        const name = m.profile.displayName || m.profile.fullName || '';
        return name.toLowerCase().includes(query);
      });
    }

    // Filter by account role
    if (roleFilter !== 'all') {
      result = result.filter((m) => m.accountRoles.includes(roleFilter as AppRole));
    }

    // Sort
    result.sort((a, b) => {
      const nameA = (a.profile.displayName || a.profile.fullName || '').toLowerCase();
      const nameB = (b.profile.displayName || b.profile.fullName || '').toLowerCase();

      if (sortOption === 'name-asc') {
        return nameA.localeCompare(nameB);
      } else if (sortOption === 'name-desc') {
        return nameB.localeCompare(nameA);
      } else {
        // Sort by channel role first (owner > admin > member), then by account role
        const channelRoleOrder = { owner: 0, admin: 1, member: 2 };
        const channelRoleCompare = channelRoleOrder[a.role] - channelRoleOrder[b.role];
        if (channelRoleCompare !== 0) return channelRoleCompare;
        return nameA.localeCompare(nameB);
      }
    });

    return result;
  }, [members, memberSearchQuery, roleFilter, sortOption]);

  // Filter out existing members for add member search
  const availableMembers = teamMembers.filter(
    (tm) => !members.some((m) => m.userId === tm.userId)
  );

  const getChannelRoleIcon = (role: string) => {
    if (role === 'owner') return <Crown className="h-3 w-3 text-yellow-500" />;
    if (role === 'admin') return <Shield className="h-3 w-3 text-blue-500" />;
    return null;
  };

  if (!activeChannel) return null;

  return (
    <PremiumFloatingPanel open={open} onOpenChange={onOpenChange} maxWidth="440px">
      <div className="p-5 pb-3 border-b border-border/40">
        <h2 className="font-display text-sm tracking-wide uppercase flex items-center gap-2">
          <Users className="h-5 w-5" />
          Channel Members ({members.length})
        </h2>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-5 pt-4 gap-4">
        {/* Search and Filter Controls */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="flex-1">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {availableAccountRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role] || role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
              <SelectTrigger className="flex-1">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="role">By Role</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isAdmin && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowAddMember(!showAddMember)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Members
          </Button>
        )}

        {showAddMember && (
          <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {availableMembers.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {availableMembers.slice(0, 5).map((member) => {
                  const name = member.displayName || member.fullName || 'Unknown';
                  return (
                    <button
                      key={member.userId}
                      onClick={() => {
                        addMember({ userId: member.userId });
                        setSearchQuery('');
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-sm"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.photoUrl || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAndSortedMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {memberSearchQuery || roleFilter !== 'all' 
              ? 'No members match your filters' 
              : 'No members in this channel'}
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-1">
              {filteredAndSortedMembers.map((member) => {
                const name = member.profile.displayName || member.profile.fullName || 'Unknown';
                const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                const isMe = member.userId === user?.id;
                const primaryRole = getPrimaryAccountRole(member.accountRoles);
                const channelRoleIcon = getChannelRoleIcon(member.role);

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent/50"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.profile.photoUrl || undefined} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{name}</span>
                        {channelRoleIcon}
                        {isMe && <span className="text-xs text-muted-foreground">(you)</span>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {primaryRole}
                        {member.role === 'owner' && ' (Channel Owner)'}
                        {member.role === 'admin' && ' (Channel Admin)'}
                      </span>
                    </div>

                    {isAdmin && !isMe && member.role !== 'owner' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.role !== 'admin' && (
                            <DropdownMenuItem onClick={() => updateRole({ userId: member.userId, role: 'admin' })}>
                              <Shield className="h-4 w-4 mr-2" />
                              Make Channel Admin
                            </DropdownMenuItem>
                          )}
                          {member.role === 'admin' && (
                            <DropdownMenuItem onClick={() => updateRole({ userId: member.userId, role: 'member' })}>
                              <Shield className="h-4 w-4 mr-2" />
                              Remove Channel Admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => removeMember(member.userId)}
                            className="text-destructive"
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Remove from channel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </PremiumFloatingPanel>
  );
}
