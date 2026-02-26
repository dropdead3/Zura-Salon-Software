import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell } from 'lucide-react';
import { useSoundSettings } from '@/contexts/SoundSettingsContext';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';

export function CheckoutAlertsSection() {
  const { chaChingEnabled, setChaChingEnabled } = useSoundSettings();
  const { data: profile } = useEmployeeProfile();
  const isEligible = profile?.is_primary_owner || profile?.is_super_admin;

  if (!isEligible) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <CardTitle className="font-display text-lg">CHECKOUT ALERTS</CardTitle>
        </div>
        <CardDescription>Get notified when a client checks out.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Cha-ching notifications</p>
            <p className="text-xs text-muted-foreground">Show a toast and play a sound when revenue comes in.</p>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground">{chaChingEnabled ? 'On' : 'Off'}</Label>
            <Switch checked={chaChingEnabled} onCheckedChange={setChaChingEnabled} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
