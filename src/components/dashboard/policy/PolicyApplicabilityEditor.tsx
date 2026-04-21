/**
 * Applicability editor (Wave 28.5 → per-policy relevance, Wave 28.12)
 *
 * Schema-light grid for picking who a policy applies to. Per the relevance
 * manifest (`getRelevantScopes`), the editor renders only the scopes that
 * matter for the open policy — irrelevant lanes are hidden, not greyed out.
 *
 * Special handling:
 *   - `audienceLocked` policies (HR, etc.) hide the Audience scope and pin
 *     a single audience row matching the library's audience.
 *   - The Location scope renders an explicit "All locations" affordance.
 *   - The `primaryScope` is rendered first with a "Primary lever" badge.
 *   - Legacy rows (saved against scopes the manifest now excludes) are
 *     preserved on save and surfaced as a "Legacy filters" footnote.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Loader2, Save, Users, Sparkles, Lock } from 'lucide-react';
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
import {
  getRelevantScopes,
  partitionRowsByRelevance,
} from '@/lib/policy/applicability-relevance';
import type { PolicyLibraryEntry } from '@/hooks/policy/usePolicyData';

interface Props {
  versionId: string;
  rows: ApplicabilityRow[];
  onChange: (rows: ApplicabilityRow[]) => void;
  onSaved?: () => void;
  /** Library entry — drives per-policy scope relevance. */
  entry: Pick<PolicyLibraryEntry, 'key' | 'category' | 'audience'>;
}

const AUDIENCE_LABEL: Record<'internal' | 'external' | 'both', string> = {
  internal: 'Internal policy — applies to staff only',
  external: 'Client-facing policy — applies to clients',
  both: 'Internal + client-facing policy',
};

