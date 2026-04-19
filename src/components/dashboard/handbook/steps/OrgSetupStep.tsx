import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { BRAND_TONES, ROLE_OPTIONS, EMPLOYMENT_TYPES, US_STATES } from '@/lib/handbook/brandTones';
import { useDebounce } from '@/hooks/use-debounce';
import { useUpdateOrgSetup } from '@/hooks/handbook/useHandbookData';

interface Props {
  setup: any;
  versionId: string;
  onSavingChange?: (saving: boolean) => void;
}

export function OrgSetupStep({ setup, versionId, onSavingChange }: Props) {
  const [brandTone, setBrandTone] = useState<string>(setup?.brand_tone || 'professional');
  const [classifications, setClassifications] = useState<Record<string, boolean>>(
    setup?.classifications || { w2_full_time: true, w2_part_time: true, contractor_1099: false }
  );
  const [rolesEnabled, setRolesEnabled] = useState<string[]>(setup?.roles_enabled || []);
  const [statesOperated, setStatesOperated] = useState<string[]>(setup?.states_operated || []);
  const [locationStrategy, setLocationStrategy] = useState<string>(setup?.location_strategy || 'shared');

  const update = useUpdateOrgSetup(versionId);

  const debounced = useDebounce({ brandTone, classifications, rolesEnabled, statesOperated, locationStrategy }, 1200);

  useEffect(() => {
    if (!versionId) return;
    onSavingChange?.(true);
    update.mutate(
      {
        brand_tone: debounced.brandTone,
        classifications: debounced.classifications,
        roles_enabled: debounced.rolesEnabled,
        states_operated: debounced.statesOperated,
        location_strategy: debounced.locationStrategy,
      },
      { onSettled: () => onSavingChange?.(false) }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const toggleRole = (key: string) =>
    setRolesEnabled((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const toggleState = (s: string) =>
    setStatesOperated((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className={cn(tokens.heading.section)}>Organization Setup</h2>
        <p className="font-sans text-sm text-muted-foreground mt-1">
          Before drafting policy, we'll capture how your organization operates so the handbook reflects your real structure.
        </p>
      </div>

      {/* Brand tone */}
      <Card className="border-border bg-card/80">
        <CardHeader>
          <CardTitle className={cn(tokens.card.title, 'tracking-wide')}>Brand Tone</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BRAND_TONES.map((t) => (
            <button
              key={t.key}
              onClick={() => setBrandTone(t.key)}
              className={cn(
                'text-left p-4 rounded-lg border transition-colors',
                brandTone === t.key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
              )}
            >
              <div className="font-display text-sm tracking-wide">{t.label}</div>
              <div className="font-sans text-xs text-muted-foreground mt-1">{t.description}</div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Classifications */}
      <Card className="border-border bg-card/80">
        <CardHeader>
          <CardTitle className={cn(tokens.card.title, 'tracking-wide')}>Employment Classifications</CardTitle>
          <p className="font-sans text-sm text-muted-foreground">Which employment types apply at your organization?</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {EMPLOYMENT_TYPES.map((e) => (
            <label key={e.key} className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={!!classifications[e.key]}
                onCheckedChange={(v) => setClassifications((prev) => ({ ...prev, [e.key]: !!v }))}
              />
              <span className="font-sans text-sm text-foreground">{e.label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Roles */}
      <Card className="border-border bg-card/80">
        <CardHeader>
          <CardTitle className={cn(tokens.card.title, 'tracking-wide')}>Roles in Your Organization</CardTitle>
          <p className="font-sans text-sm text-muted-foreground">Select every role currently on your team.</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ROLE_OPTIONS.map((r) => {
            const active = rolesEnabled.includes(r.key);
            return (
              <button
                key={r.key}
                onClick={() => toggleRole(r.key)}
                className={cn(
                  'text-left p-3 rounded-lg border transition-colors flex items-center gap-3',
                  active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                )}
              >
                <Checkbox checked={active} className="pointer-events-none" />
                <span className="font-sans text-sm">{r.label}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Location strategy */}
      <Card className="border-border bg-card/80">
        <CardHeader>
          <CardTitle className={cn(tokens.card.title, 'tracking-wide')}>Location Strategy</CardTitle>
          <p className="font-sans text-sm text-muted-foreground">How should policies vary across your locations?</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { key: 'shared', label: 'Shared', desc: 'One unified handbook for all locations.' },
            { key: 'per_location', label: 'Per-Location', desc: 'Separate handbook per location.' },
            { key: 'hybrid', label: 'Hybrid', desc: 'Master handbook with location-specific addenda.' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setLocationStrategy(opt.key)}
              className={cn(
                'text-left p-4 rounded-lg border transition-colors',
                locationStrategy === opt.key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
              )}
            >
              <div className="font-display text-sm tracking-wide">{opt.label}</div>
              <div className="font-sans text-xs text-muted-foreground mt-1">{opt.desc}</div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* States */}
      <Card className="border-border bg-card/80">
        <CardHeader>
          <CardTitle className={cn(tokens.card.title, 'tracking-wide')}>States You Operate In</CardTitle>
          <p className="font-sans text-sm text-muted-foreground">Used to flag state-specific review areas later.</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {US_STATES.map((s) => {
              const active = statesOperated.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleState(s)}
                  className={cn(
                    'px-2.5 py-1 rounded font-sans text-xs border transition-colors',
                    active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/40 text-muted-foreground'
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
