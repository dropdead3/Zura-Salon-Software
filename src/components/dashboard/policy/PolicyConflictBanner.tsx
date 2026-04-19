/**
 * PolicyConflictBanner (Wave 28.6)
 *
 * Visibility contract: returns null when there are zero conflicts.
 * When conflicts exist, surfaces them as actionable items so two policies
 * of the same category aren't silently both wired to the same surface.
 */
import { AlertTriangle, ChevronRight, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { SURFACE_META } from '@/hooks/policy/usePolicyApplicability';
import {
  POLICY_CATEGORY_META,
  type PolicySurfaceConflict,
} from '@/hooks/policy/usePolicyData';

interface Props {
  conflicts: PolicySurfaceConflict[];
  onJumpToPolicy?: (libraryKey: string) => void;
}

export function PolicyConflictBanner({ conflicts, onJumpToPolicy }: Props) {
  if (conflicts.length === 0) return null;

  const primary = conflicts[0];
  const remaining = conflicts.length - 1;
  const surfaceMeta = SURFACE_META[primary.surface];
  const categoryMeta = POLICY_CATEGORY_META[primary.category];

  return (
    <Card className="rounded-xl border border-foreground/30 bg-card/80">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className={cn(tokens.card.iconBox, 'bg-foreground/5')}>
            <AlertTriangle className="w-5 h-5 text-foreground" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <h3 className="font-display text-sm tracking-wider uppercase text-foreground">
                Surface conflict detected
              </h3>
              <p className="font-sans text-xs text-muted-foreground mt-1">
                Two or more {categoryMeta.label.toLowerCase()} policies are wired to the
                same {surfaceMeta?.shortLabel ?? primary.surface} surface. Clients will see
                conflicting rules. Disable one mapping or merge the policies.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-sans text-[10px] border-border/70">
                {categoryMeta.label}
              </Badge>
              <Badge variant="outline" className="font-sans text-[10px] border-border/70">
                {surfaceMeta?.label ?? primary.surface}
              </Badge>
              <span className="font-sans text-[10px] text-muted-foreground">
                {primary.policy_keys.length} policies
              </span>
            </div>

            <div className="space-y-1">
              {primary.policy_keys.map((key, i) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onJumpToPolicy?.(key)}
                  className="flex items-center justify-between w-full text-left rounded-md px-2 py-1.5 hover:bg-muted/40 transition-colors group"
                >
                  <span className="font-sans text-xs text-foreground truncate">
                    {primary.policy_titles[i] ?? key}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              ))}
            </div>

            {remaining > 0 && (
              <p className="font-sans text-xs text-muted-foreground pt-1 border-t border-border/40">
                +{remaining} more conflict{remaining === 1 ? '' : 's'} across other surfaces
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
