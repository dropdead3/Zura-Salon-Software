import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Hand, Megaphone, Cake, Calendar, CheckSquare, Mail, Loader2, Save, Smartphone, BellRing, Send, AlertTriangle, Sparkles } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { PLATFORM_NAME } from '@/lib/brand';
import { PageExplainer } from '@/components/ui/PageExplainer';

interface PreferenceItem {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const inAppPreferences: PreferenceItem[] = [
  {
    key: 'high_five_enabled',
    label: 'High Fives',
    description: 'Get notified when someone gives you a high five on your bell ring',
    icon: <Hand className="w-5 h-5" />,
  },
  {
    key: 'announcement_enabled',
    label: 'Announcements',
    description: 'Receive notifications for new team announcements',
    icon: <Megaphone className="w-5 h-5" />,
  },
  {
    key: 'birthday_reminder_enabled',
    label: 'Birthday Reminders',
    description: 'Get reminded about upcoming team birthdays',
    icon: <Cake className="w-5 h-5" />,
  },
  {
    key: 'meeting_reminder_enabled',
    label: 'Meeting Reminders',
    description: 'Receive reminders for scheduled 1-on-1 meetings',
    icon: <Calendar className="w-5 h-5" />,
  },
  {
    key: 'task_reminder_enabled',
    label: 'Task Reminders',
    description: 'Get notified about upcoming and overdue tasks',
    icon: <CheckSquare className="w-5 h-5" />,
  },
];

export default function NotificationPreferences() {
  const { user } = useAuth();
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const [isSendingTest, setIsSendingTest] = useState(false);
  const {
    isSupported: isPushSupported,
    permission: pushPermission,
    isSubscribed: isPushSubscribed,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    isSubscribing,
    isUnsubscribing,
    sendTestNotification,
  } = usePushNotifications();
  
  const [localPrefs, setLocalPrefs] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local state from fetched preferences
  useEffect(() => {
    if (preferences) {
      const prefs: Record<string, any> = {};
      inAppPreferences.forEach(pref => {
        prefs[pref.key] = (preferences as any)[pref.key] ?? true;
      });
      prefs['email_notifications_enabled'] = (preferences as any).email_notifications_enabled ?? false;
      prefs['insights_email_enabled'] = (preferences as any).insights_email_enabled ?? false;
      prefs['insights_email_frequency'] = (preferences as any).insights_email_frequency ?? 'weekly';
      setLocalPrefs(prefs);
    }
  }, [preferences]);

  const handleToggle = (key: string, value: any) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSendTestInsightsEmail = async () => {
    if (!user?.id) return;
    setIsSendingTest(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-insights-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: user.id }),
        }
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send test email');
      }
      toast.success('Test insights email sent! Check your inbox.');
    } catch (err) {
      console.error('Failed to send test insights email:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSave = async () => {
    await updatePreferences.mutateAsync(localPrefs);
    setHasChanges(false);
  };

  const handleDiscard = () => {
    if (preferences) {
      const prefs: Record<string, any> = {};
      inAppPreferences.forEach(pref => {
        prefs[pref.key] = (preferences as any)[pref.key] ?? true;
      });
      prefs['email_notifications_enabled'] = (preferences as any).email_notifications_enabled ?? false;
      prefs['insights_email_enabled'] = (preferences as any).insights_email_enabled ?? false;
      prefs['insights_email_frequency'] = (preferences as any).insights_email_frequency ?? 'weekly';
      setLocalPrefs(prefs);
    }
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <DashboardLoader size="lg" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
        <DashboardPageHeader
          title="Notification Preferences"
          description="Choose which notifications you'd like to receive"
        />
        <PageExplainer pageId="notification-preferences" />

        {/* In-App Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-display tracking-wide">In-App Notifications</CardTitle>
                <CardDescription>Notifications that appear in your dashboard</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {inAppPreferences.map((pref, index) => (
              <div key={pref.key}>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      {pref.icon}
                    </div>
                    <div>
                      <Label htmlFor={pref.key} className="text-sm font-medium cursor-pointer">
                        {pref.label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pref.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={pref.key}
                    checked={localPrefs[pref.key] ?? true}
                    onCheckedChange={(checked) => handleToggle(pref.key, checked)}
                  />
                </div>
                {index < inAppPreferences.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-display tracking-wide">Push Notifications</CardTitle>
                <CardDescription>Get real-time alerts on your device</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!isPushSupported ? (
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">Not Supported</p>
                  <p className="text-xs text-muted-foreground">
                    Push notifications are not supported in this browser
                  </p>
                </div>
              </div>
            ) : pushPermission === 'denied' ? (
              <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium">Notifications Blocked</p>
                  <p className="text-xs text-muted-foreground">
                    Enable notifications in your browser settings to receive alerts
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <BellRing className="w-5 h-5" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium flex items-center gap-2">
                        Enable Push Notifications
                        {isPushSubscribed && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                            Active
                          </Badge>
                        )}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Receive instant alerts even when the app is closed
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isPushSubscribed}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        subscribePush();
                      } else {
                        unsubscribePush();
                      }
                    }}
                    disabled={isSubscribing || isUnsubscribing}
                  />
                </div>
                
                {isPushSubscribed && (
                  <div className="pt-2 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={sendTestNotification}
                      className="w-full"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Test Notification
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-display tracking-wide">Email Notifications</CardTitle>
                <CardDescription>Receive notifications via email</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="email_notifications" className="text-sm font-medium cursor-pointer">
                  Enable Email Notifications
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Get important notifications sent to your email
                </p>
              </div>
              <Switch
                id="email_notifications"
                checked={localPrefs['email_notifications_enabled'] ?? false}
                onCheckedChange={(checked) => handleToggle('email_notifications_enabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Insights Email */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-display tracking-wide">{PLATFORM_NAME} Insights Email</CardTitle>
                <CardDescription>Receive your personalized AI insights as a beautiful email report</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="insights_email" className="text-sm font-medium cursor-pointer">
                  Enable Insights Email
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Get a curated digest of your {PLATFORM_NAME} insights delivered to your inbox
                </p>
              </div>
              <Switch
                id="insights_email"
                checked={localPrefs['insights_email_enabled'] ?? false}
                onCheckedChange={(checked) => handleToggle('insights_email_enabled', checked)}
              />
            </div>

            {localPrefs['insights_email_enabled'] && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Delivery Frequency</Label>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                      How often would you like to receive your insights?
                    </p>
                    <Select
                      value={localPrefs['insights_email_frequency'] || 'weekly'}
                      onValueChange={(value) => handleToggle('insights_email_frequency', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">📅 Daily Digest</SelectItem>
                        <SelectItem value="weekly">📊 Weekly Summary</SelectItem>
                        <SelectItem value="monday">☕ Monday Briefing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(preferences as any)?.insights_email_next_at && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Next delivery: {new Date((preferences as any).insights_email_next_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleSendTestInsightsEmail}
                    disabled={isSendingTest}
                  >
                    {isSendingTest ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Send Test Email
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sticky Save Bar */}
        <AnimatePresence>
          {hasChanges && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-0 left-0 right-0 z-50 p-4 md:pl-[280px]"
            >
              <div className="max-w-2xl mx-auto">
                <div className="bg-card/80 backdrop-blur-xl rounded-full shadow-[0_16px_40px_-18px_hsl(var(--foreground)/0.25)] border border-border/40 px-5 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm font-medium text-foreground">You have unsaved changes</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60" onClick={handleDiscard}>
                      Discard
                    </Button>
                    <Button size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSave} disabled={updatePreferences.isPending}>
                      {updatePreferences.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-1" />
                      )}
                      Save Preferences
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
