import { useState, useMemo, useEffect } from 'react';
import { Settings, Trash2, Archive, Hash, MapPin, Lock, MessageCircle, EyeOff, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeamChatContext } from '@/contexts/TeamChatContext';
import { useChannelMembers } from '@/hooks/team-chat/useChannelMembers';
import { useChannelMessageCount } from '@/hooks/team-chat/useChannelMessageCount';
import { useIsPrimaryOwner } from '@/hooks/useIsPrimaryOwner';
import { useChatChannels } from '@/hooks/team-chat/useChatChannels';
import { useChatSections } from '@/hooks/team-chat/useChatSections';
import { useHasChatPermission, CHAT_PERMISSION_KEYS } from '@/hooks/team-chat/useChatPermissions';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ChannelSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChannelSettingsSheet({ open, onOpenChange }: ChannelSettingsSheetProps) {
  const { activeChannel, setActiveChannel } = useTeamChatContext();
  const { isOwner, isAdmin, members } = useChannelMembers(activeChannel?.id || null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: isPrimaryOwner } = useIsPrimaryOwner();
  const { data: messageCount = 0 } = useChannelMessageCount(activeChannel?.id || null);
  const { updateChannelSection, isUpdatingSection } = useChatChannels();
  const { sections } = useChatSections();
  const canManageSections = useHasChatPermission(CHAT_PERMISSION_KEYS.CREATE_SECTION);

  const dmPartnerName = useMemo(() => {
    if (activeChannel?.type !== 'dm') return null;
    const partner = members.find(m => m.userId !== user?.id);
    return partner?.profile?.displayName || partner?.profile?.fullName || 'Team Member';
  }, [activeChannel?.type, members, user?.id]);

  const displayName = activeChannel?.type === 'dm'
    ? `DM with ${dmPartnerName}` 
    : activeChannel?.name || '';

  const [name, setName] = useState(activeChannel?.name || '');
  const [description, setDescription] = useState(activeChannel?.description || '');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(activeChannel?.section_id || 'default');

  useEffect(() => {
    if (activeChannel) {
      setName(activeChannel.name || '');
      setDescription(activeChannel.description || '');
      setSelectedSectionId(activeChannel.section_id || 'default');
    }
  }, [activeChannel]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!activeChannel?.id) throw new Error('No channel');
      const { error } = await supabase
        .from('chat_channels')
        .update({ name, description })
        .eq('id', activeChannel.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      toast.success('Channel updated');
      onOpenChange(false);
    },
    onError: () => { toast.error('Failed to update channel'); },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (!activeChannel?.id) throw new Error('No channel');
      const { error } = await supabase
        .from('chat_channels')
        .update({ is_archived: true })
        .eq('id', activeChannel.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      setActiveChannel(null);
      toast.success('Channel archived');
      onOpenChange(false);
    },
    onError: () => { toast.error('Failed to archive channel'); },
  });

  const hideDMMutation = useMutation({
    mutationFn: async () => {
      if (!activeChannel?.id || !user?.id) throw new Error('No channel');
      const { error } = await supabase
        .from('chat_channel_members')
        .update({ is_hidden: true })
        .eq('channel_id', activeChannel.id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      setActiveChannel(null);
      toast.success('Conversation archived. It will reappear if either of you sends a message.');
      onOpenChange(false);
    },
    onError: () => { toast.error('Failed to archive conversation'); },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!activeChannel?.id) throw new Error('No channel');
      await supabase
        .from('chat_channel_members')
        .delete()
        .eq('channel_id', activeChannel.id);
      const { error } = await supabase
        .from('chat_channels')
        .delete()
        .eq('id', activeChannel.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      setActiveChannel(null);
      toast.success('Channel deleted permanently');
      onOpenChange(false);
    },
    onError: () => { toast.error('Failed to delete channel'); },
  });

  if (!activeChannel) return null;

  const isDM = activeChannel.type === 'dm';
  const ChannelIcon = isDM ? MessageCircle :
                      activeChannel.type === 'location' ? MapPin : 
                      activeChannel.type === 'private' ? Lock : Hash;
  const canEdit = isAdmin && !activeChannel.is_system && !isDM;

  return (
    <PremiumFloatingPanel open={open} onOpenChange={onOpenChange} maxWidth="440px">
      <div className="p-5 pb-3 border-b border-border/40">
        <h2 className="font-display text-sm tracking-wide uppercase flex items-center gap-2">
          <Settings className="h-5 w-5" />
          {isDM ? 'Conversation Settings' : 'Channel Settings'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-5">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <ChannelIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="font-medium">{displayName}</div>
              <div className="text-sm text-muted-foreground capitalize">
                {isDM ? 'Direct Message' : `${activeChannel.type} channel`}
              </div>
            </div>
          </div>

          {!isDM && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Channel name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEdit}
                />
              </div>

              {canManageSections && !activeChannel.is_system && activeChannel.type !== 'location' && (
                <div className="space-y-2">
                  <Label htmlFor="section">Section</Label>
                  <Select
                    value={selectedSectionId}
                    onValueChange={(value) => {
                      setSelectedSectionId(value);
                      updateChannelSection({
                        channelId: activeChannel.id,
                        sectionId: value === 'default' ? null : value,
                      });
                    }}
                    disabled={isUpdatingSection}
                  >
                    <SelectTrigger id="section">
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        <span className="flex items-center gap-2">
                          <Hash className="h-3 w-3" />
                          Channels (default)
                        </span>
                      </SelectItem>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          <span className="flex items-center gap-2">
                            <Folder className="h-3 w-3" />
                            {section.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Move this channel to a different sidebar section
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canEdit}
                  rows={3}
                />
              </div>
            </div>
          )}

          {activeChannel.is_system && !isDM && (
            <p className="text-sm text-muted-foreground">
              This is a system channel and cannot be modified.
            </p>
          )}
        </div>

        <div className="p-5 pt-0 flex flex-col gap-2">
          {isDM && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <EyeOff className="h-4 w-4 mr-2" />
                  Archive Conversation
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive this conversation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will hide the conversation from your sidebar. It will automatically reappear if either of you sends a new message.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => hideDMMutation.mutate()}>
                    Archive
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          {canEdit && (
            <div className="flex flex-col gap-2 w-full">
              <Button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="w-full"
              >
                Save Changes
              </Button>

              <div className="flex gap-2 w-full">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <Archive className="h-4 w-4 mr-2" />
                      Archive Channel
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Archive this channel?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will hide the channel from the sidebar. Members will no longer be able to send messages.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => archiveMutation.mutate()}>
                        Archive
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {isPrimaryOwner && !activeChannel.is_system && (
                  messageCount === 0 ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          className="flex-1"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Channel
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this channel permanently?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. The channel and all its settings will be permanently removed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteMutation.mutate()}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete Permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex-1">
                          <Button variant="outline" className="w-full" disabled>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Channel
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        This channel has message history and can only be archived
                      </TooltipContent>
                    </Tooltip>
                  )
                )}
              </div>
            </div>
          )}

          {isPrimaryOwner && !isDM && !activeChannel.is_system && !canEdit && (
            messageCount === 0 ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Channel
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this channel permanently?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. The channel and all its settings will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => deleteMutation.mutate()}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete Permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="w-full">
                    <Button variant="outline" className="w-full" disabled>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Channel
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  This channel has message history and can only be archived
                </TooltipContent>
              </Tooltip>
            )
          )}
        </div>
      </div>
    </PremiumFloatingPanel>
  );
}
