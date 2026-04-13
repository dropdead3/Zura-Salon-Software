import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';
import { useColorBarSetting, useUpsertColorBarSetting } from '@/hooks/color-bar/useColorBarSettings';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

const SETTING_KEY = 'dispute_policy';

export function DisputePolicySettings() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: setting, isLoading } = useColorBarSetting(SETTING_KEY);
  const upsert = useUpsertColorBarSetting();

  const autoBan = setting?.value?.auto_ban_on_dispute === true;

  const handleToggle = (checked: boolean) => {
    if (!orgId) return;
    upsert.mutate({
      organization_id: orgId,
      setting_key: SETTING_KEY,
      setting_value: { auto_ban_on_dispute: checked },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <ShieldAlert className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Dispute Policy</CardTitle>
            <CardDescription>
              Control how the system responds when a client files a payment dispute.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-12">
            <Loader2 className={tokens.loading.spinner} />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="auto-ban-toggle" className="flex-1 cursor-pointer">
                <span className="font-display text-sm tracking-wide uppercase">
                  Auto-ban on dispute
                </span>
                <p className="text-sm text-muted-foreground font-sans mt-1">
                  Automatically ban clients from booking when they file a payment dispute.
                </p>
              </Label>
              <Switch
                id="auto-ban-toggle"
                checked={autoBan}
                onCheckedChange={handleToggle}
                disabled={upsert.isPending}
              />
            </div>

            {autoBan && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">
                  Clients who file a payment dispute will be automatically banned from booking.
                  The ban reason will be logged for audit purposes.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
