import { useState, useMemo } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBackroomSettingsAll, useUpsertBackroomSetting, type BackroomSetting } from '@/hooks/backroom/useBackroomSettings';
import { useActiveLocations } from '@/hooks/useLocations';
import { supabase } from '@/integrations/supabase/client';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building2, Copy, RotateCcw, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Infotainer } from '@/components/ui/Infotainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

export function MultiLocationSection() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: allSettings, isLoading: settingsLoading } = useBackroomSettingsAll();
  const { data: locations, isLoading: locLoading } = useActiveLocations();
  const upsert = useUpsertBackroomSetting();
  const queryClient = useQueryClient();

  const [sourceLocId, setSourceLocId] = useState<string>('');
  const [targetLocId, setTargetLocId] = useState<string>('');
  const [compareLocA, setCompareLocA] = useState<string>('');
  const [compareLocB, setCompareLocB] = useState<string>('');

  const isLoading = settingsLoading || locLoading;

  // Group settings by key
  const grouped = useMemo(() => {
    if (!allSettings) return {};
    const map: Record<string, { orgDefault: BackroomSetting | null; overrides: BackroomSetting[] }> = {};
    for (const s of allSettings) {
      if (!map[s.setting_key]) {
        map[s.setting_key] = { orgDefault: null, overrides: [] };
      }
      if (!s.location_id) {
        map[s.setting_key].orgDefault = s;
      } else {
        map[s.setting_key].overrides.push(s);
      }
    }
    return map;
  }, [allSettings]);

  const handleCopySettings = async () => {
    if (!orgId || !sourceLocId || !targetLocId || sourceLocId === targetLocId) return;
    const sourceSettings = (allSettings || []).filter(s => s.location_id === sourceLocId);
    if (sourceSettings.length === 0) {
      toast.error('No settings found for the source location');
      return;
    }

    try {
      for (const s of sourceSettings) {
        await upsert.mutateAsync({
          organization_id: orgId,
          setting_key: s.setting_key,
          setting_value: s.setting_value,
          location_id: targetLocId,
        });
      }
      toast.success(`Copied ${sourceSettings.length} setting(s) to target location`);
    } catch (e: any) {
      toast.error('Failed to copy settings: ' + e.message);
    }
  };

  const handleResetOverride = async (settingId: string) => {
    const { error } = await supabase
      .from('backroom_settings')
      .delete()
      .eq('id', settingId);
    if (error) {
      toast.error('Failed to reset override: ' + error.message);
    } else {
      toast.success('Override removed — location will use org default');
      queryClient.invalidateQueries({ queryKey: ['backroom-settings'] });
    }
  };

  // Compare mode
  const compareKeys = useMemo(() => {
    if (!compareLocA || !compareLocB || !allSettings) return [];
    const aSettings = allSettings.filter(s => s.location_id === compareLocA);
    const bSettings = allSettings.filter(s => s.location_id === compareLocB);
    const allKeys = new Set([...aSettings.map(s => s.setting_key), ...bSettings.map(s => s.setting_key)]);
    return Array.from(allKeys).map(key => ({
      key,
      locA: aSettings.find(s => s.setting_key === key),
      locB: bSettings.find(s => s.setting_key === key),
      differs: JSON.stringify(aSettings.find(s => s.setting_key === key)?.setting_value) !==
               JSON.stringify(bSettings.find(s => s.setting_key === key)?.setting_value),
    }));
  }, [compareLocA, compareLocB, allSettings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
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
      <Infotainer
        id="backroom-multilocation-guide"
        title="Multi-Location Settings"
        description="View and manage setting differences between locations. Copy settings from one location to another or compare side-by-side."
        icon={<Building2 className="h-4 w-4 text-primary" />}
      />
      {/* Override Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Building2 className={tokens.card.icon} />
            </div>
            <div>
              <div className="flex items-center gap-2"><CardTitle className={tokens.card.title}>Multi-Location Settings</CardTitle><MetricInfoTooltip description="Shows all backroom settings with their org-level defaults and any location-specific overrides. Reset an override to fall back to the org default." /></div>
              <CardDescription className={tokens.body.muted}>Manage org defaults and location-specific overrides for backroom settings.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
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
                <div key={key} className={cn(tokens.card.inner, 'p-4')}>
                  <div className="flex items-center justify-between mb-2">
                    <p className={tokens.body.emphasis}>{key.replace(/_/g, ' ')}</p>
                    <Badge variant="outline">{overrides.length} override{overrides.length !== 1 ? 's' : ''}</Badge>
                  </div>
                  {orgDefault && (
                    <p className={tokens.body.muted}>Org default: {JSON.stringify(orgDefault.setting_value).slice(0, 100)}…</p>
                  )}
                  {overrides.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {overrides.map(o => {
                        const loc = locations.find(l => l.id === o.location_id);
                        return (
                          <div key={o.id} className="flex items-center justify-between text-sm">
                            <span className={tokens.body.muted}>{loc?.name || o.location_id}</span>
                            <Button variant="ghost" size={tokens.button.inline} onClick={() => handleResetOverride(o.id)}>
                              <RotateCcw className="w-3 h-3 mr-1" /> Reset
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Copy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className={tokens.card.title}>Copy Settings</CardTitle>
          <CardDescription className={tokens.body.muted}>Duplicate all backroom settings from one location to another.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={sourceLocId} onValueChange={setSourceLocId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Source location" /></SelectTrigger>
              <SelectContent>
                {locations.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <Select value={targetLocId} onValueChange={setTargetLocId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Target location" /></SelectTrigger>
              <SelectContent>
                {locations.filter(l => l.id !== sourceLocId).map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size={tokens.button.card} onClick={handleCopySettings} disabled={!sourceLocId || !targetLocId}>
              <Copy className="w-4 h-4 mr-1.5" /> Copy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Compare Mode */}
      <Card>
        <CardHeader>
          <CardTitle className={tokens.card.title}>Compare Locations</CardTitle>
          <CardDescription className={tokens.body.muted}>See which settings differ between two locations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={compareLocA} onValueChange={setCompareLocA}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Location A" /></SelectTrigger>
              <SelectContent>
                {locations.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className={tokens.body.muted}>vs</span>
            <Select value={compareLocB} onValueChange={setCompareLocB}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Location B" /></SelectTrigger>
              <SelectContent>
                {locations.filter(l => l.id !== compareLocA).map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {compareLocA && compareLocB && (
            <div className="space-y-2">
              {compareKeys.length === 0 ? (
                <p className={tokens.body.muted}>No overrides found for either location.</p>
              ) : (
                compareKeys.map(item => (
                  <div key={item.key} className={cn(tokens.card.inner, 'p-3 flex items-center justify-between')}>
                    <p className={tokens.body.default}>{item.key.replace(/_/g, ' ')}</p>
                    <Badge variant={item.differs ? 'destructive' : 'secondary'}>
                      {item.differs ? 'Different' : 'Same'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
