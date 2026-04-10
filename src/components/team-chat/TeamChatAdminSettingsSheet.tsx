import { useState } from 'react';
import { Settings } from 'lucide-react';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTeamChatSettings } from '@/hooks/team-chat/useTeamChatSettings';
import { ChannelPermissionsTab } from './settings/ChannelPermissionsTab';
import { DisplaySettingsTab } from './settings/DisplaySettingsTab';
import { MessagingPermissionsTab } from './settings/MessagingPermissionsTab';
import { AutoJoinRulesTab } from './settings/AutoJoinRulesTab';
import { SmartActionsSettingsTab } from './settings/SmartActionsSettingsTab';
import { WelcomeDMsTab } from './settings/WelcomeDMsTab';
import { TeamMembersTab } from './settings/TeamMembersTab';
import { ChatPermissionsTab } from './settings/ChatPermissionsTab';
import { SectionManagementTab } from './settings/SectionManagementTab';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamChatAdminSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamChatAdminSettingsSheet({ open, onOpenChange }: TeamChatAdminSettingsSheetProps) {
  const { settings, isLoading, updateSettings } = useTeamChatSettings();
  const [activeTab, setActiveTab] = useState('channels');

  return (
    <PremiumFloatingPanel open={open} onOpenChange={onOpenChange} maxWidth="720px">
      <div className="p-5 pb-3 border-b border-border/40">
        <h2 className="font-display text-sm tracking-wide uppercase flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Connect Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure permissions, sections, display options, and auto-join rules for Zura Connect
        </p>
      </div>

      {isLoading ? (
        <div className="p-5 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden p-5 pt-3">
          <ResponsiveTabsList onTabChange={setActiveTab}>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="auto-join">Auto</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
          </ResponsiveTabsList>

          <ScrollArea className="flex-1 mt-4 pr-4">
            <TabsContent value="channels" className="mt-0">
              <ChannelPermissionsTab settings={settings} onUpdate={updateSettings} />
            </TabsContent>

            <TabsContent value="sections" className="mt-0">
              <SectionManagementTab />
            </TabsContent>

            <TabsContent value="roles" className="mt-0">
              <ChatPermissionsTab embedded />
            </TabsContent>

            <TabsContent value="auto-join" className="mt-0">
              <AutoJoinRulesTab />
            </TabsContent>

            <TabsContent value="ai" className="mt-0">
              <SmartActionsSettingsTab settings={settings} onUpdate={updateSettings} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      )}
    </PremiumFloatingPanel>
  );
}

// Trigger button component for use in sidebar
export function TeamChatSettingsTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
      title="Connect Settings"
    >
      <Settings className="h-4 w-4" />
    </Button>
  );
}
