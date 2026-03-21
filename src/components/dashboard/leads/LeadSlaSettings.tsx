import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Clock, Bell, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface LeadSlaSettingsProps {
  className?: string;
}

export function LeadSlaSettings({ className }: LeadSlaSettingsProps) {
  const [slaHours, setSlaHours] = useState(4);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestAlert = async () => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-lead-sla', {
        body: { sla_hours: slaHours },
      });

      if (error) throw error;

      if (data.overdueLeads > 0) {
        toast.success(`Found ${data.overdueLeads} overdue leads. ${data.notificationsSent} notifications sent to ${data.managersNotified} managers.`);
      } else {
        toast.info('No overdue leads found. All leads are within SLA!');
      }
    } catch (error) {
      console.error('SLA check failed:', error);
      toast.error('Failed to run SLA check');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <CardTitle className="text-lg">Lead Response Time Alerts</CardTitle>
        </div>
        <CardDescription>
          Get notified when leads go uncontacted beyond your SLA threshold
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* SLA Threshold */}
        <div className="space-y-2">
          <Label htmlFor="sla-hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Response Time SLA (hours)
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="sla-hours"
              type="number"
              min={1}
              max={72}
              value={slaHours}
              onChange={(e) => setSlaHours(Math.max(1, Math.min(72, parseInt(e.target.value) || 4)))}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">
              Alert managers when leads wait longer than {slaHours} hour{slaHours !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Alert Types */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Alert Delivery
          </Label>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <Bell className="h-3 w-3" />
              In-App Notification
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Send className="h-3 w-3" />
              Email Summary
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Admins and Managers receive alerts. Duplicate alerts are suppressed for 24 hours.
          </p>
        </div>

        {/* Test Button */}
        <div className="pt-2 border-t">
          <Button
            variant="outline"
            onClick={handleTestAlert}
            disabled={isTesting}
            className="w-full"
          >
            {isTesting ? (
              <>Checking leads...</>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Run SLA Check Now
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            This check runs automatically every hour
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
