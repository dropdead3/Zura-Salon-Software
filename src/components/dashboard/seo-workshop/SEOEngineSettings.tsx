import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SEO_QUOTA_LIST } from '@/config/seo-engine/seo-quotas';
import { SEO_TASK_TEMPLATE_LIST } from '@/config/seo-engine/seo-task-templates';
import { HEALTH_DOMAIN_LIST } from '@/config/seo-engine/seo-health-domains';
import { SEO_SETTINGS_SCHEMA, SEO_SETTINGS_GROUPS } from '@/config/seo-engine/seo-settings-schema';
import { useSEOEngineSettings } from '@/hooks/useSEOEngineSettings';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2, Play, RefreshCw, Zap, Save } from 'lucide-react';

interface Props {
  organizationId: string | undefined;
}

export function SEOEngineSettings({ organizationId }: Props) {
  const [runningScans, setRunningScans] = useState<Set<string>>(new Set());
  const { getSetting, updateSetting, isLoading: settingsLoading } = useSEOEngineSettings(organizationId);
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});

  const runScan = async (functionName: string, label: string) => {
    if (!organizationId) return;
    setRunningScans((prev) => new Set(prev).add(functionName));
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { organizationId },
      });
      if (error) throw new Error(error.message);
      toast({ title: `${label} complete`, description: JSON.stringify(data).slice(0, 120) });
    } catch (err) {
      toast({ title: `${label} failed`, description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setRunningScans((prev) => {
        const next = new Set(prev);
        next.delete(functionName);
        return next;
      });
    }
  };

  const isRunning = (fn: string) => runningScans.has(fn);

  const handleSettingChange = (key: string, value: string) => {
    const def = SEO_SETTINGS_SCHEMA.find((s) => s.key === key);
    if (!def) return;
    const parsed = def.type === 'number' ? parseFloat(value) : value;
    setPendingChanges((prev) => ({ ...prev, [key]: parsed }));
  };

  const handleSaveSettings = async () => {
    const entries = Object.entries(pendingChanges);
    if (!entries.length) return;

    for (const [key, value] of entries) {
      await updateSetting.mutateAsync({ key, value });
    }
    setPendingChanges({});
    toast({ title: 'Settings saved', description: `${entries.length} setting(s) updated.` });
  };

  const getDisplayValue = (key: string) => {
    if (pendingChanges[key] !== undefined) return pendingChanges[key];
    return getSetting(key);
  };

  return (
    <div className="space-y-6">
      {/* Manual Scan Triggers */}
      <Card>
        <CardHeader>
          <CardTitle className={tokens.card.title}>Engine Controls</CardTitle>
          <CardDescription>Manually trigger SEO scans for this organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              className="justify-start gap-2 font-sans"
              disabled={isRunning('seo-score-calculator') || !organizationId}
              onClick={() => runScan('seo-score-calculator', 'Score calculation')}
            >
              {isRunning('seo-score-calculator') ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Recalculate Health Scores
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2 font-sans"
              disabled={isRunning('seo-daily-scan') || !organizationId}
              onClick={() => runScan('seo-daily-scan', 'Daily scan')}
            >
              {isRunning('seo-daily-scan') ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run Daily Scan
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2 font-sans"
              disabled={isRunning('seo-weekly-scan') || !organizationId}
              onClick={() => runScan('seo-weekly-scan', 'Weekly scan')}
            >
              {isRunning('seo-weekly-scan') ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Run Weekly Scan
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2 font-sans"
              disabled={isRunning('seo-monthly-scan') || !organizationId}
              onClick={() => runScan('seo-monthly-scan', 'Monthly scan')}
            >
              {isRunning('seo-monthly-scan') ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Run Monthly Scan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurable Settings */}
      {SEO_SETTINGS_GROUPS.map((group) => {
        const groupSettings = SEO_SETTINGS_SCHEMA.filter((s) => s.group === group.key);
        if (!groupSettings.length) return null;

        return (
          <Card key={group.key}>
            <CardHeader>
              <CardTitle className={tokens.card.title}>{group.label}</CardTitle>
              <CardDescription>Organization-level overrides for {group.label.toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {groupSettings.map((setting) => (
                <div key={setting.key} className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-sans font-medium">{setting.label}</p>
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  </div>
                  <Input
                    type="number"
                    className="w-20 text-right font-sans"
                    value={getDisplayValue(setting.key) ?? ''}
                    min={setting.min}
                    max={setting.max}
                    step={setting.key === 'min_business_value_threshold' ? 0.1 : 1}
                    onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                    disabled={settingsLoading}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {Object.keys(pendingChanges).length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleSaveSettings}
            disabled={updateSetting.isPending}
            className="font-sans gap-2"
          >
            {updateSetting.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </Button>
        </div>
      )}

      {/* Task Templates */}
      <Card>
        <CardHeader>
          <CardTitle className={tokens.card.title}>Task Templates ({SEO_TASK_TEMPLATE_LIST.length})</CardTitle>
          <CardDescription>Deterministic blueprints that generate SEO tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {SEO_TASK_TEMPLATE_LIST.map((t) => (
              <div key={t.templateKey} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                <div>
                  <p className="text-sm font-sans font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Due in {t.defaultDueDays}d · Cooldown {t.cooldownDays}d · {t.systemVerifiable ? 'System-verified' : 'Manual approval'}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">{t.taskType}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Health Domains */}
      <Card>
        <CardHeader>
          <CardTitle className={tokens.card.title}>Health Domains ({HEALTH_DOMAIN_LIST.length})</CardTitle>
          <CardDescription>Scoring dimensions that evaluate SEO object health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {HEALTH_DOMAIN_LIST.map((d) => (
              <div key={d.domain} className="py-2 border-b border-border/60 last:border-0">
                <p className="text-sm font-sans font-medium">{d.label}</p>
                <p className="text-xs text-muted-foreground">{d.description}</p>
                <div className="flex gap-1 flex-wrap mt-1">
                  {d.applicableObjectTypes.map((ot) => (
                    <Badge key={ot} variant="secondary" className="text-[10px]">{ot}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
