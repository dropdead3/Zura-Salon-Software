import { useState } from 'react';
import { Search, X, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTeamMembers } from '@/hooks/team-chat/useTeamMembers';
import { useDMChannels } from '@/hooks/team-chat/useDMChannels';
import { useTeamChatContext } from '@/contexts/TeamChatContext';
import { useLocations } from '@/hooks/useLocations';
import { ALL_ROLES, ROLE_LABELS } from '@/hooks/useUserRoles';
import { Loader2, MapPin, UserCog } from 'lucide-react';

interface StartDMDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StartDMDialog({ open, onOpenChange }: StartDMDialogProps) {
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  const { members, isLoading } = useTeamMembers(search, locationFilter, roleFilter as any);
  const { createDM, isCreating } = useDMChannels();
  const { setActiveChannel } = useTeamChatContext();
  const { data: locations = [] } = useLocations();

  // Filter out legacy 'assistant' role from display
  const displayRoles = ALL_ROLES.filter(role => role !== 'assistant');

  const handleSelectMember = async (userId: string) => {
    try {
      const channel = await createDM(userId);
      if (channel) {
        setActiveChannel(channel as any);
      }
      onOpenChange(false);
      setSearch('');
      setLocationFilter('all');
      setRoleFilter('all');
    } catch (e) {
      // Error handled by hook
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSearch('');
      setLocationFilter('all');
      setRoleFilter('all');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Start a Conversation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Filter Row */}
          <div className="flex gap-2">
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="flex-1 h-9">
                <MapPin className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="flex-1 h-9">
                <UserCog className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {displayRoles.map(role => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <ScrollArea className="h-64">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {search || locationFilter !== 'all' || roleFilter !== 'all' 
                  ? 'No members found' 
                  : 'Type to search team members'}
              </div>
            ) : (
              <div className="space-y-1">
                {members.map((member) => {
                  const name = member.displayName || member.fullName || 'Unknown';
                  const initials = name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <button
                      key={member.userId}
                      onClick={() => handleSelectMember(member.userId)}
                      disabled={isCreating}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left',
                        'hover:bg-muted/50 transition-colors',
                        isCreating && 'opacity-50 pointer-events-none'
                      )}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.photoUrl || undefined} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{name}</div>
                        {member.email && (
                          <div className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </div>
                        )}
                      </div>
                      {member.role && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {ROLE_LABELS[member.role]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
