import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MapPin, CreditCard, Scale, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Same pricing constants used across the platform
const BACKROOM_TIER_PRICES: Record<string, { monthly: number; annual: number; label: string }> = {
  starter: { monthly: 39, annual: Math.round(39 * 12 * 0.85), label: 'Starter' },
  professional: { monthly: 79, annual: Math.round(79 * 12 * 0.85), label: 'Professional' },
  unlimited: { monthly: 129, annual: Math.round(129 * 12 * 0.85), label: 'Unlimited' },
};

const SCALE_LICENSE_MONTHLY = 10;
const SCALE_LICENSE_ANNUAL = Math.round(10 * 12 * 0.85);

interface LocationConfig {
  location_id: string;
  location_name: string;
  plan_tier: string;
  scale_count: number;
  enabled: boolean;
}

interface AdminActivateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  orgName: string;
  hasStripeCustomer: boolean;
  locations: Array<{ id: string; name: string; city: string | null }>;
}

export function AdminActivateDialog({
  open,
  onOpenChange,
  orgId,
  orgName,
  hasStripeCustomer,
  locations,
}: AdminActivateDialogProps) {
  const queryClient = useQueryClient();
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  const [activating, setActivating] = useState(false);
  const [locationConfigs, setLocationConfigs] = useState<LocationConfig[]>(() =>
    locations.map((loc) => ({
      location_id: loc.id,
      location_name: loc.name,
      plan_tier: 'starter',
      scale_count: 0,
      enabled: true,
    }))
  );

  // Sync locations when they change
  useMemo(() => {
    setLocationConfigs(
      locations.map((loc) => {
        const existing = locationConfigs.find((c) => c.location_id === loc.id);
        return existing ?? {
          location_id: loc.id,
          location_name: loc.name,
          plan_tier: 'starter',
          scale_count: 0,
          enabled: true,
        };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations]);

  const enabledConfigs = locationConfigs.filter((c) => c.enabled);

  const costBreakdown = useMemo(() => {
    let total = 0;
    const lines: Array<{ label: string; amount: number }> = [];

    for (const cfg of enabledConfigs) {
      const tier = BACKROOM_TIER_PRICES[cfg.plan_tier];
      if (!tier) continue;
      const tierCost = billingInterval === 'annual' ? tier.annual / 12 : tier.monthly;
      lines.push({ label: `${cfg.location_name} — ${tier.label}`, amount: tierCost });
      total += tierCost;

      if (cfg.scale_count > 0) {
        const scaleCost = cfg.scale_count * (billingInterval === 'annual' ? SCALE_LICENSE_ANNUAL / 12 : SCALE_LICENSE_MONTHLY);
        lines.push({ label: `  └ ${cfg.scale_count} scale license(s)`, amount: scaleCost });
        total += scaleCost;
      }
    }

    return { lines, total };
  }, [enabledConfigs, billingInterval]);

  const updateConfig = (locationId: string, updates: Partial<LocationConfig>) => {
    setLocationConfigs((prev) =>
      prev.map((c) => (c.location_id === locationId ? { ...c, ...updates } : c))
    );
  };

  const handleActivate = async () => {
    if (enabledConfigs.length === 0) {
      toast.error('Select at least one location');
      return;
    }

    setActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-activate-backroom', {
        body: {
          organization_id: orgId,
          billing_interval: billingInterval,
          location_plans: enabledConfigs.map((c) => ({
            location_id: c.location_id,
            plan_tier: c.plan_tier,
            scale_count: c.scale_count,
          })),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(data.message || 'Backroom activated successfully');
      queryClient.invalidateQueries({ queryKey: ['backroom-location-entitlements', orgId] });
      queryClient.invalidateQueries({ queryKey: ['platform-backroom-entitlements'] });
      queryClient.invalidateQueries({ queryKey: ['platform-backroom-all-entitlement-counts'] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Activation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setActivating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Activate Backroom & Charge Card</DialogTitle>
          <DialogDescription>
            Activate Zura Backroom for <strong>{orgName}</strong> and charge their card on file immediately.
          </DialogDescription>
        </DialogHeader>

        {!hasStripeCustomer ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="font-sans text-sm text-amber-300">
              This organization has no payment method on file. They need to add a card through their billing settings first.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Billing interval toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--platform-bg-hover))]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-violet-400" />
                <span className="font-sans text-sm text-slate-200">Billing Interval</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('font-sans text-xs', billingInterval === 'monthly' ? 'text-slate-200' : 'text-slate-500')}>
                  Monthly
                </span>
                <Switch
                  checked={billingInterval === 'annual'}
                  onCheckedChange={(checked) => setBillingInterval(checked ? 'annual' : 'monthly')}
                />
                <span className={cn('font-sans text-xs', billingInterval === 'annual' ? 'text-slate-200' : 'text-slate-500')}>
                  Annual
                </span>
                {billingInterval === 'annual' && (
                  <PlatformBadge variant="success" size="sm">15% off</PlatformBadge>
                )}
              </div>
            </div>

            {/* Location configs */}
            <div className="rounded-lg border border-slate-700/40 overflow-hidden max-h-[280px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-800/80 backdrop-blur">
                  <tr className="border-b border-slate-700/40">
                    <th className="font-sans text-xs text-slate-400 text-left px-3 py-2">Location</th>
                    <th className="font-sans text-xs text-slate-400 text-left px-3 py-2">Plan</th>
                    <th className="font-sans text-xs text-slate-400 text-left px-3 py-2">Scales</th>
                    <th className="font-sans text-xs text-slate-400 text-right px-3 py-2">Include</th>
                  </tr>
                </thead>
                <tbody>
                  {locationConfigs.map((cfg) => (
                    <tr key={cfg.location_id} className={cn(
                      'border-b border-slate-700/20 last:border-b-0',
                      !cfg.enabled && 'opacity-40'
                    )}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="font-sans text-sm text-slate-200">{cfg.location_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={cfg.plan_tier}
                          onValueChange={(val) => updateConfig(cfg.location_id, { plan_tier: val })}
                          disabled={!cfg.enabled}
                        >
                          <SelectTrigger className="h-7 w-[120px] text-xs bg-slate-800/60 border-slate-700/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="starter">Starter ($39)</SelectItem>
                            <SelectItem value="professional">Professional ($79)</SelectItem>
                            <SelectItem value="unlimited">Unlimited ($129)</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Scale className="w-3 h-3 text-slate-500" />
                          <Select
                            value={String(cfg.scale_count)}
                            onValueChange={(val) => updateConfig(cfg.location_id, { scale_count: parseInt(val) })}
                            disabled={!cfg.enabled}
                          >
                            <SelectTrigger className="h-7 w-[60px] text-xs bg-slate-800/60 border-slate-700/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[0, 1, 2, 3, 4, 5].map((n) => (
                                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Switch
                          checked={cfg.enabled}
                          onCheckedChange={(checked) => updateConfig(cfg.location_id, { enabled: checked })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cost summary */}
            <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 space-y-1.5">
              <p className="font-display text-xs tracking-wide text-violet-300 uppercase">Cost Preview</p>
              {costBreakdown.lines.map((line, i) => (
                <div key={i} className="flex justify-between">
                  <span className="font-sans text-xs text-slate-400">{line.label}</span>
                  <span className="font-sans text-xs text-slate-200 tabular-nums">
                    ${line.amount.toFixed(2)}/mo
                  </span>
                </div>
              ))}
              <div className="border-t border-violet-500/20 pt-1.5 mt-1.5 flex justify-between">
                <span className="font-sans text-sm text-slate-200 font-medium">Total</span>
                <span className="font-sans text-sm text-violet-300 font-medium tabular-nums">
                  ${costBreakdown.total.toFixed(2)}/mo
                </span>
              </div>
              {billingInterval === 'annual' && (
                <p className="font-sans text-[10px] text-slate-500">
                  Billed annually at ${(costBreakdown.total * 12).toFixed(2)}/year
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <PlatformButton variant="outline" onClick={() => onOpenChange(false)} disabled={activating}>
            Cancel
          </PlatformButton>
          <PlatformButton
            onClick={handleActivate}
            loading={activating}
            disabled={!hasStripeCustomer || enabledConfigs.length === 0}
          >
            <CreditCard className="w-4 h-4" />
            Activate & Charge ({enabledConfigs.length} location{enabledConfigs.length !== 1 ? 's' : ''})
          </PlatformButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
