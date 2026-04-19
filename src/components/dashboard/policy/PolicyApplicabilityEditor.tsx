/**
 * Applicability editor (Wave 28.5)
 *
 * Schema-light grid for picking who a policy applies to. Group by scope_type;
 * each scope is a multiselect. Empty = "applies to everyone in that scope".
 */
import { useMemo } from 'react';
import { Loader2, Save, Users } from 'lucide-react';
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
} from '@/hooks/policy/usePolicyApplicability';
import { useLocations } from '@/hooks/useLocations';

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
  const save = useSavePolicyApplicability();

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
        <p className="font-sans text-xs text-muted-foreground">
          Pick who this policy applies to. Leaving a scope empty means it applies to{' '}
          <span className="text-foreground font-medium">everyone</span> in that scope.
        </p>
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
