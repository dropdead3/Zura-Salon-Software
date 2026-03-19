import { useState } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useSmartMixAssistSettings, useUpdateSmartMixAssistSettings } from '@/hooks/backroom/useSmartMixAssist';
import { useBackroomSetting, useUpsertBackroomSetting } from '@/hooks/backroom/useBackroomSettings';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Sparkles, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Infotainer } from '@/components/ui/Infotainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

const DEFAULT_DISCLAIMER = 'Smart Mix Assist suggestions are based on historical usage data and recipe baselines. Always verify formulas with your professional judgment before applying.';

const SUGGESTION_HIERARCHY = [
  { key: 'client_history', label: 'Client History', description: 'Prioritize this client\'s last formula for this service' },
  { key: 'stylist_recent', label: 'Stylist Most Recent', description: 'Fall back to the stylist\'s most recent formula' },
  { key: 'recipe_baseline', label: 'Recipe Baseline', description: 'Final fallback to the configured recipe baseline' },
];

export function FormulaAssistanceSection() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: settings, isLoading: settingsLoading } = useSmartMixAssistSettings();
  const updateSettings = useUpdateSmartMixAssistSettings();
  const { data: disclaimerSetting, isLoading: disclaimerLoading } = useBackroomSetting('formula_disclaimer');
  const { data: recallSetting, isLoading: recallLoading } = useBackroomSetting('formula_recall_config');
  const upsert = useUpsertBackroomSetting();

  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [recallConfig, setRecallConfig] = useState<Record<string, unknown> | null>(null);

  const currentDisclaimer = disclaimer ?? (disclaimerSetting?.value?.text as string) ?? DEFAULT_DISCLAIMER;
  const currentRecall = recallConfig ?? (recallSetting?.value as Record<string, unknown>) ?? { hierarchy: ['client_history', 'stylist_recent', 'recipe_baseline'], auto_populate: true };

  const isLoading = settingsLoading || disclaimerLoading || recallLoading;

  const handleSaveDisclaimer = () => {
    if (!orgId) return;
    upsert.mutate({ organization_id: orgId, setting_key: 'formula_disclaimer', setting_value: { text: currentDisclaimer } }, { onSuccess: () => setDisclaimer(null) });
  };

  const handleSaveRecall = () => {
    if (!orgId) return;
    upsert.mutate({ organization_id: orgId, setting_key: 'formula_recall_config', setting_value: currentRecall }, { onSuccess: () => setRecallConfig(null) });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className={tokens.loading.spinner} /></div>;
  }

  return (
    <div className="space-y-6">
      <Infotainer id="backroom-formula-guide" title="Formula Assistance" description="Smart Mix Assist suggests formulas based on client history and recipe baselines. Configure the suggestion priority, auto-populate behavior, and the disclaimer shown to staff." icon={<Sparkles className="h-4 w-4 text-primary" />} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pr-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Smart Mix Assist</CardTitle>
              <CardDescription>AI-powered formula suggestions during mixing sessions.</CardDescription>
            </div>
          </div>
          <Switch checked={settings?.is_enabled ?? false} onCheckedChange={(checked) => updateSettings.mutate({ is_enabled: checked })} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-card/80 p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1"><p className={cn(tokens.body.emphasis, 'text-foreground')}>Ratio Lock</p><MetricInfoTooltip description="When enabled, Smart Mix Assist enforces the same product ratios used in previous formulas, preventing ratio drift between sessions." /></div>
              <p className="text-sm text-muted-foreground">Enforce consistent ratios when suggesting formulas</p>
            </div>
            <Switch checked={settings?.ratio_lock_enabled ?? false} onCheckedChange={(checked) => updateSettings.mutate({ ratio_lock_enabled: checked })} />
          </div>
          {settings?.acknowledged_at && (
            <p className="text-sm text-muted-foreground">Acknowledged on {new Date(settings.acknowledged_at).toLocaleDateString()}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className={tokens.card.title}>Formula Recall Hierarchy</CardTitle>
            <CardDescription>Configure the order in which formula suggestions are sourced.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleSaveRecall} disabled={!recallConfig}>
            <Save className="w-4 h-4 mr-1.5" /> Save
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {SUGGESTION_HIERARCHY.map((item, index) => (
            <div key={item.key} className="rounded-lg border border-border/60 bg-card/80 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-display text-sm text-muted-foreground w-6">{index + 1}.</span>
                <div>
                  <p className={cn(tokens.body.emphasis, 'text-foreground')}>{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
          <div className="rounded-lg border border-border/60 bg-card/80 p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1"><p className={cn(tokens.body.emphasis, 'text-foreground')}>Auto-Populate Formulas</p><MetricInfoTooltip description="When a formula match is found (via client history or recipe baseline), automatically fills in the product fields instead of requiring manual entry." /></div>
              <p className="text-sm text-muted-foreground">Automatically fill formula fields when a match is found</p>
            </div>
            <Switch checked={(currentRecall.auto_populate as boolean) ?? true} onCheckedChange={(checked) => setRecallConfig({ ...currentRecall, auto_populate: checked })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className={tokens.card.title}>Disclaimer Text</CardTitle>
            <CardDescription>Shown to staff when using formula assistance features.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleSaveDisclaimer} disabled={disclaimer === null}>
            <Save className="w-4 h-4 mr-1.5" /> Save
          </Button>
        </CardHeader>
        <CardContent>
          <Textarea
            value={currentDisclaimer}
            onChange={(e) => setDisclaimer(e.target.value)}
            className="min-h-[100px] resize-y"
            placeholder="Enter disclaimer text..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
