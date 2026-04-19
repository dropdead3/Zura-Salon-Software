/**
 * Applicability editor (Wave 28.5)
 *
 * Schema-light grid for picking who a policy applies to. Group by scope_type;
 * each scope is a multiselect. Empty = "applies to everyone in that scope".
 */
import { useEffect, useMemo, useRef } from 'react';
import { Loader2, Save, Users, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import { cn } from '@/lib/utils';
import {
  type ApplicabilityRow,
  type PolicyScopeType,
  SCOPE_TYPE_META,
  DEFAULT_SCOPE_VALUES,
  useSavePolicyApplicability,
  seedApplicabilityFromProfile,
} from '@/hooks/policy/usePolicyApplicability';
import { useLocations } from '@/hooks/useLocations';
import { usePolicyOrgProfile } from '@/hooks/policy/usePolicyOrgProfile';

interface Props {
  versionId: string;
  rows: ApplicabilityRow[];
  onChange: (rows: ApplicabilityRow[]) => void;
  onSaved?: () => void;
}

const SCOPE_ORDER: PolicyScopeType[] = [
  'audience',
  'role',
  'employment_type',
  'service_category',
  'location',
];

export function PolicyApplicabilityEditor({ versionId, rows, onChange, onSaved }: Props) {
  const { data: locations = [] } = useLocations();
  const { data: profile } = usePolicyOrgProfile();
  const save = useSavePolicyApplicability();
  const seededRef = useRef(false);
  const seededFromProfile = seededRef.current;

  // Profile-seeded defaults: when this editor mounts with zero rows AND we
  // have a profile, seed the scopes from roles_used / service_categories /
  // locations. Operator can deselect any chip before saving.
  useEffect(() => {
    if (seededRef.current) return;
    if (rows.length > 0) {
      seededRef.current = true;
      return;
    }
    if (!profile) return;
    const seeded = seedApplicabilityFromProfile(profile, locations);
    if (seeded.length > 0) {
      seededRef.current = true;
      onChange(seeded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, locations, rows.length]);

  const grouped = useMemo(() => {
    const out: Record<PolicyScopeType, Set<string>> = {
      role: new Set(),
      employment_type: new Set(),
      service_category: new Set(),
      location: new Set(),
      audience: new Set(),
    };
    rows.forEach((r) => out[r.scope_type].add(r.scope_value));
    return out;
  }, [rows]);

  const optionsFor = (scope: PolicyScopeType) => {
    if (scope === 'location') {
      return locations.map((l) => ({ value: l.id, label: l.name }));
    }
    return DEFAULT_SCOPE_VALUES[scope];
  };

  const toggle = (scope: PolicyScopeType, value: string) => {
    const set = new Set(grouped[scope]);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    const next: ApplicabilityRow[] = rows.filter((r) => r.scope_type !== scope);
    set.forEach((v) => next.push({ scope_type: scope, scope_value: v }));
    onChange(next);
  };

  const handleSave = () => {
    save.mutate({ versionId, rows }, { onSuccess: onSaved });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2">
        <Users className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="space-y-1.5">
          <p className="font-sans text-xs text-muted-foreground">
            Pick who this policy applies to. Leaving a scope empty means it applies to{' '}
            <span className="text-foreground font-medium">everyone</span> in that scope.
          </p>
          {seededFromProfile && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="font-sans text-[10px] text-primary">
                Pre-filled from your business profile — adjust as needed
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {SCOPE_ORDER.map((scope) => {
          const opts = optionsFor(scope);
          const meta = SCOPE_TYPE_META[scope];
          const selected = grouped[scope];
          const isEmpty = selected.size === 0;
          if (scope === 'location' && opts.length === 0) return null;
          return (
            <div key={scope} className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <h5 className="font-display text-xs tracking-wider uppercase text-foreground">
                    {meta.label}
                  </h5>
                  <p className="font-sans text-xs text-muted-foreground mt-0.5">
                    {meta.description}
                  </p>
                </div>
                <Badge
                  variant={isEmpty ? 'outline' : 'secondary'}
                  className="font-sans text-[10px]"
                >
                  {isEmpty ? 'Everyone' : `${selected.size} selected`}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3">
                {opts.map((opt) => {
                  const checked = selected.has(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggle(scope, opt.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-full border text-xs font-sans transition-colors',
                        checked
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/40',
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Separator />

      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={save.isPending}
          className="font-sans"
        >
          {save.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save applicability
        </Button>
      </div>
    </div>
  );
}
