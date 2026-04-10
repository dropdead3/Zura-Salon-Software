import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Hash, MapPin, Lock, Plus, ChevronDown, ChevronRight, Users, Settings, Sparkles, Folder } from 'lucide-react';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useChatChannels, useInitializeDefaultChannels, type ChannelWithMembership } from '@/hooks/team-chat/useChatChannels';
import { useAutoJoinLocationChannels } from '@/hooks/team-chat/useAutoJoinLocationChannels';
import { useUnreadMessages } from '@/hooks/team-chat/useUnreadMessages';
import { useTeamChatContext } from '@/contexts/TeamChatContext';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useChatSections } from '@/hooks/team-chat/useChatSections';
import { useChatLayoutPreferences } from '@/hooks/team-chat/useChatLayoutPreferences';
import { useHasChatPermission, CHAT_PERMISSION_KEYS } from '@/hooks/team-chat/useChatPermissions';
import { CreateChannelDialog } from './CreateChannelDialog';
import { StartDMDialog } from './StartDMDialog';
import { TeamChatAdminSettingsSheet } from './TeamChatAdminSettingsSheet';
import { AIChatPanel } from './AIChatPanel';
import { SortableChannelItem } from './SortableChannelItem';
import { SortableSidebarSection } from './SortableSidebarSection';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getChannelDisplayName, getChannelAvatarUrl } from '@/hooks/team-chat/useChannelDisplayName';

// Role priority for sorting DMs (lower = higher priority)
const ROLE_PRIORITY: Record<string, number> = {
  super_admin: 1,
  admin: 2,
  manager: 3,
  stylist: 4,
  receptionist: 5,
  stylist_assistant: 6,
  admin_assistant: 7,
  operations_assistant: 8,
  booth_renter: 9,
  bookkeeper: 10,
  assistant: 11,
};

const channelTypeIcons: Record<string, typeof Hash> = {
  public: Hash,
  private: Lock,
  location: MapPin,
  dm: Users,
  group_dm: Users,
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Non-sortable channel item for drag overlay
function ChannelItemOverlay({ channel }: { channel: ChannelWithMembership }) {
  const Icon = channelTypeIcons[channel.type] || Hash;
  const isDM = channel.type === 'dm' || channel.type === 'group_dm';
  const avatarUrl = getChannelAvatarUrl(channel);
  const displayName = getChannelDisplayName(channel);

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded text-[13px] bg-sidebar-accent shadow-lg text-sidebar-foreground">
      {isDM ? (
        <Avatar className="h-5 w-5 shrink-0">
          <AvatarImage src={avatarUrl || undefined} alt={displayName} />
          <AvatarFallback className="text-[9px] bg-sidebar-accent text-sidebar-foreground/60">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <Icon className="h-4 w-4 shrink-0 text-sidebar-foreground/40" />
      )}
      <span className="truncate flex-1 text-left">{displayName}</span>
    </div>
  );
}

// Section types for ordering
interface SectionConfig {
  id: string;
  type: 'default' | 'custom' | 'locations' | 'direct';
  name: string;
  icon?: React.ReactNode;
  showAddButton?: boolean;
  onAddClick?: () => void;
}

