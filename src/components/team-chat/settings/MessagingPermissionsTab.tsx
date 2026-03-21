import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { TeamChatSettings, TeamChatSettingsUpdate } from '@/hooks/team-chat/useTeamChatSettings';

interface MessagingPermissionsTabProps {
  settings: TeamChatSettings;
  onUpdate: (updates: TeamChatSettingsUpdate) => void;
}

const MENTION_PERMISSION_OPTIONS = [
  { value: 'admin', label: 'Admins only' },
  { value: 'manager', label: 'Managers and above' },
  { value: 'anyone', label: 'Anyone' },
];

const PIN_PERMISSION_OPTIONS = [
  { value: 'admin', label: 'Admins only' },
  { value: 'channel_admin', label: 'Channel admins' },
  { value: 'anyone', label: 'Anyone' },
];

const DELETE_PERMISSION_OPTIONS = [
  { value: 'admin', label: 'Admins only' },
  { value: 'channel_admin', label: 'Channel admins' },
];

const RETENTION_OPTIONS = [
  { value: 'null', label: 'Forever' },
  { value: '365', label: '1 year' },
  { value: '180', label: '6 months' },
  { value: '90', label: '90 days' },
];

const FILE_SIZE_OPTIONS = [
  { value: '5', label: '5 MB' },
  { value: '10', label: '10 MB' },
  { value: '25', label: '25 MB' },
  { value: '50', label: '50 MB' },
];

export function MessagingPermissionsTab({ settings, onUpdate }: MessagingPermissionsTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Mentions</h3>
        <div className="space-y-2">
          <Label>Who can use @everyone and @channel?</Label>
          <Select
            value={settings.mention_everyone_permission}
            onValueChange={(value) =>
              onUpdate({ mention_everyone_permission: value as TeamChatSettings['mention_everyone_permission'] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MENTION_PERMISSION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Message Actions</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Who can pin messages?</Label>
            <Select
              value={settings.pin_message_permission}
              onValueChange={(value) =>
                onUpdate({ pin_message_permission: value as TeamChatSettings['pin_message_permission'] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIN_PERMISSION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Who can delete others' messages?</Label>
            <Select
              value={settings.delete_others_messages}
              onValueChange={(value) =>
                onUpdate({ delete_others_messages: value as TeamChatSettings['delete_others_messages'] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELETE_PERMISSION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Message Retention</h3>
        <div className="space-y-2">
          <Label>Keep messages for</Label>
          <Select
            value={settings.message_retention_days?.toString() ?? 'null'}
            onValueChange={(value) =>
              onUpdate({ message_retention_days: value === 'null' ? null : parseInt(value) })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RETENTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">File Attachments</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Allow file attachments</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to upload and share files in messages
              </p>
            </div>
            <Switch
              checked={settings.allow_file_attachments}
              onCheckedChange={(checked) => onUpdate({ allow_file_attachments: checked })}
            />
          </div>

          {settings.allow_file_attachments && (
            <div className="space-y-2">
              <Label>Maximum file size</Label>
              <Select
                value={settings.max_file_size_mb.toString()}
                onValueChange={(value) => onUpdate({ max_file_size_mb: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_SIZE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
