import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Bell, Shield } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { useSoundSettings } from '@/contexts/SoundSettingsContext';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { toast } from 'sonner';
import { ChaChingToast } from '@/components/dashboard/ChaChingToast';

export function CheckoutAlertsSection() {
  const { chaChingEnabled, setChaChingEnabled } = useSoundSettings();
  const { data: profile } = useEmployeeProfile();
  const { playChaChing } = useNotificationSound();
  const isEligible = profile?.is_primary_owner || profile?.is_super_admin;

  if (!isEligible) return null;

  const handlePreview = () => {
    playChaChing();
    toast.custom((id) => <ChaChingToast amount={125} toastId={id} />, { duration: 5000 });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <CardTitle className="font-display text-lg">CHECKOUT ALERTS</CardTitle>
        </div>
        <CardDescription>Get notified when a client checks out.</CardDescription>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
          <Shield className="w-3 h-3" />
          <span>Visible to Primary Owner and Super Admins only.</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <Button type="button" variant="outline" size={tokens.button.card} onClick={handlePreview} disabled={!chaChingEnabled}>
          Preview cha-ching
        </Button>
      </CardContent>
    </Card>
  );
}
