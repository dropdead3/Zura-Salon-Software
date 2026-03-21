import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatChannels } from '@/hooks/team-chat/useChatChannels';
import { useTeamMembers, TeamMember } from '@/hooks/team-chat/useTeamMembers';
import { Search, X, UserPlus } from 'lucide-react';

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateChannelDialog({ open, onOpenChange }: CreateChannelDialogProps) {
  const { createChannel, isCreating } = useChatChannels();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<TeamMember[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  const { members: teamMembers, isLoading: loadingMembers } = useTeamMembers(memberSearch);

  // Clear selected members when toggling private off
  useEffect(() => {
    if (!isPrivate) {
      setSelectedMembers([]);
      setMemberSearch('');
    }
  }, [isPrivate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    createChannel(
      {
        name: slug,
        description: description.trim() || null,
        type: isPrivate ? 'private' : 'public',
        initialMembers: isPrivate ? selectedMembers.map(m => m.userId) : undefined,
      },
      {
        onSuccess: () => {
          setName('');
          setDescription('');
          setIsPrivate(false);
          setSelectedMembers([]);
          setMemberSearch('');
          onOpenChange(false);
        },
      }
    );
  };

  const toggleMember = (member: TeamMember) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(m => m.userId === member.userId);
      if (isSelected) {
        return prev.filter(m => m.userId !== member.userId);
      }
      return [...prev, member];
    });
  };

  const removeMember = (userId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.userId !== userId));
  };

  // Filter out already-selected members from the available list
  const availableMembers = teamMembers.filter(
    m => !selectedMembers.some(s => s.userId === m.userId)
  );

  const getInitials = (member: TeamMember) => {
    const name = member.displayName || member.fullName || member.email || '';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a channel</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channel-name">Name</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">#</span>
              <Input
                id="channel-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. scheduling, tips"
                autoCapitalize="off"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Channel names can only contain lowercase letters, numbers, and hyphens.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-description">Description (optional)</Label>
            <Textarea
              id="channel-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Make private</Label>
              <p className="text-xs text-muted-foreground">
                Only invited members can see this channel
              </p>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          {/* Member selection - only shown for private channels */}
          {isPrivate && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <Label>Add members</Label>
              </div>

              {/* Selected members chips */}
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedMembers.map((member) => (
                    <Badge
                      key={member.userId}
                      variant="secondary"
                      className="pl-1.5 pr-1 py-0.5 gap-1.5 flex items-center"
                    >
                      <Avatar className="h-5 w-5">
                        {member.photoUrl ? (
                          <AvatarImage src={member.photoUrl} alt="" />
                        ) : null}
                        <AvatarFallback className="text-[10px]">
                          {getInitials(member)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">
                        {member.displayName || member.fullName || member.email}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeMember(member.userId)}
                        className="ml-0.5 hover:bg-muted rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search team members..."
                  className="pl-9"
                  autoCapitalize="off"
                />
              </div>

              {/* Available members list */}
              <ScrollArea className="h-32 rounded-md border">
                <div className="p-2 space-y-1">
                  {loadingMembers ? (
                    <>
                      <MemberSkeleton />
                      <MemberSkeleton />
                      <MemberSkeleton />
                    </>
                  ) : availableMembers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {memberSearch ? 'No members found' : 'No more members to add'}
                    </p>
                  ) : (
                    availableMembers.map((member) => (
                      <button
                        key={member.userId}
                        type="button"
                        onClick={() => toggleMember(member)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-muted transition-colors text-left"
                      >
                        <Avatar className="h-7 w-7">
                          {member.photoUrl ? (
                            <AvatarImage src={member.photoUrl} alt="" />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {getInitials(member)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.displayName || member.fullName || 'Unknown'}
                          </p>
                          {member.email && (
                            <p className="text-xs text-muted-foreground truncate">
                              {member.email}
                            </p>
                          )}
                        </div>
                        {member.role && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {member.role.replace('_', ' ')}
                          </Badge>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>

              {selectedMembers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} will be added
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isCreating}>
              {isCreating ? 'Creating...' : 'Create Channel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MemberSkeleton() {
  return (
    <div className="flex items-center gap-2.5 p-2">
      <Skeleton className="h-7 w-7 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2 w-32" />
      </div>
    </div>
  );
}
