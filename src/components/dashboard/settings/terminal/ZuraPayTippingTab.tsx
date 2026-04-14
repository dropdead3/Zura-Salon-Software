import { useState, useEffect, useRef, useCallback } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { HandCoins, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTipConfig, useUpdateTipConfig, DEFAULT_TIP_CONFIG, type TipConfig } from '@/hooks/useTipConfig';
import { toast } from 'sonner';

export function ZuraPayTippingTab() {
  const { data: config, isLoading } = useTipConfig();
  const updateTip = useUpdateTipConfig();

  const [localConfig, setLocalConfig] = useState<TipConfig>(DEFAULT_TIP_CONFIG);
  const [localPercentages, setLocalPercentages] = useState<string[]>(
    DEFAULT_TIP_CONFIG.percentages.map(String)
  );
  const [localThreshold, setLocalThreshold] = useState('');

  // Track whether we're mid-edit to avoid server overwrite
  const isEditing = useRef(false);

  // Sync from server only when not actively editing
  useEffect(() => {
    if (config && !isEditing.current) {
      setLocalConfig(config);
      setLocalPercentages(config.percentages.map(String));
      setLocalThreshold((config.fixed_threshold_amount / 100).toFixed(0));
    }
  }, [config]);

  const save = useCallback((updates: Partial<TipConfig>) => {
    const next = { ...localConfig, ...updates };
    setLocalConfig(next);
    updateTip.mutate(
      { key: 'tip_config', value: next },
      {
        onError: (err) => {
          toast.error('Failed to save tipping settings', {
            description: err instanceof Error ? err.message : 'Please try again.',
          });
        },
      }
    );
  }, [localConfig, updateTip]);

  const handlePercentageChange = (index: number, value: string) => {
    isEditing.current = true;
    const next = [...localPercentages];
    next[index] = value.replace(/[^0-9]/g, '');
    setLocalPercentages(next);
  };

  const commitPercentage = (index: number) => {
    isEditing.current = false;
    const raw = parseInt(localPercentages[index], 10);
    const clamped = isNaN(raw) ? 0 : Math.min(100, Math.max(0, raw));
    const nextLocal = [...localPercentages];
    nextLocal[index] = String(clamped);
    setLocalPercentages(nextLocal);
    const nextPcts = [...localConfig.percentages] as [number, number, number];
    nextPcts[index] = clamped;
    save({ percentages: nextPcts });
  };

  const handlePercentageKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitPercentage(index);
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleThresholdChange = (value: string) => {
    isEditing.current = true;
    setLocalThreshold(value);
  };

  const commitThreshold = () => {
    isEditing.current = false;
    const dollars = parseFloat(localThreshold || '0');
    const cents = Math.round(Math.max(0, dollars) * 100);
    setLocalThreshold((cents / 100).toFixed(0));
    save({ fixed_threshold_amount: cents });
  };

  const handleThresholdKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitThreshold();
      (e.target as HTMLInputElement).blur();
    }
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
              checked={localConfig.enabled}
              onCheckedChange={(checked) => save({ enabled: checked })}
              disabled={updateTip.isPending}
            />
          </div>
        </CardHeader>
      </Card>

      {localConfig.enabled && (
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
                {localPercentages.map((pct, i) => (
                  <div key={i} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-sans">
                      Option {i + 1}
                    </Label>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={localPercentages[i]}
                        onChange={(e) => handlePercentageChange(i, e.target.value)}
                        onBlur={() => commitPercentage(i)}
                        onKeyDown={(e) => handlePercentageKeyDown(e, i)}
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
                  checked={localConfig.fixed_threshold_enabled}
                  onCheckedChange={(checked) => save({ fixed_threshold_enabled: checked })}
                  disabled={updateTip.isPending}
                />
              </div>
            </CardHeader>
            {localConfig.fixed_threshold_enabled && (
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
                      value={localThreshold}
                      onChange={(e) => handleThresholdChange(e.target.value)}
                      onBlur={commitThreshold}
                      onKeyDown={handleThresholdKeyDown}
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
                  checked={localConfig.include_retail}
                  onCheckedChange={(checked) => save({ include_retail: checked })}
                  disabled={updateTip.isPending}
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
                  checked={localConfig.prompt_on_saved_cards}
                  onCheckedChange={(checked) => save({ prompt_on_saved_cards: checked })}
                  disabled={updateTip.isPending}
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
