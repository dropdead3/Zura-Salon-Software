import { cn } from '@/lib/utils';
import { TeamChatProvider, useTeamChatContext } from '@/contexts/TeamChatContext';
import { SmartActionProvider } from '@/contexts/SmartActionContext';
import { ChannelSidebar } from './ChannelSidebar';
import { ChannelHeader } from './ChannelHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ThreadPanel } from './ThreadPanel';

function TeamChatLayout() {
  const { isSidebarOpen, threadMessageId } = useTeamChatContext();

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          'w-64 shrink-0 transition-all duration-200 border-r border-border/60',
          'hidden lg:block',
          !isSidebarOpen && 'lg:hidden'
        )}
      >
        <ChannelSidebar />
      </div>

      {/* Mobile sidebar overlay */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          isSidebarOpen ? 'block' : 'hidden'
        )}
        style={{ top: 'var(--god-mode-offset, 0px)' }}
      >
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => {}}
        />
        <div className="absolute inset-y-0 left-0 w-64">
          <ChannelSidebar />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChannelHeader />
        <MessageList />
        <MessageInput />
      </div>

      {/* Thread panel */}
      {threadMessageId && <ThreadPanel />}
    </div>
  );
}

export function TeamChatContainer() {
  return (
    <TeamChatProvider>
      <SmartActionProvider>
        <TeamChatLayout />
      </SmartActionProvider>
    </TeamChatProvider>
  );
}
