import { useState, useEffect } from 'react';
import { CreditCard, Info, Loader2, Percent } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { tokens } from '@/lib/design-tokens';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function ZuraPayAfterpayTab() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const queryClient = useQueryClient();

  const { data: orgSettings, isLoading } = useQuery({
    queryKey: ['afterpay-settings', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('afterpay_enabled, afterpay_surcharge_enabled, afterpay_surcharge_rate')
        .eq('id', orgId!)
        .maybeSingle();
      if (error) throw error;
      return {
        afterpay_enabled: data?.afterpay_enabled ?? false,
        afterpay_surcharge_enabled: data?.afterpay_surcharge_enabled ?? false,
        afterpay_surcharge_rate: data?.afterpay_surcharge_rate ?? 0.06,
      };
    },
    enabled: !!orgId,
  });

  const afterpayEnabled = orgSettings?.afterpay_enabled ?? false;
  const surchargeEnabled = orgSettings?.afterpay_surcharge_enabled ?? false;
  const surchargeRate = orgSettings?.afterpay_surcharge_rate ?? 0.06;

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', orgId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['afterpay-settings', orgId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update setting');
    },
  });

  const handleToggleAfterpay = (enabled: boolean) => {
    updateMutation.mutate({ afterpay_enabled: enabled });
    toast.success(enabled ? 'Afterpay enabled' : 'Afterpay disabled');
  };

  const handleToggleSurcharge = (enabled: boolean) => {
    updateMutation.mutate({ afterpay_surcharge_enabled: enabled });
    toast.success(enabled ? 'Surcharge enabled — clients will be charged the processing fee' : 'Surcharge disabled');
  };

  const handleRateChange = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 1 || num > 10) return;
    // Skip mutation if value hasn't changed
    if (num.toFixed(2) === (surchargeRate * 100).toFixed(2)) return;
    const rate = num / 100;
    updateMutation.mutate({ afterpay_surcharge_rate: rate });
    toast.success(`Surcharge rate updated to ${num}%`);
  };

  const ratePercent = parseFloat((surchargeRate * 100).toFixed(2));
  const [localRate, setLocalRate] = useState<string>(String(ratePercent));
  const sampleAmount = 1000;
  const sampleSurcharge = sampleAmount * surchargeRate;

  // Sync local state when server value changes
  useEffect(() => {
    setLocalRate(String(parseFloat((surchargeRate * 100).toFixed(2))));
  }, [surchargeRate]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Afterpay / Pay in 4</CardTitle>
              <CardDescription>
                Allow clients to pay in 4 interest-free installments
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Enable Afterpay</Label>
              <p className="text-xs text-muted-foreground">
                Afterpay will appear as a payment option for eligible transactions
              </p>
            </div>
            <Switch
              checked={afterpayEnabled}
              onCheckedChange={handleToggleAfterpay}
              disabled={isLoading || updateMutation.isPending}
            />
          </div>

          {/* Surcharge section — only visible when Afterpay is enabled */}
          {afterpayEnabled && (
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Pass Processing Fee to Client</Label>
                  <p className="text-xs text-muted-foreground">
                    Add the Afterpay processing fee as a separate line item on the client's checkout
                  </p>
                </div>
                <Switch
                  checked={surchargeEnabled}
                  onCheckedChange={handleToggleSurcharge}
                  disabled={isLoading || updateMutation.isPending}
                />
              </div>

              {surchargeEnabled && (
                <>
                  <div className="flex items-center gap-3">
                    <Label className="text-sm font-medium whitespace-nowrap">Surcharge Rate</Label>
                    <div className="relative w-24">
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        step={0.5}
                        value={localRate}
                        onChange={(e) => setLocalRate(e.target.value)}
                        onBlur={(e) => handleRateChange(e.target.value)}
                        className="pr-8 text-sm"
                      />
                      <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Preview calculation */}
                  <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                    <p>
                      On a <strong className="text-foreground">${sampleAmount.toLocaleString()}</strong> Afterpay payment, the client pays{' '}
                      <strong className="text-foreground">${(sampleAmount + sampleSurcharge).toLocaleString()}</strong>{' '}
                      (${sampleSurcharge.toFixed(2)} fee)
                    </p>
                  </div>

                  {/* Legal disclosure */}
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Surcharging buy-now-pay-later payments is legal in most US jurisdictions, but some
                      states have restrictions. Verify your local regulations before enabling this feature.
                      The surcharge will appear as a separate "Processing Fee" line item on the client's
                      checkout for full transparency.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Info section */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <h4 className="font-display text-xs tracking-wide text-foreground">
              HOW IT WORKS
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">•</span>
                <span>Clients pay in 4 interest-free installments over 6 weeks</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">•</span>
                <span>You receive the full amount upfront — Afterpay handles the installments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">•</span>
                <span>Available for transactions between <strong>$1 – $4,000</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">•</span>
                <span>For amounts over $4,000, the system automatically splits the payment: immediate card payment + Afterpay link for the remainder</span>
              </li>
            </ul>
          </div>

          {/* Where it applies */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <h4 className="font-display text-xs tracking-wide text-foreground">
              WHERE AFTERPAY APPEARS
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-500">✓</span>
                <span><strong>Online Booking Deposits</strong> — Afterpay appears in the payment form automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-500">✓</span>
                <span><strong>Send to Pay</strong> — Payment links sent to clients include Afterpay option</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-amber-500">✕</span>
                <span><strong>In-Person Terminal</strong> — Afterpay is not available on physical card readers (online only)</span>
              </li>
            </ul>
          </div>

          {/* Important note */}
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Afterpay must also be enabled on your connected payment account. If Afterpay
              doesn't appear for clients after enabling, contact support to verify your
              payment account configuration.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
