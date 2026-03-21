import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useNavigate } from 'react-router-dom';
import { PLATFORM_NAME } from '@/lib/brand';
import { 
  Link2, 
  Plus, 
  Pause, 
  Play, 
  Trash2, 
  Settings, 
  CheckCircle2, 
  XCircle,
  Calendar,
  DollarSign,
  Users,
} from 'lucide-react';
import { usePhorestConnection } from '@/hooks/usePhorestSync';
import { CalendarSubscribeModal } from '@/components/dashboard/CalendarSubscribeModal';
import { useCalendarFeedToken } from '@/hooks/useCalendarFeedToken';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'connected' | 'paused' | 'not_connected';
  configPath?: string;
  features: string[];
  available: boolean;
}

export function IntegrationsTab() {
  const navigate = useNavigate();
  const { data: phorestConnection } = usePhorestConnection();
  const { token: calFeedToken, loading: calFeedLoading } = useCalendarFeedToken();
  const [calSyncOpen, setCalSyncOpen] = useState(false);
  const [pausedIntegrations, setPausedIntegrations] = useState<Set<string>>(new Set());

  const getPhorestStatus = (): 'connected' | 'paused' | 'not_connected' => {
    if (pausedIntegrations.has('phorest')) return 'paused';
    if (phorestConnection?.connected) return 'connected';
    return 'not_connected';
  };

  const integrations: Integration[] = [
    {
      id: 'phorest',
      name: 'Phorest',
      description: 'Salon management software integration for appointments, staff, and sales data.',
      icon: Link2,
      status: getPhorestStatus(),
      configPath: '/dashboard/admin/phorest',
      features: ['Staff Sync', 'Appointments', 'Sales Data', 'Performance Reports'],
      available: true,
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Sync appointments and meetings with Google Calendar.',
      icon: Calendar,
      status: 'not_connected',
      features: ['Calendar Sync', 'Meeting Reminders', 'Availability'],
      available: false,
    },
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Process payments and manage transactions.',
      icon: DollarSign,
      status: 'not_connected',
      features: ['Payment Processing', 'Invoicing', 'Subscriptions'],
      available: false,
    },
    {
      id: 'mailchimp',
      name: 'Mailchimp',
      description: 'Email marketing and client communication.',
      icon: Users,
      status: 'not_connected',
      features: ['Email Campaigns', 'Audience Management', 'Automation'],
      available: false,
    },
  ];

  const handlePauseIntegration = (integrationId: string) => {
    setPausedIntegrations(prev => {
      const next = new Set(prev);
      if (next.has(integrationId)) {
        next.delete(integrationId);
      } else {
        next.add(integrationId);
      }
      return next;
    });
  };

  const handleRemoveIntegration = (integrationId: string) => {
    const integration = integrations.find(i => i.id === integrationId);
    if (integration?.configPath) {
      navigate(integration.configPath);
    }
  };

  const getStatusBadge = (status: 'connected' | 'paused' | 'not_connected') => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-primary/10 text-primary gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Connected
          </Badge>
        );
      case 'paused':
        return (
          <Badge variant="secondary" className="gap-1">
            <Pause className="w-3 h-3" />
            Paused
          </Badge>
        );
      case 'not_connected':
        return (
          <Badge variant="outline" className="text-muted-foreground gap-1">
            <XCircle className="w-3 h-3" />
            Not Connected
          </Badge>
        );
    }
  };

  const connectedIntegrations = integrations.filter(i => i.status === 'connected' || i.status === 'paused');
  const availableIntegrations = integrations.filter(i => i.status === 'not_connected' && i.available);
  const comingSoonIntegrations = integrations.filter(i => !i.available);

  return (
    <div className="space-y-8">
      {/* Calendar Sync */}
      <div className="space-y-4">
        <h3 className="font-display text-lg tracking-wide">Calendar Sync</h3>
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-display">Calendar Subscription</CardTitle>
                  {!calFeedLoading && (
                    calFeedToken ? (
                      <Badge className="bg-primary/10 text-primary gap-1 mt-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground gap-1 mt-1">
                        Not Set Up
                      </Badge>
                    )
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size={tokens.button.card}
                onClick={() => setCalSyncOpen(true)}
              >
                {calFeedToken ? 'Manage' : 'Set Up'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Subscribe to your {PLATFORM_NAME} appointments from Apple Calendar, Google Calendar, or Outlook. One-way and read-only — your personal events stay private.
            </p>
          </CardContent>
        </Card>
        <CalendarSubscribeModal open={calSyncOpen} onOpenChange={setCalSyncOpen} />
      </div>

      {/* Connected Integrations */}
      <div className="space-y-4">
        <h3 className="font-display text-lg tracking-wide">Active Integrations</h3>
        {connectedIntegrations.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No integrations connected yet.</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {connectedIntegrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <Card key={integration.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-display">{integration.name}</CardTitle>
                          {getStatusBadge(integration.status)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{integration.description}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      {integration.features.map((feature) => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      {integration.configPath && (
                        <Button
                          variant="outline"
                          size={tokens.button.card}
                          onClick={() => navigate(integration.configPath!)}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Configure
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size={tokens.button.card}
                        onClick={() => handlePauseIntegration(integration.id)}
                      >
                        {integration.status === 'paused' ? (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                          </>
                        ) : (
                          <>
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </>
                        )}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size={tokens.button.inline} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Integration</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove the {integration.name} integration? 
                              This will disconnect all synced data and stop automatic updates.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveIntegration(integration.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Integrations */}
      {availableIntegrations.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-display text-lg tracking-wide">Available Integrations</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableIntegrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <Card key={integration.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-lg font-display">{integration.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{integration.description}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      {integration.features.slice(0, 3).map((feature) => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>

                    <Button className="w-full" onClick={() => integration.configPath && navigate(integration.configPath)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Connect
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Coming Soon */}
      {comingSoonIntegrations.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-display text-lg tracking-wide text-muted-foreground">Coming Soon</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {comingSoonIntegrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <Card key={integration.id} className="overflow-hidden opacity-60">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-display">{integration.name}</CardTitle>
                        <Badge variant="secondary" className="mt-1">Coming Soon</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{integration.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
