import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { tokens } from '@/lib/design-tokens';
import { useSEOEngineSettings } from '@/hooks/useSEOEngineSettings';
import { SEO_SETTINGS_SCHEMA } from '@/config/seo-engine/seo-settings-schema';
import { Settings2, Shield, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  organizationId: string | undefined;
}

export function SEOAutonomySettings({ organizationId }: Props) {
  const { getSetting, updateSetting, isLoading } = useSEOEngineSettings(organizationId);

  const autonomySettings = SEO_SETTINGS_SCHEMA.filter((s) => s.group === 'autonomy');
  const isEnabled = getSetting('autonomy_enabled') === true;

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Settings2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Autonomous Growth</CardTitle>
              <CardDescription className="font-sans">
                Control automated SEO task execution
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) =>
                updateSetting.mutate({ key: 'autonomy_enabled', value: checked })
              }
            />
            <Badge
              variant={isEnabled ? 'default' : 'secondary'}
              className="font-sans text-xs"
            >
              {isEnabled ? 'Active' : 'Off'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!isEnabled && (
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 border border-border/60">
            <Shield className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground font-sans">
              Autonomous mode is disabled. Zura will suggest and assign tasks but will not execute them automatically.
            </p>
          </div>
        )}

        {isEnabled && (
          <>
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground font-sans">
                Zura will automatically execute high-confidence SEO tasks within the limits below.
                All actions are logged and reversible.
              </p>
            </div>

            {autonomySettings
              .filter((s) => s.key !== 'autonomy_enabled')
              .map((setting) => {
                const value = getSetting(setting.key);

                if (setting.type === 'boolean') {
                  return (
                    <div key={setting.key} className="flex items-center justify-between">
                      <div>
                        <Label className="font-sans text-sm">{setting.label}</Label>
                        <p className="text-xs text-muted-foreground font-sans">{setting.description}</p>
                      </div>
                      <Switch
                        checked={value === true}
                        onCheckedChange={(checked) =>
                          updateSetting.mutate({ key: setting.key, value: checked })
                        }
                      />
                    </div>
                  );
                }

                return (
                  <div key={setting.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-sans text-sm">{setting.label}</Label>
                        <p className="text-xs text-muted-foreground font-sans">{setting.description}</p>
                      </div>
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="font-display tracking-wide text-sm tabular-nums">
                            {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(2) : value}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Range: {setting.min} – {setting.max}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Slider
                      value={[typeof value === 'number' ? value : (setting.defaultValue as number)]}
                      min={setting.min}
                      max={setting.max}
                      step={setting.max! <= 1 ? 0.05 : 1}
                      onValueCommit={([v]) =>
                        updateSetting.mutate({ key: setting.key, value: v })
                      }
                    />
                  </div>
                );
              })}
          </>
        )}
      </CardContent>
    </Card>
  );
}
