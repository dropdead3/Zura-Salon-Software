/**
 * Surface mapping editor (Wave 28.5)
 *
 * For each candidate surface on a policy, the operator chooses whether it
 * renders, and which variant (internal / client / disclosure / manager_note).
 * Candidate surfaces are sourced from the library entry to constrain choices.
 */
import { Loader2, Save, MapPin, Sparkles } from 'lucide-react';
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
  useSavePolicySurfaceMappings,
} from '@/hooks/policy/usePolicyApplicability';
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

  const byKey = new Map(rows.map((r) => [r.surface, r]));

  const updateSurface = (surface: PolicySurface, patch: Partial<SurfaceMappingRow>) => {
    const existing = byKey.get(surface);
    const next: SurfaceMappingRow = existing
      ? { ...existing, ...patch }
      : {
          surface,
          variant_type: SURFACE_META[surface].defaultVariant,
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
          Pick where this policy renders. Each surface gets its own tone — the same rules,
          rewritten for the audience.
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
                        Active
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
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3 items-center">
                  <label className="font-sans text-xs text-muted-foreground">Tone variant</label>
                  <Select
                    value={variant}
                    onValueChange={(v) =>
                      updateSurface(surface, { variant_type: v as PolicyVariantType })
                    }
                  >
                    <SelectTrigger className="h-9 font-sans text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedVariants.map((v) => (
                        <SelectItem key={v} value={v} className="font-sans text-sm">
                          <div className="flex flex-col">
                            <span>{VARIANT_META[v].label}</span>
                            <span className="text-xs text-muted-foreground">
                              {VARIANT_META[v].description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            <span className="text-foreground font-medium">What happens next:</span> AI drafting
            (Wave 28.6) will render the same configured rules into the right tone for each
            active surface. The Handbook OS, Client Policy Center, and booking flow then read
            from these mappings.
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
          Save surfaces
        </Button>
      </div>
    </div>
  );
}
