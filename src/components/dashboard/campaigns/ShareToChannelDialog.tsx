import { useState } from 'react';
import { Hash, Send, Loader2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ShareToChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName: string;
  content: string;
}

export function ShareToChannelDialog({ open, onOpenChange, campaignName, content }: ShareToChannelDialogProps) {
  const { user } = useAuth();
  const { effectiveOrganization } = useOrganizationContext();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Fetch channels user is a member of
  const { data: channels, isLoading } = useQuery({
    queryKey: ['share-channels', effectiveOrganization?.id, user?.id],
    queryFn: async () => {
      if (!user?.id || !effectiveOrganization?.id) return [];
      const { data, error } = await supabase
        .from('chat_channel_members')
        .select(`
          channel_id,
          channel:chat_channels!inner (
            id, name, type, is_archived
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      return (data || [])
        .map((d: any) => d.channel)
        .filter((c: any) => c && !c.is_archived && (c.type === 'public' || c.type === 'private' || c.type === 'location'))
        .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
    },
    enabled: open && !!user?.id,
  });

  const handleSend = async () => {
    if (!user?.id || !selectedChannel) return;
    setSending(true);
    try {
      const prefix = customMessage ? `${customMessage}\n\n---\n\n` : '';
      const message = `${prefix}${content}`;

      await supabase.from('chat_messages').insert({
        channel_id: selectedChannel,
        sender_id: user.id,
        content: message,
      });

      setSent(true);
      toast.success('Campaign posted to channel');
      setTimeout(() => {
        onOpenChange(false);
        setSelectedChannel(null);
        setCustomMessage('');
        setSent(false);
      }, 1500);
    } catch (err) {
      console.error('Share to channel error:', err);
      toast.error('Failed to post');
    } finally {
      setSending(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedChannel(null);
      setCustomMessage('');
      setSent(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" overlayClassName="backdrop-blur-sm bg-black/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-primary" />
            Post to Channel
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Share "{campaignName}" to a team channel
          </p>
        </DialogHeader>

        <ScrollArea className="h-48">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !channels?.length ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No channels available</p>
          ) : (
            <div className="space-y-0.5">
              {channels.map((ch: any) => (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChannel(ch.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors',
                    selectedChannel === ch.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                  )}
                >
                  <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{ch.name}</span>
                  {selectedChannel === ch.id && <Check className="w-4 h-4 text-primary ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Add a note (optional)</label>
          <Textarea
            placeholder="Here's our latest campaign plan..."
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={2}
            className="text-sm resize-none"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" size={tokens.button.card} onClick={() => handleClose(false)}>Cancel</Button>
          <Button
            size={tokens.button.card}
            onClick={handleSend}
            disabled={!selectedChannel || sending || sent}
            className="gap-1.5"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {sent ? 'Posted!' : 'Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
