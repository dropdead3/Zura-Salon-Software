import { useState } from 'react';
import { Hash, MapPin, Lock, Users, Settings, Menu, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTeamChatContext } from '@/contexts/TeamChatContext';
import { usePlatformPresenceContext } from '@/contexts/PlatformPresenceContext';
import { usePinnedMessages } from '@/hooks/team-chat/usePinnedMessages';
import { getChannelDisplayName } from '@/hooks/team-chat/useChannelDisplayName';
import { PinnedMessagesSheet } from './PinnedMessagesSheet';
import { ChannelSettingsSheet } from './ChannelSettingsSheet';
import { ChannelMembersSheet } from './ChannelMembersSheet';
import { ExpandableSearch } from './ExpandableSearch';
import { Badge } from '@/components/ui/badge';

const channelTypeIcons: Record<string, typeof Hash> = {
  public: Hash,
  private: Lock,
  location: MapPin,
  dm: Users,
  group_dm: Users,
};

export function ChannelHeader() {
  const { activeChannel, toggleSidebar } = useTeamChatContext();
  const { onlineCount } = usePlatformPresenceContext();
  const { pinnedCount } = usePinnedMessages(activeChannel?.id || null);

  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  if (!activeChannel) {
    return (
      <div className="h-14 border-b flex items-center px-4">
        <Button variant="ghost" size="icon" className="lg:hidden mr-2" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-muted-foreground">Select a conversation</span>
      </div>
    );
  }

  const Icon = channelTypeIcons[activeChannel.type] || Hash;

  return (
    <>
      <div className="h-14 border-b border-border/50 flex items-center justify-between px-4 relative">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <h1 className="font-medium">{getChannelDisplayName(activeChannel)}</h1>
          </div>

          {activeChannel.description && !isSearchExpanded && (
            <span className="hidden md:inline text-sm text-muted-foreground border-l pl-3 ml-1">
              {activeChannel.description}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isSearchExpanded && (
            <>
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground mr-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{onlineCount} online</span>
              </div>
            </>
          )}

          <ExpandableSearch isExpanded={isSearchExpanded} onExpandedChange={setIsSearchExpanded} />

          {!isSearchExpanded && (
            <>
              <Button variant="ghost" size="icon" className="relative" onClick={() => setIsPinnedOpen(true)}>
                <Pin className="h-5 w-5" />
                {pinnedCount > 0 && (
                  <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]">
                    {pinnedCount}
                  </Badge>
                )}
              </Button>

              <Button variant="ghost" size="icon" onClick={() => setIsMembersOpen(true)}>
                <Users className="h-5 w-5" />
              </Button>

              <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
                <Settings className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>

      <PinnedMessagesSheet open={isPinnedOpen} onOpenChange={setIsPinnedOpen} />
      <ChannelSettingsSheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <ChannelMembersSheet open={isMembersOpen} onOpenChange={setIsMembersOpen} />
    </>
  );
}
