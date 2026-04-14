import { useState, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { HandCoins, Loader2, AlertTriangle } from 'lucide-react';
import { useTipConfig, useUpdateTipConfig, DEFAULT_TIP_CONFIG, type TipConfig } from '@/hooks/useTipConfig';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export function ZuraPayTippingTab() {
  const { data: config, isLoading } = useTipConfig();
  const updateTip = useUpdateTipConfig();

  const [localConfig, setLocalConfig] = useState<TipConfig>(DEFAULT_TIP_CONFIG);

  // Sync from server
  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);
    if (setting?.value && Object.keys(setting.value).length > 0) {
      setConfig({
        enabled: setting.value.enabled === true,
        percentages: (setting.value.percentages as [number, number, number]) || DEFAULT_CONFIG.percentages,
        fixed_threshold_enabled: setting.value.fixed_threshold_enabled === true,
        fixed_threshold_amount: (setting.value.fixed_threshold_amount as number) || DEFAULT_CONFIG.fixed_threshold_amount,
        include_retail: setting.value.include_retail === true,
        prompt_on_saved_cards: setting.value.prompt_on_saved_cards !== false,
      });
    }
  }, [setting]);

  const save = (updates: Partial<TipConfig>) => {
    if (!orgId) return;
    const next = { ...config, ...updates };
    setConfig(next);
    upsert.mutate({
      organization_id: orgId,
      setting_key: SETTING_KEY,
      setting_value: next as unknown as Record<string, unknown>,
    });
  };

  const updatePercentage = (index: number, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0 || num > 100) return;
    const next = [...config.percentages] as [number, number, number];
    next[index] = num;
    save({ percentages: next });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Master Toggle Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <HandCoins className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className={tokens.card.title}>Tipping</CardTitle>
              <CardDescription>
                Configure how tip prompts appear on your S700/S710 terminals during checkout.
              </CardDescription>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => save({ enabled: checked })}
              disabled={upsert.isPending}
            />
          </div>
        </CardHeader>
      </Card>

      {config.enabled && (
        <>
          {/* Tip Percentages Card */}
          <Card>
            <CardHeader>
              <CardTitle className={tokens.card.title}>Tip Amounts</CardTitle>
              <CardDescription>
                Set three percentage options displayed on the terminal tip screen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {config.percentages.map((pct, i) => (
                  <div key={i} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-sans">
                      Option {i + 1}
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={pct}
                        onChange={(e) => updatePercentage(i, e.target.value)}
                        className="pr-8 text-center font-mono"
                        autoCapitalize="off"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">
                        %
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3 font-sans">
                Customers will also see "Custom" and "No Tip" options.
              </p>
            </CardContent>
          </Card>

          {/* Fixed Tip Threshold Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className={tokens.card.title}>Fixed Tip Threshold</CardTitle>
                  <CardDescription>
                    Show fixed dollar amounts instead of percentages for orders below a certain subtotal.
                  </CardDescription>
                </div>
                <Switch
                  checked={config.fixed_threshold_enabled}
                  onCheckedChange={(checked) => save({ fixed_threshold_enabled: checked })}
                  disabled={upsert.isPending}
                />
              </div>
            </CardHeader>
            {config.fixed_threshold_enabled && (
              <CardContent>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-sans">
                    Threshold Amount
                  </Label>
                  <div className="relative max-w-[200px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">
                      $
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={(config.fixed_threshold_amount / 100).toFixed(0)}
                      onChange={(e) => {
                        const cents = Math.round(parseFloat(e.target.value || '0') * 100);
                        save({ fixed_threshold_amount: cents });
                      }}
                      className="pl-7 font-mono"
                      autoCapitalize="off"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground font-sans">
                    Orders below this amount will display fixed dollar tip options (e.g. $1, $2, $3).
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Additional Options Card */}
          <Card>
            <CardHeader>
              <CardTitle className={tokens.card.title}>Additional Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="include-retail" className="flex-1 cursor-pointer">
                  <span className="font-display text-sm tracking-wide uppercase">
                    Include retail sales in tips
                  </span>
                  <p className="text-xs text-muted-foreground font-sans mt-1">
                    When enabled, retail product amounts are included in the tip calculation base.
                  </p>
                </Label>
                <Switch
                  id="include-retail"
                  checked={config.include_retail}
                  onCheckedChange={(checked) => save({ include_retail: checked })}
                  disabled={upsert.isPending}
                />
              </div>

              <div className="border-t border-border" />

              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="saved-cards" className="flex-1 cursor-pointer">
                  <span className="font-display text-sm tracking-wide uppercase">
                    Tip prompt with saved cards
                  </span>
                  <p className="text-xs text-muted-foreground font-sans mt-1">
                    Show tip options when charging a card on file.
                  </p>
                </Label>
                <Switch
                  id="saved-cards"
                  checked={config.prompt_on_saved_cards}
                  onCheckedChange={(checked) => save({ prompt_on_saved_cards: checked })}
                  disabled={upsert.isPending}
                />
              </div>
            </CardContent>
          </Card>

          {/* Info callout */}
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground font-sans">
              Tip settings apply to all terminals across your organization. Changes take effect on the next transaction.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
