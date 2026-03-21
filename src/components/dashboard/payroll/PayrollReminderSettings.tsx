import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Bell, Mail, Smartphone, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ReminderChannels {
  email: boolean;
  push: boolean;
  sms_on_missed: boolean;
}

const REMINDER_DAY_OPTIONS = [
  { value: 5, label: '5 days before' },
  { value: 3, label: '3 days before' },
  { value: 1, label: '1 day before' },
  { value: 0, label: 'Day of deadline' },
];

export function PayrollReminderSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['payroll-reminder-settings'],
    queryFn: async () => {
      // Get org id from employee profile
      const { data: profile } = await supabase
        .from('employee_profiles')
        .select('organization_id')
        .eq('user_id', user!.id)
        .single();
      if (!profile) return null;

      const { data, error } = await supabase
        .from('organization_payroll_settings')
        .select('organization_id, reminder_enabled, reminder_days_before, reminder_channels')
        .eq('organization_id', profile.organization_id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  const [enabled, setEnabled] = useState(true);
  const [daysBefore, setDaysBefore] = useState<number[]>([3, 1, 0]);
  const [channels, setChannels] = useState<ReminderChannels>({ email: true, push: true, sms_on_missed: true });

  useEffect(() => {
    if (settings) {
      setEnabled(settings.reminder_enabled ?? true);
      setDaysBefore((settings.reminder_days_before as number[]) ?? [3, 1, 0]);
      const ch = settings.reminder_channels as unknown as ReminderChannels | null;
      setChannels(ch ?? { email: true, push: true, sms_on_missed: true });
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!settings?.organization_id) throw new Error('No payroll settings found');
      const { error } = await supabase
        .from('organization_payroll_settings')
        .update({
          reminder_enabled: enabled,
          reminder_days_before: daysBefore,
          reminder_channels: channels as any,
        })
        .eq('organization_id', settings.organization_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reminder settings saved');
      queryClient.invalidateQueries({ queryKey: ['payroll-reminder-settings'] });
    },
    onError: (err: Error) => toast.error('Failed to save', { description: err.message }),
  });

  const toggleDay = (day: number) => {
    setDaysBefore(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => b - a)
    );
  };

  const hasChanges =
    settings &&
    (enabled !== (settings.reminder_enabled ?? true) ||
      JSON.stringify(daysBefore) !== JSON.stringify((settings.reminder_days_before as number[]) ?? [3, 1, 0]) ||
      JSON.stringify(channels) !== JSON.stringify((settings.reminder_channels as unknown as ReminderChannels | null) ?? { email: true, push: true, sms_on_missed: true }));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Payroll Reminders</CardTitle>
          </div>
          <CardDescription>
            Configure a pay schedule first to enable deadline reminders.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Payroll Reminders</CardTitle>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <CardDescription>
          Automatically notify payroll admins before submission deadlines.
        </CardDescription>
      </CardHeader>
      <CardContent className={`space-y-6 ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Reminder Timing */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Reminder Timing</Label>
          <p className="text-xs text-muted-foreground">Choose when to send deadline reminders.</p>
          <div className="grid grid-cols-2 gap-3">
            {REMINDER_DAY_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={daysBefore.includes(opt.value)}
                  onCheckedChange={() => toggleDay(opt.value)}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notification Channels */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Notification Channels</Label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Email</span>
              </div>
              <Switch
                checked={channels.email}
                onCheckedChange={v => setChannels(prev => ({ ...prev, email: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Push Notification</span>
              </div>
              <Switch
                checked={channels.push}
                onCheckedChange={v => setChannels(prev => ({ ...prev, push: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">SMS on Missed Deadline</span>
              </div>
              <Switch
                checked={channels.sms_on_missed}
                onCheckedChange={v => setChannels(prev => ({ ...prev, sms_on_missed: v }))}
              />
            </div>
          </div>
        </div>

        {/* Save */}
        {hasChanges && (
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full">
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Reminder Settings
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
