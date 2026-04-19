/**
 * PolicyVersionHistoryPanel (Wave 28.9)
 *
 * Browsable, expandable list of every version of a single policy. Each entry
 * shows version number, timestamp, changelog summary, and a per-variant diff
 * against the previous version's same-type variant.
 *
 * Visibility contract: panel renders empty state until at least one version
 * exists (always true after first adopt, but cheap to honor).
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { History, ChevronDown, CheckCircle2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import {
  usePolicyVersionHistory,
  type PolicyVersionHistoryEntry,
  type PolicyVersionVariant,
} from '@/hooks/policy/usePolicyVersionHistory';
import { VARIANT_LABELS } from '@/hooks/policy/usePolicyDrafter';
import type { PolicyVariantType } from '@/hooks/policy/usePolicyDrafter';
import { VersionDiffView } from './VersionDiffView';

interface Props {
  policyId: string | null;
}

const VARIANT_ORDER: PolicyVariantType[] = ['internal', 'client', 'disclosure', 'manager_note'];

function findVariant(
  entry: PolicyVersionHistoryEntry,
  type: PolicyVariantType,
): PolicyVersionVariant | undefined {
  return entry.variants.find((v) => v.variant_type === type);
}

export function PolicyVersionHistoryPanel({ policyId }: Props) {
  const { data: versions = [], isLoading } = usePolicyVersionHistory(policyId);
  const [openVersionId, setOpenVersionId] = useState<string | null>(null);
  const [activeVariant, setActiveVariant] = useState<Record<string, PolicyVariantType>>({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className={tokens.empty.container}>
        <History className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No version history</h3>
        <p className={tokens.empty.description}>
          Versions are recorded automatically when rules are saved or variants approved.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {versions.map((v, idx) => {
        const prev = versions[idx + 1]; // next index = older version
        const isOpen = openVersionId === v.id;
        const selectedType =
          activeVariant[v.id] ??
          (v.variants.find((x) => x.body_md)?.variant_type ?? 'internal');
        const currentVariant = findVariant(v, selectedType);
        const prevVariant = prev ? findVariant(prev, selectedType) : undefined;

        return (
          <Collapsible
            key={v.id}
            open={isOpen}
            onOpenChange={(open) => setOpenVersionId(open ? v.id : null)}
          >
            <div
              className={cn(
                'rounded-xl border bg-card/60 transition-colors',
                isOpen ? 'border-foreground/30' : 'border-border/60',
              )}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge
                      variant="outline"
                      className="font-display text-[10px] tracking-wider border-border/70"
                    >
                      v{v.version_number}
                    </Badge>
                    <div className="min-w-0">
                      <p className="font-sans text-xs text-foreground truncate">
                        {v.changelog_summary ?? 'Version saved'}
                      </p>
                      <p className="font-sans text-[10px] text-muted-foreground">
                        {format(new Date(v.created_at), 'MMM d, yyyy · h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {v.approved_at && (
                      <Badge variant="secondary" className="font-sans text-[10px]">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Approved
                      </Badge>
                    )}
                    {v.is_published_external && (
                      <Badge variant="secondary" className="font-sans text-[10px]">
                        Public
                      </Badge>
                    )}
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 text-muted-foreground transition-transform',
                        isOpen && 'rotate-180',
                      )}
                    />
                  </div>
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border/40">
                  {/* Variant tabs */}
                  <div className="flex flex-wrap gap-1.5 pt-3">
                    {VARIANT_ORDER.map((vt) => {
                      const exists = v.variants.some((x) => x.variant_type === vt);
                      if (!exists) return null;
                      const isActive = selectedType === vt;
                      return (
                        <Button
                          key={vt}
                          type="button"
                          size="sm"
                          variant={isActive ? 'secondary' : 'ghost'}
                          onClick={() =>
                            setActiveVariant((prev) => ({ ...prev, [v.id]: vt }))
                          }
                          className="h-7 px-2.5 font-sans text-[11px]"
                        >
                          {VARIANT_LABELS[vt].label}
                        </Button>
                      );
                    })}
                  </div>

                  {currentVariant ? (
                    <VersionDiffView
                      previousBody={prevVariant?.body_md ?? null}
                      currentBody={currentVariant.body_md}
                    />
                  ) : (
                    <p className="font-sans text-xs text-muted-foreground italic">
                      No {VARIANT_LABELS[selectedType].label.toLowerCase()} variant in this
                      version.
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}
