import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { useColorBarSetting, useUpsertColorBarSetting } from '@/hooks/color-bar/useColorBarSettings';
import { useColorBarOrgId } from '@/hooks/color-bar/useColorBarOrgId';
import { Banknote, Loader2 } from 'lucide-react';

interface TipDistributionPolicy {
  enabled: boolean;
  frequency: string;
  default_method: string;
  require_manager_confirmation: boolean;
}

const DEFAULTS: TipDistributionPolicy = {
  enabled: false,
  frequency: 'daily',
  default_method: 'cash',
  require_manager_confirmation: true,
};

export function TipDistributionPolicySettings() {
  const orgId = useColorBarOrgId();
  const { data: settingData, isLoading } = useColorBarSetting('tip_distribution_policy');
  const upsert = useUpsertColorBarSetting();
  const [config, setConfig] = useState<TipDistributionPolicy>(DEFAULTS);

  useEffect(() => {
    if (settingData?.value && Object.keys(settingData.value).length > 0) {
      setConfig({ ...DEFAULTS, ...settingData.value } as unknown as TipDistributionPolicy);
    }
  }, [settingData]);

  const save = (patch: Partial<TipDistributionPolicy>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    if (orgId) {
      upsert.mutate({
        organization_id: orgId,
        setting_key: 'tip_distribution_policy',
        setting_value: next as unknown as Record<string, unknown>,
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Banknote className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className={tokens.card.title}>Tip Distribution Policy</CardTitle>
              <MetricInfoTooltip description="Controls how daily tip distributions are generated and confirmed for your service providers." />
            </div>
            <CardDescription>Configure tip payout workflows</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-sans">Enable Tip Distributions</Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track and manage daily tip payouts for service providers
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(v) => save({ enabled: v })}
          />
        </div>

        {config.enabled && (
          <>
            {/* Default method */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-sans">Default Payout Method</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  How tips are distributed by default
                </p>
              </div>
              <Select value={config.default_method} onValueChange={(v) => save({ default_method: v })}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="manual_transfer">Manual Transfer</SelectItem>
                  <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                  <SelectItem value="payroll">Include in Payroll</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Manager confirmation */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-sans">Require Manager Confirmation</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Manager must review and confirm distributions before payout
                </p>
              </div>
              <Switch
                checked={config.require_manager_confirmation}
                onCheckedChange={(v) => save({ require_manager_confirmation: v })}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
