import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useCapitalPolicySettings, useUpdateCapitalPolicySettings } from '@/hooks/useCapitalPolicySettings';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Settings } from 'lucide-react';

export default function CapitalSettings() {
  const { dashPath } = useOrgDashboardPath();
  const { data: settings, isLoading } = useCapitalPolicySettings();
  const updateSettings = useUpdateCapitalPolicySettings();

  const [form, setForm] = useState({
    roe_threshold: 1.8,
    confidence_threshold: 70,
    max_risk_level: 'medium',
    max_concurrent_projects: 2,
    max_exposure_cents: null as number | null,
    cooldown_after_decline_days: 14,
    cooldown_after_underperformance_days: 30,
    allow_manager_initiation: false,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        roe_threshold: Number(settings.roe_threshold),
        confidence_threshold: Number(settings.confidence_threshold),
        max_risk_level: settings.max_risk_level,
        max_concurrent_projects: Number(settings.max_concurrent_projects),
        max_exposure_cents: settings.max_exposure_cents != null ? Number(settings.max_exposure_cents) : null,
        cooldown_after_decline_days: Number(settings.cooldown_after_decline_days),
        cooldown_after_underperformance_days: Number(settings.cooldown_after_underperformance_days),
        allow_manager_initiation: Boolean(settings.allow_manager_initiation),
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(form as any);
  };

  return (
    <DashboardLayout>
      <div className={cn(tokens.layout.pageContainer, 'max-w-[900px] mx-auto')}>
        <DashboardPageHeader
          title="Capital Settings"
          description="Configure eligibility thresholds, exposure limits, and funding policies"
          backTo={dashPath('/admin/capital')}
          backLabel="Back to Capital Queue"
        />
        <PageExplainer pageId="capital-settings" />

        {isLoading ? (
          <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>
        ) : (
          <div className="space-y-6">
            <Card className={tokens.card.wrapper}>
              <CardHeader className="flex flex-row items-center gap-3 pb-3">
                <div className={tokens.card.iconBox}><Settings className="w-5 h-5 text-primary" /></div>
                <div>
                  <CardTitle className={tokens.card.title}>Eligibility Thresholds</CardTitle>
                  <CardDescription className="font-sans text-sm">Minimum requirements for opportunities to surface</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label className="font-sans text-sm">Min ROE Score</Label>
                      <MetricInfoTooltip description="Return on Expansion score. Opportunities below this threshold won't surface. Higher values mean only the most efficient growth levers appear. Default: 1.8" />
                    </div>
                    <Input type="number" step="0.1" value={form.roe_threshold} onChange={e => setForm(f => ({ ...f, roe_threshold: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label className="font-sans text-sm">Min Confidence Score</Label>
                      <MetricInfoTooltip description="How confident the system must be in the opportunity before showing it. Scale of 0–100. Lower values surface more opportunities but with less certainty. Default: 70" />
                    </div>
                    <Input type="number" value={form.confidence_threshold} onChange={e => setForm(f => ({ ...f, confidence_threshold: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label className="font-sans text-sm">Max Risk Level</Label>
                      <MetricInfoTooltip description="The highest risk tier allowed for surfaced opportunities. 'Low' is most conservative, 'High' allows riskier bets with higher potential upside." />
                    </div>
                    <Select value={form.max_risk_level} onValueChange={v => setForm(f => ({ ...f, max_risk_level: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label className="font-sans text-sm">Max Concurrent Projects</Label>
                      <MetricInfoTooltip description="Limits how many funded projects can be active at once per organization. Prevents overextension during growth phases." />
                    </div>
                    <Input type="number" value={form.max_concurrent_projects} onChange={e => setForm(f => ({ ...f, max_concurrent_projects: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={tokens.card.wrapper}>
              <CardHeader className="flex flex-row items-center gap-3 pb-3">
                <div className={tokens.card.iconBox}><Settings className="w-5 h-5 text-primary" /></div>
                <div>
                  <CardTitle className={tokens.card.title}>Cooldowns & Suppression</CardTitle>
                  <CardDescription className="font-sans text-sm">Control resurface timing after declines or underperformance</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label className="font-sans text-sm">Cooldown After Decline (days)</Label>
                      <MetricInfoTooltip description="After an opportunity is declined, it won't resurface for this many days. Prevents alert fatigue from repeated suggestions." />
                    </div>
                    <Input type="number" value={form.cooldown_after_decline_days} onChange={e => setForm(f => ({ ...f, cooldown_after_decline_days: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label className="font-sans text-sm">Cooldown After Underperformance (days)</Label>
                      <MetricInfoTooltip description="If a funded project underperforms, new opportunities are suppressed for this period. Protects against compounding poor investments." />
                    </div>
                    <Input type="number" value={form.cooldown_after_underperformance_days} onChange={e => setForm(f => ({ ...f, cooldown_after_underperformance_days: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={tokens.card.wrapper}>
              <CardHeader className="flex flex-row items-center gap-3 pb-3">
                <div className={tokens.card.iconBox}><Settings className="w-5 h-5 text-primary" /></div>
                <div>
                  <CardTitle className={tokens.card.title}>Access Policies</CardTitle>
                  <CardDescription className="font-sans text-sm">Who can initiate capital funding</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Label className="font-sans text-sm">Allow Manager Initiation</Label>
                      <MetricInfoTooltip description="When enabled, managers can submit capital funding requests for their location without requiring admin approval first." />
                    </div>
                    <p className="text-xs text-muted-foreground font-sans">Managers can initiate operational funding</p>
                  </div>
                  <Switch checked={form.allow_manager_initiation} onCheckedChange={v => setForm(f => ({ ...f, allow_manager_initiation: v }))} />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={updateSettings.isPending} className={`${tokens.button.page} font-sans`}>
                {updateSettings.isPending ? 'Saving…' : 'Save Settings'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
