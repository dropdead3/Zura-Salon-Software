import { useState } from 'react';
import { CreditCard, Info, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { tokens } from '@/lib/design-tokens';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function ZuraPayAfterpayTab() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const queryClient = useQueryClient();

  const { data: afterpayEnabled, isLoading } = useQuery({
    queryKey: ['afterpay-enabled', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('afterpay_enabled')
        .eq('id', orgId!)
        .maybeSingle();
      if (error) throw error;
      return data?.afterpay_enabled ?? false;
    },
    enabled: !!orgId,
  });

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from('organizations')
        .update({ afterpay_enabled: enabled })
        .eq('id', orgId!);
      if (error) throw error;
    },
    onSuccess: (_data, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['afterpay-enabled', orgId] });
      toast.success(enabled ? 'Afterpay enabled' : 'Afterpay disabled');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update setting');
    },
  });

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
              checked={afterpayEnabled ?? false}
              onCheckedChange={(checked) => toggleMutation.mutate(checked)}
              disabled={isLoading || toggleMutation.isPending}
            />
          </div>

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