export function PolicyApplicabilityEditor({
  versionId,
  rows,
  onChange,
  onSaved,
  entry,
}: Props) {
  const { data: locations = [] } = useLocations();
  const { data: profile } = usePolicyOrgProfile();
  const save = useSavePolicyApplicability();
  const seededRef = useRef(false);
  const seededFromProfile = seededRef.current;

  // Per-policy scope manifest — single source of truth for which lanes render.
  const manifest = useMemo(
    () => getRelevantScopes(entry.key, entry.category, entry.audience),
    [entry.key, entry.category, entry.audience],
  );

  // Render order: primary scope first (when set), then the rest in manifest order.
  const orderedScopes = useMemo<PolicyScopeType[]>(() => {
    if (!manifest.primaryScope) return manifest.scopes;
    return [
      manifest.primaryScope,
      ...manifest.scopes.filter((s) => s !== manifest.primaryScope),
    ];
  }, [manifest]);

  // Profile-seeded defaults: when this editor mounts with zero rows AND we
  // have a profile, seed the relevant scopes from org reality. Operator can
  // deselect any chip before saving.
  useEffect(() => {
    if (seededRef.current) return;
    if (rows.length > 0) {
      seededRef.current = true;
      return;
    }
    if (!profile) return;
    const seeded = seedApplicabilityFromProfile(profile, locations, {
      relevantScopes: manifest.scopes,
      audienceLocked: manifest.audienceLocked,
      lockedAudience: entry.audience,
    });
    if (seeded.length > 0) {
      seededRef.current = true;
      onChange(seeded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, locations, rows.length, manifest, entry.audience]);

  // Partition rows into relevant (editable) + legacy (preserved on save,
  // surfaced as footnote). Doctrine: operator data is sacred.
  const { relevant: relevantRows, legacy: legacyRows } = useMemo(
    () => partitionRowsByRelevance(rows, manifest),
    [rows, manifest],
  );

  const grouped = useMemo(() => {
    const out: Record<PolicyScopeType, Set<string>> = {
      role: new Set(),
      employment_type: new Set(),
      service_category: new Set(),
      location: new Set(),
      audience: new Set(),
    };
    relevantRows.forEach((r) => out[r.scope_type].add(r.scope_value));
    return out;
  }, [relevantRows]);

  const optionsFor = (scope: PolicyScopeType) => {
    if (scope === 'location') {
      return locations.map((l) => ({ value: l.id, label: l.name }));
    }
    return DEFAULT_SCOPE_VALUES[scope];
  };

  // Mutate a single scope's selection set. Always preserves rows from other
  // scopes AND legacy rows so saves never silently delete operator data.
  const writeScope = (scope: PolicyScopeType, nextSet: Set<string>) => {
    const others = rows.filter(
      (r) => r.scope_type !== scope || !manifest.scopes.includes(scope),
    );
    // ↑ keep rows that aren't this scope, OR rows for excluded scopes (legacy).
    // Actually simpler: drop only the editable rows for THIS scope, then re-add.
    const kept = rows.filter((r) => {
      // Keep legacy (excluded scope) rows unchanged.
      if (!manifest.scopes.includes(r.scope_type) && r.scope_type !== scope) return true;
      // Keep rows for other editable scopes.
      if (r.scope_type !== scope) return true;
      // Drop rows for the scope we're rewriting.
      return false;
    });
    void others;
    const next: ApplicabilityRow[] = [...kept];
    nextSet.forEach((v) => next.push({ scope_type: scope, scope_value: v }));
    onChange(next);
  };

  const toggle = (scope: PolicyScopeType, value: string) => {
    const set = new Set(grouped[scope]);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    writeScope(scope, set);
  };

  // Location-only "All locations" affordance: clears all individual chips.
  const allLocationsActive =
    grouped.location.size === 0 || grouped.location.size === locations.length;
  const toggleAllLocations = () => {
    if (allLocationsActive) {
      // Deselect "all" by selecting only the first location (so the operator
      // sees something selected and can build from there). Empty also means
      // "all", but the explicit chip should feel like a clear toggle.
      const first = locations[0]?.id;
      writeScope('location', new Set(first ? [first] : []));
    } else {
      writeScope('location', new Set()); // empty = all
    }
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

      {/* Audience-locked banner — replaces the Audience chip group when the
          library structurally fixes the audience (e.g., HR policies). */}
      {manifest.audienceLocked && (
        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
          <Lock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="font-sans text-xs text-muted-foreground">
            <span className="text-foreground font-medium">
              {AUDIENCE_LABEL[entry.audience]}
            </span>
            . Audience is set by the library and isn't editable here.
          </p>
        </div>
      )}

      <div className="space-y-5">
        {orderedScopes.map((scope) => {
          const opts = optionsFor(scope);
          const meta = SCOPE_TYPE_META[scope];
          const selected = grouped[scope];
          const isPrimary = manifest.primaryScope === scope;
          const isLocation = scope === 'location';
          const isEmpty = selected.size === 0;
          if (isLocation && opts.length === 0) return null;

          // Location badge phrasing: "All locations" reads cleaner than "Everyone"
          // for the location lane specifically.
          const badgeLabel = isEmpty
            ? isLocation
              ? 'All locations'
              : 'Everyone'
            : `${selected.size} selected`;

          return (
            <div key={scope} className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="font-display text-xs tracking-wider uppercase text-foreground">
                      {meta.label}
                    </h5>
                    {isPrimary && (
                      <Badge
                        variant="outline"
                        className="font-sans text-[9px] uppercase tracking-wider border-primary/40 text-primary"
                      >
                        Primary lever
                      </Badge>
                    )}
                  </div>
                  <p className="font-sans text-xs text-muted-foreground mt-0.5">
                    {meta.description}
                  </p>
                </div>
                <Badge
                  variant={isEmpty ? 'outline' : 'secondary'}
                  className="font-sans text-[10px]"
                >
                  {badgeLabel}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3">
                {/* Location-only "All locations" chip — explicit affordance for
                    the most common operator intent. */}
                {isLocation && (
                  <button
                    type="button"
                    onClick={toggleAllLocations}
                    className={cn(
                      'px-3 py-1.5 rounded-full border text-xs font-sans transition-colors',
                      allLocationsActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/40',
                    )}
                  >
                    All locations
                  </button>
                )}
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

      {/* Legacy filters — rows for scopes the current manifest excludes.
          Preserved on save (operator data is sacred) but not editable here. */}
      {legacyRows.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5">
          <p className="font-sans text-[10px] uppercase tracking-wider text-muted-foreground">
            Legacy filters
          </p>
          <p className="font-sans text-xs text-muted-foreground">
            {legacyRows.length} filter{legacyRows.length === 1 ? '' : 's'} from a prior
            version are preserved but not editable here ({Array.from(
              new Set(legacyRows.map((r) => SCOPE_TYPE_META[r.scope_type].label)),
            ).join(', ')}).
          </p>
        </div>
      )}

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
