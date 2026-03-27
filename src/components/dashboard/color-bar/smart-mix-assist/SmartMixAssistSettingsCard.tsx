/**
 * SmartMixAssistSettingsCard — Settings panel for enabling/disabling Smart Mix Assist.
 *
 * Includes feature toggle, ratio lock toggle, and one-time acknowledgment dialog.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sparkles } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  useSmartMixAssistSettings,
  useUpdateSmartMixAssistSettings,
} from '@/hooks/backroom/useSmartMixAssist';
import { supabase } from '@/integrations/supabase/client';

export function SmartMixAssistSettingsCard() {
  const { data: settings, isLoading } = useSmartMixAssistSettings();
  const updateSettings = useUpdateSmartMixAssistSettings();
  const [showAcknowledgment, setShowAcknowledgment] = useState(false);

  const isEnabled = settings?.is_enabled ?? false;
  const isRatioLockEnabled = settings?.ratio_lock_enabled ?? false;
  const hasAcknowledged = !!settings?.acknowledged_at;

  const handleToggleEnable = async (checked: boolean) => {
    if (checked && !hasAcknowledged) {
      // Show acknowledgment dialog before enabling
      setShowAcknowledgment(true);
      return;
    }
    updateSettings.mutate({ is_enabled: checked });
  };

  const handleAcknowledge = async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    updateSettings.mutate({
      is_enabled: true,
      acknowledged_by: userId,
      acknowledged_at: new Date().toISOString(),
    });
    setShowAcknowledgment(false);
  };

  const handleToggleRatioLock = (checked: boolean) => {
    updateSettings.mutate({ ratio_lock_enabled: checked });
  };

  if (isLoading) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Sparkles className={tokens.card.icon} />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Smart Mix Assist</CardTitle>
              <CardDescription>
                Suggest starting formulas based on history and recipes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="smart-mix-enable" className={tokens.body.default}>
              Enable Smart Mix Assist
            </Label>
            <Switch
              id="smart-mix-enable"
              checked={isEnabled}
              onCheckedChange={handleToggleEnable}
              disabled={updateSettings.isPending}
            />
          </div>

          {/* Ratio Lock Toggle */}
          <div className={cn(
            'flex items-center justify-between',
            !isEnabled && 'opacity-50 pointer-events-none',
          )}>
            <div className="space-y-0.5">
              <Label htmlFor="ratio-lock-enable" className={tokens.body.default}>
                Ratio Lock
              </Label>
              <p className={cn(tokens.body.muted, 'text-xs')}>
                Auto-adjust ingredient targets when base weight changes
              </p>
            </div>
            <Switch
              id="ratio-lock-enable"
              checked={isRatioLockEnabled}
              onCheckedChange={handleToggleRatioLock}
              disabled={!isEnabled || updateSettings.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Acknowledgment Dialog */}
      <AlertDialog open={showAcknowledgment} onOpenChange={setShowAcknowledgment}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enable Smart Mix Assist</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-left">
              <p>
                Smart Mix Assist can suggest starting formulas using service recipes
                and formula history.
              </p>
              <p>
                These suggestions are provided as a convenience only and may not
                reflect the exact needs of the client, hair condition, or desired outcome.
              </p>
              <p>
                The licensed stylist performing the service is solely responsible for
                evaluating the hair, selecting appropriate products, and determining
                the correct formulation.
              </p>
              <p className={cn(tokens.body.emphasis)}>
                By enabling this feature, you acknowledge that suggested formulas are
                recommendations only and that final formulation decisions remain the
                responsibility of the stylist performing the service.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcknowledge}>
              I Acknowledge — Enable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