export function ChannelSidebar() {
  const location = useLocation();
  const { channels, isLoading, joinChannel } = useChatChannels();
  const { activeChannel, setActiveChannel } = useTeamChatContext();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: profile } = useEmployeeProfile();
  const { sections } = useChatSections();
  const { 
    preferences,
    isSectionCollapsed, 
    toggleSectionCollapsed,
    setSectionsOrder,
    setChannelsOrder,
  } = useChatLayoutPreferences();
  const canCreateChannel = useHasChatPermission(CHAT_PERMISSION_KEYS.CREATE_CHANNEL);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDMOpen, setIsDMOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [draggedChannel, setDraggedChannel] = useState<ChannelWithMembership | null>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  
  // Local state for section collapse (fallback + immediate UI)
  const [localCollapsed, setLocalCollapsed] = useState<Record<string, boolean>>({});

  // Only super admins can access settings
  const canAccessSettings = profile?.is_super_admin === true || profile?.is_primary_owner === true;
  
  // Check if organization is multi-location
  const isMultiLocation = effectiveOrganization?.is_multi_location ?? true;

  const channelIds = channels.map((c) => c.id);
  const { getUnreadCount, markAsRead } = useUnreadMessages(channelIds);

  const initializeChannels = useInitializeDefaultChannels();
  const autoJoinChannels = useAutoJoinLocationChannels();
  const hasAutoJoined = useRef(false);
  const hasInitialized = useRef(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activation
      },
    })
  );

  // Initialize default channels on first load if none exist
  useEffect(() => {
    if (!isLoading && channels.length === 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      initializeChannels.mutate();
    }
  }, [isLoading, channels.length]);

  // Auto-join user to appropriate channels based on their profile
  useEffect(() => {
    if (!isLoading && channels.length > 0 && !hasAutoJoined.current) {
      hasAutoJoined.current = true;
      autoJoinChannels.mutate();
    }
  }, [isLoading, channels.length]);

  // Auto-select first channel
  useEffect(() => {
    if (!activeChannel && channels.length > 0) {
      const generalChannel = channels.find((c) => c.name === 'general');
      setActiveChannel(generalChannel || channels[0]);
    }
  }, [channels, activeChannel, setActiveChannel]);

  // Deep-link: auto-select channel from navigation state (e.g., birthday DM)
  useEffect(() => {
    const openChannelId = location.state?.openChannelId;
    if (openChannelId && channels.length > 0) {
      const target = channels.find((c) => c.id === openChannelId);
      if (target) {
        setActiveChannel(target);
        window.history.replaceState({}, '');
      }
    }
  }, [location.state, channels, setActiveChannel]);

  // Build all section configs with user ordering
  const allSectionConfigs = useMemo((): SectionConfig[] => {
    const baseSections: SectionConfig[] = [
      { 
        id: 'default', 
        type: 'default', 
        name: 'Channels', 
        showAddButton: canCreateChannel,
        onAddClick: () => setIsCreateOpen(true),
      },
      ...sections.map(s => ({
        id: s.id,
        type: 'custom' as const,
        name: s.name,
        icon: <Folder className="h-3 w-3 mr-1" />,
      })),
    ];

    // Add locations section if multi-location
    if (isMultiLocation) {
      baseSections.push({
        id: 'locations',
        type: 'locations',
        name: 'Locations',
      });
    }

    // Add direct messages section
    baseSections.push({
      id: 'direct',
      type: 'direct',
      name: 'Direct Messages',
      showAddButton: true,
      onAddClick: () => setIsDMOpen(true),
    });

    // Apply user's section order preference
    const userOrder = preferences.sections_order;
    if (userOrder && userOrder.length > 0) {
      const orderedSections: SectionConfig[] = [];
      const sectionMap = new Map(baseSections.map(s => [s.id, s]));
      
      // Add sections in user's preferred order
      userOrder.forEach(id => {
        const section = sectionMap.get(id);
        if (section) {
          orderedSections.push(section);
          sectionMap.delete(id);
        }
      });
      
      // Add any remaining sections not in user's order
      sectionMap.forEach(section => orderedSections.push(section));
      
      return orderedSections;
    }

    return baseSections;
  }, [sections, isMultiLocation, canCreateChannel, preferences.sections_order]);

  // Group channels by section
  const channelsBySection = useMemo(() => {
    const result: Record<string, ChannelWithMembership[]> = {
      default: [],
      locations: [],
      direct: [],
    };

    // Initialize custom sections
    sections.forEach(s => {
      result[s.id] = [];
    });

    channels.forEach(channel => {
      if (channel.type === 'dm' || channel.type === 'group_dm') {
        result.direct.push(channel);
      } else if (channel.type === 'location') {
        result.locations.push(channel);
      } else if (channel.section_id && result[channel.section_id]) {
        result[channel.section_id].push(channel);
      } else {
        result.default.push(channel);
      }
    });

    return result;
  }, [channels, sections]);

  // Get ordered channels for a section (apply user preferences)
  const getOrderedChannels = useCallback((sectionId: string, sectionChannels: ChannelWithMembership[]) => {
    const userOrder = preferences.channels_order[sectionId];
    if (!userOrder || userOrder.length === 0) {
      return sectionChannels;
    }

    const channelMap = new Map(sectionChannels.map(c => [c.id, c]));
    const ordered: ChannelWithMembership[] = [];

    // Add channels in user's preferred order
    userOrder.forEach(id => {
      const channel = channelMap.get(id);
      if (channel) {
        ordered.push(channel);
        channelMap.delete(id);
      }
    });

    // Add remaining channels not in user's order
    channelMap.forEach(channel => ordered.push(channel));

    return ordered;
  }, [preferences.channels_order]);

  // Sort DM channels by role hierarchy
  const sortedDmChannels = useMemo(() => {
    const dms = channelsBySection.direct || [];
    return dms.sort((a, b) => {
      const getRolePriority = (roles: string[] | undefined) => {
        if (!roles || roles.length === 0) return 99;
        return Math.min(...roles.map((r) => ROLE_PRIORITY[r] ?? 99));
      };
      
      const priorityA = getRolePriority(a.dm_partner?.roles);
      const priorityB = getRolePriority(b.dm_partner?.roles);
      
      if (priorityA !== priorityB) return priorityA - priorityB;
      
      const nameA = a.dm_partner?.display_name || '';
      const nameB = b.dm_partner?.display_name || '';
      return nameA.localeCompare(nameB);
    });
  }, [channelsBySection.direct]);

  const handleChannelClick = (channel: ChannelWithMembership) => {
    if (!channel.membership && (channel.type === 'public' || channel.type === 'location')) {
      joinChannel(channel.id);
    }
    setActiveChannel(channel);
    if (channel.membership) {
      markAsRead(channel.id);
    }
  };

  const isSectionOpen = (sectionId: string): boolean => {
    if (localCollapsed[sectionId] !== undefined) {
      return !localCollapsed[sectionId];
    }
    return !isSectionCollapsed(sectionId);
  };

  const handleToggleSection = (sectionId: string) => {
    setLocalCollapsed(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId] ? true : !prev[sectionId]
    }));
    toggleSectionCollapsed(sectionId);
  };

  // Handle channel drag end
  const handleChannelDragEnd = (event: DragEndEvent, sectionId: string) => {
    const { active, over } = event;
    setDraggedChannel(null);
    
    if (!over || active.id === over.id) return;

    const sectionChannels = sectionId === 'direct' 
      ? sortedDmChannels 
      : getOrderedChannels(sectionId, channelsBySection[sectionId] || []);
    
    const oldIndex = sectionChannels.findIndex(c => c.id === active.id);
    const newIndex = sectionChannels.findIndex(c => c.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(sectionChannels, oldIndex, newIndex);
      setChannelsOrder(sectionId, newOrder.map(c => c.id));
    }
  };

  // Handle section drag start
  const handleSectionDragStart = (event: DragStartEvent) => {
    setDraggedSectionId(event.active.id as string);
  };

  // Handle section drag end
  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedSectionId(null);
    
    if (!over || active.id === over.id) return;

    const oldIndex = allSectionConfigs.findIndex(s => s.id === active.id);
    const newIndex = allSectionConfigs.findIndex(s => s.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(allSectionConfigs, oldIndex, newIndex);
      setSectionsOrder(newOrder.map(s => s.id));
    }
  };

  // Handle channel drag start
  const handleChannelDragStart = (event: DragStartEvent) => {
    const channelId = event.active.id as string;
    const channel = channels.find(c => c.id === channelId);
    if (channel) {
      setDraggedChannel(channel);
    }
  };

  // Render section content based on type
  const renderSectionContent = (config: SectionConfig) => {
    const sectionChannels = config.id === 'direct'
      ? sortedDmChannels
      : config.id === 'locations'
        ? channelsBySection.locations
        : getOrderedChannels(config.id, channelsBySection[config.id] || []);

    const channelIdList = sectionChannels.map(c => c.id);
    const isDragDisabled = config.id === 'direct'; // DMs use role-based sorting

    if (sectionChannels.length === 0) {
      if (config.id === 'direct') {
        return (
          <p className="text-[11px] text-sidebar-foreground/30 px-4 py-1.5">
            Click + to start a conversation
          </p>
        );
      }
      if (config.type === 'custom') {
        return (
          <p className="text-[11px] text-sidebar-foreground/30 px-4 py-1.5">
            No channels in this section
          </p>
        );
      }
      return null;
    }

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleChannelDragStart}
        onDragEnd={(e) => handleChannelDragEnd(e, config.id)}
      >
        <SortableContext items={channelIdList} strategy={verticalListSortingStrategy}>
          {sectionChannels.map((channel) => (
            <SortableChannelItem
              key={channel.id}
              channel={channel}
              isActive={activeChannel?.id === channel.id}
              onClick={() => handleChannelClick(channel)}
              unreadCount={getUnreadCount(channel.id)}
              isDragEnabled={!isDragDisabled}
            />
          ))}
        </SortableContext>
        <DragOverlay>
          {draggedChannel && <ChannelItemOverlay channel={draggedChannel} />}
        </DragOverlay>
      </DndContext>
    );
  };

  // Skip locations section if empty
  const visibleSections = allSectionConfigs.filter(config => {
    if (config.id === 'locations') {
      return channelsBySection.locations.length > 0;
    }
    return true;
  });

  const sectionIds = visibleSections.map(s => s.id);

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="px-4 py-3 border-b border-sidebar-border flex items-center justify-between">
        <h2 className="font-display text-sm uppercase tracking-wider text-sidebar-foreground">Connect</h2>
        <div className="flex items-center gap-0.5">
          {canAccessSettings && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setIsSettingsOpen(true)}
              title="Connect Settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2 space-y-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleSectionDragStart}
            onDragEnd={handleSectionDragEnd}
          >
            <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
              {visibleSections.map((config) => (
                <SortableSidebarSection
                  key={config.id}
                  id={config.id}
                  title={config.name}
                  icon={config.icon}
                  isOpen={isSectionOpen(config.id)}
                  onToggle={() => handleToggleSection(config.id)}
                  showAddButton={config.showAddButton}
                  onAddClick={config.onAddClick}
                  isDragEnabled={true}
                >
                  {renderSectionContent(config)}
                </SortableSidebarSection>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </ScrollArea>

      <CreateChannelDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <StartDMDialog open={isDMOpen} onOpenChange={setIsDMOpen} />
      <TeamChatAdminSettingsSheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <AIChatPanel open={isAIChatOpen} onOpenChange={setIsAIChatOpen} />
    </div>
  );
}
