/**
 * Surface mapping editor (Wave 28.5)
 *
 * For each candidate surface on a policy, the operator chooses whether it
 * renders, and which variant (internal / client / disclosure / manager_note).
 * Candidate surfaces are sourced from the library entry to constrain choices.
 */
import { Loader2, Save, MapPin, Sparkles, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  type PolicySurface,
  type SurfaceMappingRow,
  type PolicyVariantType,
  SURFACE_META,
  VARIANT_META,
  isSurfaceCompatibleWithAudience,
  defaultVariantForSurface,
  useSavePolicySurfaceMappings,
} from '@/hooks/policy/usePolicyApplicability';
import { usePolicyVariants } from '@/hooks/policy/usePolicyDrafter';
import type { PolicyLibraryEntry } from '@/hooks/policy/usePolicyData';

interface Props {
  versionId: string;
  candidateSurfaces: PolicySurface[];
  /** Wave 28.11.4 — required so we can filter candidates by audience intersection. */
  policyAudience: PolicyLibraryEntry['audience'];
  rows: SurfaceMappingRow[];
  onChange: (rows: SurfaceMappingRow[]) => void;
  onSaved?: () => void;
}

const ALL_VARIANTS: PolicyVariantType[] = ['internal', 'client', 'disclosure', 'manager_note'];

/** Variant types valid for a given audience (mirrors PolicyDraftWorkspace filter). */
function variantsForAudience(
  audience: PolicyLibraryEntry['audience'],
): PolicyVariantType[] {
  if (audience === 'internal') return ['internal', 'manager_note'];
  if (audience === 'external') return ['client', 'disclosure'];
  return ALL_VARIANTS;
}

export function PolicySurfaceEditor({
  versionId,
  candidateSurfaces,
  policyAudience,
  rows,
  onChange,
  onSaved,
}: Props) {
  const save = useSavePolicySurfaceMappings();

  // Filter candidates to surfaces compatible with the policy's audience.
  // Falls back to the full surface list (still audience-filtered) when the
  // library entry forgot to declare candidates.
  const baseSurfaces: PolicySurface[] = candidateSurfaces.length
    ? candidateSurfaces
    : (Object.keys(SURFACE_META) as PolicySurface[]);
  const surfaces: PolicySurface[] = baseSurfaces.filter((s) =>
    isSurfaceCompatibleWithAudience(policyAudience, SURFACE_META[s].audience),
  );

  const allowedVariants = variantsForAudience(policyAudience);

  // Wave 28.11.5 — read approved variants so we can warn the operator when
  // their selected tone will silently fall back to the 'client' variant at
  // render time (per `usePolicyForSurface` resolution rules).
  const { data: variantRows = [] } = usePolicyVariants(versionId);
  const approvedTypes = new Set(
    variantRows.filter((v) => v.approved && !!v.body_md).map((v) => v.variant_type),
  );

  const byKey = new Map(rows.map((r) => [r.surface, r]));

  const updateSurface = (surface: PolicySurface, patch: Partial<SurfaceMappingRow>) => {
    const existing = byKey.get(surface);
    const next: SurfaceMappingRow = existing
      ? { ...existing, ...patch }
      : {
          surface,
          // Wave 28.11.5 — audience-aware seed so 'both' surfaces (intake) seed
          // an internal-only policy with `'internal'`, not `'client'`.
          variant_type: defaultVariantForSurface(surface, policyAudience),
          enabled: true,
          surface_config: {},
          ...patch,
        };
    const others = rows.filter((r) => r.surface !== surface);
    onChange([...others, next]);
  };

  const handleSave = () => {
    // Persist only enabled surfaces, but keep zero-rows valid (clears mappings).
    const enabledRows = rows.filter((r) => r.enabled);
    save.mutate({ versionId, rows: enabledRows }, { onSuccess: onSaved });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2">
        <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="font-sans text-xs text-muted-foreground">
          Choose where clients and staff see this policy. Each place uses its own wording —
          the same rules, written for the right audience.
        </p>
      </div>

      <div className="space-y-3">
        {surfaces.map((surface) => {
          const meta = SURFACE_META[surface];
          const row = byKey.get(surface);
          const enabled = !!row?.enabled;
          const variant = row?.variant_type ?? meta.defaultVariant;
          return (
            <div
              key={surface}
              className={cn(
                'rounded-xl border bg-card p-4 transition-colors',
                enabled ? 'border-primary/40' : 'border-border',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="font-display text-xs tracking-wider uppercase text-foreground">
                      {meta.label}
                    </h5>
                    {enabled && (
                      <Badge variant="secondary" className="font-sans text-[10px]">
                        On
                      </Badge>
                    )}
                  </div>
                  <p className="font-sans text-xs text-muted-foreground mt-1">
                    {meta.description}
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) => updateSurface(surface, { enabled: v })}
                />
              </div>

              {enabled && (
                <div className="mt-4 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3 items-center">
                    <label className="font-sans text-xs text-muted-foreground">Written for</label>
                    <Select
                      value={variant}
                      onValueChange={(v) =>
                        updateSurface(surface, { variant_type: v as PolicyVariantType })
                      }
                    >
                      <SelectTrigger className="h-9 font-sans text-sm justify-between">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedVariants.map((v) => (
                          <SelectItem
                            key={v}
                            value={v}
                            description={VARIANT_META[v].description}
                            className="font-sans text-sm"
                          >
                            {VARIANT_META[v].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Wave 28.11.5 — fallback signal. If the chosen tone has no
                      approved variant but 'client' does, runtime resolution will
                      silently fall back. Tell the operator now. */}
                  {!approvedTypes.has(variant) && approvedTypes.has('client') && variant !== 'client' && (
                    <div className="flex items-start gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2 py-1.5">
                      <Info className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="font-sans text-[11px] text-muted-foreground">
                        No approved <span className="text-foreground">{VARIANT_META[variant].label}</span> draft yet — this surface will use the <span className="text-foreground">Client</span> wording as a fallback.
                      </p>
                    </div>
                  )}
                  {!approvedTypes.has(variant) && !approvedTypes.has('client') && (
                    <div className="flex items-start gap-1.5 rounded-md border border-foreground/20 bg-muted/40 px-2 py-1.5">
                      <Info className="w-3 h-3 text-foreground mt-0.5 flex-shrink-0" />
                      <p className="font-sans text-[11px] text-muted-foreground">
                        No approved draft for this tone — this surface won't show until wording is approved in the Drafts tab.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="font-sans text-xs text-muted-foreground">
            <span className="text-foreground font-medium">What happens next:</span> once you
            publish, the rules you set above will appear in each place you turned on — written
            in the right tone for staff or clients. Your booking page, client policy page, and
            staff handbook all read from this single source.
          </p>
        </div>
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
          Save changes
        </Button>
      </div>
    </div>
  );
}
