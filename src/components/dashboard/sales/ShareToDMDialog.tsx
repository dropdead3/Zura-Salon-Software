import { useState } from 'react';
import { Search, X, Send, Loader2, MapPin, UserCog, Users, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useTeamMembers } from '@/hooks/team-chat/useTeamMembers';
import { useDMChannels } from '@/hooks/team-chat/useDMChannels';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PLATFORM_NAME } from '@/lib/brand';
import { toast } from 'sonner';
import { ZuraAvatar } from '@/components/ui/ZuraAvatar';

interface ShareToDMDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planTitle: string;
  planContent: string;
}

export function ShareToDMDialog({ open, onOpenChange, planTitle, planContent }: ShareToDMDialogProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Array<{ id: string; name: string; photo?: string | null }>>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const { members, isLoading } = useTeamMembers(search, 'all', 'all' as any);
  const { createDM } = useDMChannels();

  const toggleUser = (userId: string, name: string, photo?: string | null) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === userId)
        ? prev.filter((u) => u.id !== userId)
        : [...prev, { id: userId, name, photo }]
    );
  };

  const formatPitchMessage = () => {
    const prefix = customMessage
      ? `${customMessage}\n\n---\n\n`
      : `Hey team — ${PLATFORM_NAME} flagged that we're behind pace on our revenue goal. Here's the recovery plan I'd like to discuss:\n\n---\n\n`;
    const cleanContent = planContent.replace(/---ACTIONS---[\s\S]*?(---END---|$)/g, '').trim();
    return `${prefix}**📋 ${planTitle}**\n\n${cleanContent}`;
  };

  const handleSend = async () => {
    if (!user?.id || selectedUsers.length === 0) return;
    setSending(true);
    try {
      const message = formatPitchMessage();

      for (const target of selectedUsers) {
        const channel = await createDM(target.id);
        if (channel?.id) {
          await supabase.from('chat_messages').insert({
            channel_id: channel.id,
            sender_id: user.id,
            content: message,
          });
        }
      }

      setSent(true);
      toast.success(`Plan shared with ${selectedUsers.length} team member${selectedUsers.length > 1 ? 's' : ''}`);
      setTimeout(() => {
        onOpenChange(false);
        setSelectedUsers([]);
        setCustomMessage('');
        setSent(false);
      }, 1500);
    } catch (err) {
      console.error('Share error:', err);
      toast.error('Failed to send messages');
    } finally {
      setSending(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSearch('');
      setSelectedUsers([]);
      setCustomMessage('');
      setSent(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" overlayClassName="backdrop-blur-sm bg-black/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ZuraAvatar size="sm" />
            Pitch to Leadership
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Select team members to share this recovery plan as a DM
          </p>
        </DialogHeader>

        {/* Selected chips */}
        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => toggleUser(u.id, u.name, u.photo)}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors"
              >
                {u.name}
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Member list */}
        <ScrollArea className="h-48">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No members found</p>
          ) : (
            <div className="space-y-0.5">
              {members
                .filter((m) => m.userId !== user?.id)
                .map((member) => {
                  const name = member.displayName || member.fullName || 'Unknown';
                  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                  const isSelected = selectedUsers.some((u) => u.id === member.userId);

                  return (
                    <button
                      key={member.userId}
                      onClick={() => toggleUser(member.userId, name, member.photoUrl)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors',
                        isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.photoUrl || undefined} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{name}</div>
                        {member.email && (
                          <div className="text-[11px] text-muted-foreground truncate">{member.email}</div>
                        )}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
            </div>
          )}
        </ScrollArea>

        {/* Custom message */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Add a personal note (optional)
          </label>
          <Textarea
            placeholder="Hey team, I think we should discuss this recovery plan..."
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={2}
            className="text-sm resize-none"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" size={tokens.button.card} onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            size={tokens.button.card}
            onClick={handleSend}
            disabled={selectedUsers.length === 0 || sending || sent}
            className="gap-1.5"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : sent ? (
              <Check className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sent ? 'Sent!' : `Send to ${selectedUsers.length || '...'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
