import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, KeyRound, AlertTriangle, Bell, Archive, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { tokens } from '@/lib/design-tokens';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useToggleUserActive, useOrganizationUsers } from '@/hooks/useOrganizationUsers';
import { useUserPinStatus, useAdminSetUserPin } from '@/hooks/useUserPin';
import { useUnarchiveTeamMember, useArchiveLogEntry } from '@/hooks/useArchiveTeamMember';
import { ArchiveWizard } from '@/components/dashboard/team-members/archive/ArchiveWizard';

interface Props {
  userId: string;
  profile: any;
}

export function SecurityTab({ userId, profile }: Props) {
  const queryClient = useQueryClient();
  const { effectiveOrganization } = useOrganizationContext();
  const toggleActive = useToggleUserActive(effectiveOrganization?.id);
  const unarchive = useUnarchiveTeamMember(effectiveOrganization?.id);
  const { data: archiveLog } = useArchiveLogEntry(effectiveOrganization?.id, userId);
  // Need the full member shape for the archive wizard. Fetch from roster (includes archived).
  const { data: roster = [] } = useOrganizationUsers(effectiveOrganization?.id, { includeArchived: true });
  const member = roster.find((m) => m.user_id === userId);
  const isArchived = !!profile?.archived_at;
  const [archiveOpen, setArchiveOpen] = useState(false);
  const { data: pinStatus } = useUserPinStatus(userId);
  const adminSetPin = useAdminSetUserPin();
  const [newPin, setNewPin] = useState('');

  // Notification preferences
  const { data: prefs, isLoading: prefsLoading } = useQuery({
    queryKey: ['team-member-notif-prefs', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const updatePref = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-member-notif-prefs', userId] });
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update preference'),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <CardTitle className="font-display text-base tracking-wide">LOGIN PIN</CardTitle>
          </div>
          <CardDescription>4-digit PIN used for Dock check-in and quick clock-in flows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={pinStatus?.hasPin ? 'secondary' : 'outline'} className="text-xs">
              {pinStatus?.hasPin ? 'PIN set' : 'No PIN set'}
            </Badge>
          </div>
          <div className="flex items-end gap-2 max-w-sm">
            <div className="flex-1">
              <Label htmlFor="new_pin">Set / reset PIN (4 digits)</Label>
              <Input
                id="new_pin"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                maxLength={4}
                inputMode="numeric"
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (newPin.length !== 4) {
                  toast.error('PIN must be 4 digits');
                  return;
                }
                adminSetPin.mutate({ targetUserId: userId, pin: newPin, reason: 'PIN set from Team Member detail page' }, {
                  onSuccess: () => setNewPin(''),
                });
              }}
              disabled={adminSetPin.isPending || newPin.length !== 4}
            >
              {adminSetPin.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="font-display text-base tracking-wide">NOTIFICATIONS</CardTitle>
          </div>
          <CardDescription>Adjust which notifications this team member receives.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="prefs">
              <AccordionTrigger>Notification preferences</AccordionTrigger>
              <AccordionContent>
                {prefsLoading ? (
                  <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="space-y-3 pt-2">
                    {[
                      { key: 'high_five_enabled', label: 'High-five notifications' },
                      { key: 'announcement_enabled', label: 'Announcements' },
                      { key: 'birthday_reminder_enabled', label: 'Birthday reminders' },
                      { key: 'meeting_reminder_enabled', label: 'Meeting reminders' },
                      { key: 'task_reminder_enabled', label: 'Task reminders' },
                      { key: 'email_notifications_enabled', label: 'Email notifications' },
                      { key: 'payroll_deadline_enabled', label: 'Payroll deadlines' },
                    ].map(({ key, label }) => {
                      const value = prefs ? !!(prefs as any)[key] : true;
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <Label htmlFor={key} className="font-sans text-sm">{label}</Label>
                          <Switch
                            id={key}
                            checked={value}
                            onCheckedChange={(v) => updatePref.mutate({ [key]: v })}
                            disabled={updatePref.isPending}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="activity">
              <AccordionTrigger>Recent activity</AccordionTrigger>
              <AccordionContent>
                <p className={tokens.body.muted + ' text-sm italic'}>
                  A unified per-user activity log is not yet wired up. This will appear here once the audit feed lands.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="font-display text-base tracking-wide">ACCOUNT STATUS</CardTitle>
          </div>
          <CardDescription>Activate, deactivate, or remove this team member from the organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/60">
            <div>
              <p className="font-sans text-sm font-medium text-foreground">Active</p>
              <p className="font-sans text-xs text-muted-foreground">Inactive members can't log in or be assigned work.</p>
            </div>
            <Switch
              checked={!!profile.is_active}
              onCheckedChange={(v) => toggleActive.mutate({ userId, isActive: v })}
              disabled={toggleActive.isPending}
            />
          </div>

          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="font-sans text-sm font-medium text-foreground">Remove from organization</p>
                <p className="font-sans text-xs text-muted-foreground">Deactivates and unlinks this user. Their historical data stays intact.</p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm('Remove this team member from the organization? They will no longer be able to log in.')) {
                  removeUser.mutate(userId);
                }
              }}
              disabled={removeUser.isPending}
            >
              Remove
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
