import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { useChatChannels } from '@/hooks/team-chat/useChatChannels';
import { useTeamChatRoleAutoJoin } from '@/hooks/team-chat/useTeamChatRoleAutoJoin';
import { useRoles } from '@/hooks/useRoles';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function AutoJoinRulesTab() {
  const { channels } = useChatChannels();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { rules, setRulesForRole, isUpdating } = useTeamChatRoleAutoJoin();
  const [pendingChanges, setPendingChanges] = useState<Record<string, string[]>>({});

  // Filter to joinable channels (public, location, or private non-archived)
  const joinableChannels = channels.filter(
    (c) => (c.type === 'public' || c.type === 'location' || c.type === 'private') && !c.is_archived
  );

  // Get current channel IDs for a role (from rules or pending changes)
  const getChannelsForRole = (role: string): string[] => {
    if (pendingChanges[role] !== undefined) {
      return pendingChanges[role];
    }
    return rules
      .filter((r) => r.role === role)
      .map((r) => r.channel_id);
  };

  const handleToggleChannel = (role: string, channelId: string, checked: boolean) => {
    const currentChannels = getChannelsForRole(role);
    const newChannels = checked
      ? [...currentChannels, channelId]
      : currentChannels.filter((id) => id !== channelId);
    
    setPendingChanges((prev) => ({
      ...prev,
      [role]: newChannels,
    }));
  };

  const handleSaveRole = (role: string) => {
    const channelIds = pendingChanges[role];
    if (channelIds !== undefined) {
      setRulesForRole({ role, channelIds });
      // Clear pending changes for this role after saving
      setPendingChanges((prev) => {
        const next = { ...prev };
        delete next[role];
        return next;
      });
    }
  };

  const hasChangesForRole = (role: string): boolean => {
    return pendingChanges[role] !== undefined;
  };

  if (rolesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Role-Based Auto-Join</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Configure which channels each role automatically joins when added to the team
        </p>
      </div>

      <div className="space-y-6">
        {roles?.map((role) => (
          <div key={role.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">
                {role.display_name}
              </Label>
              {hasChangesForRole(role.name) && (
                <Button
                  size="sm"
                  onClick={() => handleSaveRole(role.name)}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Save'
                  )}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {joinableChannels.map((channel) => {
                const isChecked = getChannelsForRole(role.name).includes(channel.id);
                return (
                  <div key={channel.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${role.name}-${channel.id}`}
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleToggleChannel(role.name, channel.id, checked === true)
                      }
                    />
                    <Label
                      htmlFor={`${role.name}-${channel.id}`}
                      className={cn(
                        'font-normal cursor-pointer text-sm',
                        channel.type === 'location' && 'text-muted-foreground'
                      )}
                    >
                      #{channel.name}
                      {channel.type === 'location' && ' (location)'}
                    </Label>
                  </div>
                );
              })}
            </div>
            {joinableChannels.length === 0 && (
              <p className="text-sm text-muted-foreground">No channels available</p>
            )}
          </div>
        ))}
        {(!roles || roles.length === 0) && (
          <p className="text-sm text-muted-foreground">No roles configured</p>
        )}
      </div>
    </div>
  );
}
