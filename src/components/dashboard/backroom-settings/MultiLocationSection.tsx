import { useState, useMemo } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBackroomSettingsAll, useUpsertBackroomSetting, type BackroomSetting } from '@/hooks/backroom/useBackroomSettings';
import { useBackroomAlertRules, useUpsertAlertRule, type BackroomAlertRule } from '@/hooks/backroom/useBackroomAlertRules';
import { useActiveLocations } from '@/hooks/useLocations';
import { supabase } from '@/integrations/supabase/client';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { PlatformCard, PlatformCardContent, PlatformCardHeader, PlatformCardTitle, PlatformCardDescription } from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Building2, Copy, RotateCcw, ArrowRight, Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Infotainer } from '@/components/ui/Infotainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

export function MultiLocationSection() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: allSettings, isLoading: settingsLoading } = useBackroomSettingsAll();
  const { data: orgAlertRules } = useBackroomAlertRules();
  const { data: locations, isLoading: locLoading } = useActiveLocations();
  const upsert = useUpsertBackroomSetting();
  const upsertRule = useUpsertAlertRule();
  const queryClient = useQueryClient();

  const [sourceLocId, setSourceLocId] = useState<string>('');
  const [targetLocId, setTargetLocId] = useState<string>('');
  const [compareLocA, setCompareLocA] = useState<string>('');
  const [compareLocB, setCompareLocB] = useState<string>('');
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [includeAlertRules, setIncludeAlertRules] = useState(true);
  const [isPushing, setIsPushing] = useState(false);

  const isLoading = settingsLoading || locLoading;

  const grouped = useMemo(() => {
    if (!allSettings) return {};
    const map: Record<string, { orgDefault: BackroomSetting | null; overrides: BackroomSetting[] }> = {};
    for (const s of allSettings) {
      if (!map[s.setting_key]) map[s.setting_key] = { orgDefault: null, overrides: [] };
      if (!s.location_id) map[s.setting_key].orgDefault = s;
      else map[s.setting_key].overrides.push(s);
    }
    return map;
  }, [allSettings]);

  const pushPreFlight = useMemo(() => {
    if (!locations || !allSettings) return null;
    const orgDefaults = (allSettings || []).filter(s => !s.location_id);
    const existingOverrides = (allSettings || []).filter(s => !!s.location_id);
    const orgRules = (orgAlertRules || []).filter(r => !r.location_id);
    return { settingsCount: orgDefaults.length, locationsCount: locations.length, existingOverrideCount: existingOverrides.length, alertRulesCount: orgRules.length };
  }, [locations, allSettings, orgAlertRules]);

  const handlePushToAll = async () => {
    if (!orgId || !locations || !allSettings) return;
    setIsPushing(true);
    try {
      const orgDefaults = allSettings.filter(s => !s.location_id);
      let settingsPushed = 0, rulesPushed = 0;
      for (const loc of locations) {
        for (const setting of orgDefaults) {
          await upsert.mutateAsync({ organization_id: orgId, setting_key: setting.setting_key, setting_value: setting.setting_value, location_id: loc.id });
          settingsPushed++;
        }
      }
      if (includeAlertRules && orgAlertRules) {
        const orgRules = orgAlertRules.filter(r => !r.location_id);
        for (const loc of locations) {
          for (const rule of orgRules) {
            await upsertRule.mutateAsync({ organization_id: orgId, rule_type: rule.rule_type, threshold_value: rule.threshold_value, threshold_unit: rule.threshold_unit, severity: rule.severity, creates_exception: rule.creates_exception, creates_task: rule.creates_task, notify_roles: rule.notify_roles, is_active: rule.is_active, location_id: loc.id });
            rulesPushed++;
          }
        }
      }
      toast.success(`Pushed ${settingsPushed} setting(s)${rulesPushed > 0 ? ` + ${rulesPushed} alert rule(s)` : ''} to ${locations.length} locations`);
      setShowPushDialog(false);
    } catch (e: any) { toast.error('Push failed: ' + e.message); }
    finally { setIsPushing(false); }
  };

  const handleCopySettings = async () => {
    if (!orgId || !sourceLocId || !targetLocId || sourceLocId === targetLocId) return;
    const sourceSettings = (allSettings || []).filter(s => s.location_id === sourceLocId);
    if (sourceSettings.length === 0) { toast.error('No settings found for the source location'); return; }
    const targets = targetLocId === '__all__' ? (locations || []).filter(l => l.id !== sourceLocId) : (locations || []).filter(l => l.id === targetLocId);
    try {
      let count = 0;
      for (const target of targets) { for (const s of sourceSettings) { await upsert.mutateAsync({ organization_id: orgId, setting_key: s.setting_key, setting_value: s.setting_value, location_id: target.id }); count++; } }
      toast.success(`Copied ${sourceSettings.length} setting(s) to ${targets.length} location(s)`);
    } catch (e: any) { toast.error('Failed to copy settings: ' + e.message); }
  };

  const handleResetOverride = async (settingId: string) => {
    const { error } = await supabase.from('backroom_settings').delete().eq('id', settingId);
    if (error) toast.error('Failed to reset override: ' + error.message);
    else { toast.success('Override removed — location will use org default'); queryClient.invalidateQueries({ queryKey: ['backroom-settings'] }); }
  };

  const compareKeys = useMemo(() => {
    if (!compareLocA || !compareLocB || !allSettings) return [];
    const aSettings = allSettings.filter(s => s.location_id === compareLocA);
    const bSettings = allSettings.filter(s => s.location_id === compareLocB);
    const allKeys = new Set([...aSettings.map(s => s.setting_key), ...bSettings.map(s => s.setting_key)]);
    return Array.from(allKeys).map(key => ({
      key,
      locA: aSettings.find(s => s.setting_key === key),
      locB: bSettings.find(s => s.setting_key === key),
      differs: JSON.stringify(aSettings.find(s => s.setting_key === key)?.setting_value) !== JSON.stringify(bSettings.find(s => s.setting_key === key)?.setting_value),
    }));
  }, [compareLocA, compareLocB, allSettings]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className={tokens.loading.spinner} /></div>;
  }

  if (!locations || locations.length < 2) {
    return (
      <div className={tokens.empty.container}>
        <Building2 className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>Single Location</h3>
        <p className={tokens.empty.description}>Multi-location settings require at least two active locations.</p>
      </div>
    );
  }

  const settingKeys = Object.keys(grouped);

  return (
    <div className="space-y-6">
      <Infotainer id="backroom-multilocation-guide" title="Multi-Location Settings" description="View and manage setting differences between locations. Push org defaults to all locations at once, copy between locations, or compare side-by-side." icon={<Building2 className="h-4 w-4 text-primary" />} />

      {/* Push to All Locations */}
      <PlatformCard variant="default" className="border-[hsl(var(--platform-primary)/0.2)]">
        <PlatformCardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
              <Upload className="w-5 h-5 text-[hsl(var(--platform-primary))]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <PlatformCardTitle>Push Org Defaults to All Locations</PlatformCardTitle>
                <MetricInfoTooltip description="Takes your organization-level backroom settings and replicates them as overrides for every active location. Stations are excluded since they're hardware-specific. Existing location overrides will be replaced." />
              </div>
              <PlatformCardDescription>Apply your org-level configuration to every location at once for faster multi-location setup.</PlatformCardDescription>
            </div>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent>
          {pushPreFlight && pushPreFlight.settingsCount === 0 ? (
            <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">No org-level settings to push. Configure settings in other sections first.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="rounded-lg border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.5)] px-4 py-3 flex-1 min-w-[140px]">
                  <p className={tokens.label.default}>Settings</p>
                  <p className={cn(tokens.body.emphasis, 'text-[hsl(var(--platform-foreground))]')}>{pushPreFlight?.settingsCount ?? 0} org default(s)</p>
                </div>
                <div className="rounded-lg border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.5)] px-4 py-3 flex-1 min-w-[140px]">
                  <p className={tokens.label.default}>Locations</p>
                  <p className={cn(tokens.body.emphasis, 'text-[hsl(var(--platform-foreground))]')}>{pushPreFlight?.locationsCount ?? 0} active</p>
                </div>
                <div className="rounded-lg border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.5)] px-4 py-3 flex-1 min-w-[140px]">
                  <p className={tokens.label.default}>Alert Rules</p>
                  <p className={cn(tokens.body.emphasis, 'text-[hsl(var(--platform-foreground))]')}>{pushPreFlight?.alertRulesCount ?? 0} org rule(s)</p>
                </div>
                {(pushPreFlight?.existingOverrideCount ?? 0) > 0 && (
                  <div className="rounded-lg border border-amber-500/30 bg-[hsl(var(--platform-bg-card)/0.5)] px-4 py-3 flex-1 min-w-[140px]">
                    <p className="text-sm text-amber-500">Existing Overrides</p>
                    <p className={cn(tokens.body.emphasis, 'text-[hsl(var(--platform-foreground))]')}>{pushPreFlight?.existingOverrideCount} will be replaced</p>
                  </div>
                )}
              </div>
              <PlatformButton onClick={() => setShowPushDialog(true)} disabled={!pushPreFlight || pushPreFlight.settingsCount === 0}>
                <Upload className="w-4 h-4 mr-1.5" /> Push to All Locations
              </PlatformButton>
            </div>
          )}
        </PlatformCardContent>
      </PlatformCard>

      {/* Push Confirmation Dialog */}
      <AlertDialog open={showPushDialog} onOpenChange={setShowPushDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Push Org Defaults to All Locations</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>This will apply <span className="text-foreground">{pushPreFlight?.settingsCount} org-level setting(s)</span> to all <span className="text-foreground">{pushPreFlight?.locationsCount} active location(s)</span>.</p>
                {(pushPreFlight?.existingOverrideCount ?? 0) > 0 && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{pushPreFlight?.existingOverrideCount} existing location override(s) will be replaced.</span>
                  </div>
                )}
                <p className="text-muted-foreground text-xs">Stations are excluded — they require location-specific hardware configuration.</p>
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <Checkbox checked={includeAlertRules} onCheckedChange={(v) => setIncludeAlertRules(!!v)} />
                  <span className="text-sm text-foreground">Also push {pushPreFlight?.alertRulesCount ?? 0} alert rule(s) to all locations</span>
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPushing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePushToAll} disabled={isPushing}>
              {isPushing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
              {isPushing ? 'Pushing…' : 'Confirm Push'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Override Summary */}
      <PlatformCard variant="default">
        <PlatformCardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[hsl(var(--platform-primary))]" />
            </div>
            <div>
              <div className="flex items-center gap-2"><PlatformCardTitle>Location Overrides</PlatformCardTitle><MetricInfoTooltip description="Shows all backroom settings with their org-level defaults and any location-specific overrides. Reset an override to fall back to the org default." /></div>
              <PlatformCardDescription>Manage org defaults and location-specific overrides for backroom settings.</PlatformCardDescription>
            </div>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-3">
          {settingKeys.length === 0 ? (
            <div className={tokens.empty.container}>
              <Building2 className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No settings configured</h3>
              <p className={tokens.empty.description}>Configure settings in other sections first.</p>
            </div>
          ) : (
            settingKeys.map(key => {
              const { orgDefault, overrides } = grouped[key];
              return (
                <div key={key} className="rounded-lg border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.5)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className={cn(tokens.body.emphasis, 'text-[hsl(var(--platform-foreground))]')}>{key.replace(/_/g, ' ')}</p>
                    <PlatformBadge variant="outline">{overrides.length} override{overrides.length !== 1 ? 's' : ''}</PlatformBadge>
                  </div>
                  {orgDefault && <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">Org default: {JSON.stringify(orgDefault.setting_value).slice(0, 100)}…</p>}
                  {overrides.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {overrides.map(o => {
                        const loc = locations.find(l => l.id === o.location_id);
                        return (
                          <div key={o.id} className="flex items-center justify-between text-sm">
                            <span className="text-[hsl(var(--platform-foreground-muted))]">{loc?.name || o.location_id}</span>
                            <PlatformButton variant="ghost" size="sm" onClick={() => handleResetOverride(o.id)}>
                              <RotateCcw className="w-3 h-3 mr-1" /> Reset
                            </PlatformButton>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </PlatformCardContent>
      </PlatformCard>

      {/* Copy Settings */}
      <PlatformCard variant="default">
        <PlatformCardHeader>
          <div className="flex items-center gap-2"><PlatformCardTitle>Copy Settings</PlatformCardTitle><MetricInfoTooltip description="Copies all backroom setting overrides from the source location to the target. Choose 'All other locations' to bulk-replicate one location's config everywhere." /></div>
          <PlatformCardDescription>Duplicate all backroom settings from one location to another or all others.</PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={sourceLocId} onValueChange={setSourceLocId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Source location" /></SelectTrigger>
              <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
            <ArrowRight className="w-4 h-4 text-[hsl(var(--platform-foreground-muted))]" />
            <Select value={targetLocId} onValueChange={setTargetLocId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Target location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__"><span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />All other locations</span></SelectItem>
                {locations.filter(l => l.id !== sourceLocId).map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <PlatformButton size="sm" onClick={handleCopySettings} disabled={!sourceLocId || !targetLocId}>
              <Copy className="w-4 h-4 mr-1.5" /> Copy
            </PlatformButton>
          </div>
        </PlatformCardContent>
      </PlatformCard>

      {/* Compare Mode */}
      <PlatformCard variant="default">
        <PlatformCardHeader>
          <div className="flex items-center gap-2"><PlatformCardTitle>Compare Locations</PlatformCardTitle><MetricInfoTooltip description="Select two locations to see which backroom settings differ. 'Different' means one or both have overrides with non-matching values." /></div>
          <PlatformCardDescription>See which settings differ between two locations.</PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={compareLocA} onValueChange={setCompareLocA}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Location A" /></SelectTrigger>
              <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-sm text-[hsl(var(--platform-foreground-muted))]">vs</span>
            <Select value={compareLocB} onValueChange={setCompareLocB}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Location B" /></SelectTrigger>
              <SelectContent>{locations.filter(l => l.id !== compareLocA).map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {compareLocA && compareLocB && (
            <div className="space-y-2">
              {compareKeys.length === 0 ? (
                <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">No overrides found for either location.</p>
              ) : (
                compareKeys.map(item => (
                  <div key={item.key} className="rounded-lg border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.5)] p-3 flex items-center justify-between">
                    <p className="text-sm text-[hsl(var(--platform-foreground))]">{item.key.replace(/_/g, ' ')}</p>
                    <PlatformBadge variant={item.differs ? 'error' : 'default'}>{item.differs ? 'Different' : 'Same'}</PlatformBadge>
                  </div>
                ))
              )}
            </div>
          )}
        </PlatformCardContent>
      </PlatformCard>
    </div>
  );
}
