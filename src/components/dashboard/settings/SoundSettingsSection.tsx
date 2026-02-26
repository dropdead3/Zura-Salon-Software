import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Volume2 } from 'lucide-react';
import { useSoundSettings } from '@/contexts/SoundSettingsContext';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { Button } from '@/components/ui/button';

export function SoundSettingsSection() {
  const { enabled, setEnabled, chaChingEnabled, setChaChingEnabled } = useSoundSettings();
  const { playSuccess, playError } = useNotificationSound();
  const { data: profile } = useEmployeeProfile();
  const isEligible = profile?.is_primary_owner || profile?.is_super_admin;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          <CardTitle className="font-display text-lg">SOUNDS</CardTitle>
        </div>
        <CardDescription>Subtle audio feedback for key moments.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable notification sounds</p>
            <p className="text-xs text-muted-foreground">Respects reduced motion preferences.</p>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground">{enabled ? 'On' : 'Off'}</Label>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>
        {isEligible && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Checkout notifications</p>
              <p className="text-xs text-muted-foreground">Show a cha-ching alert when a client checks out.</p>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs text-muted-foreground">{chaChingEnabled ? 'On' : 'Off'}</Label>
              <Switch checked={chaChingEnabled} onCheckedChange={setChaChingEnabled} />
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size={tokens.button.card} onClick={playSuccess} disabled={!enabled}>
            Preview success
          </Button>
          <Button type="button" variant="outline" size={tokens.button.card} onClick={playError} disabled={!enabled}>
            Preview error
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

