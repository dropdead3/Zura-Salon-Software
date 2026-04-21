import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, ChevronRight, Circle, Lock } from 'lucide-react';
import type { PolicyLibraryEntry, OrgPolicy } from '@/hooks/policy/usePolicyData';
import { POLICY_STATUS_META } from '@/hooks/policy/usePolicyData';
import { SURFACE_META } from '@/hooks/policy/usePolicyApplicability';

interface Props {
  entry: PolicyLibraryEntry;
  adopted?: OrgPolicy;
  onClick: () => void;
  consumerLabel?: string;
  showDefaultFallback?: boolean;
  /** When true, marks this row as the next-action row in setup mode:
   *  amber tint + chevron pointer. Setup-mode-only; governance mode
   *  never sets this. */
  nextPointer?: boolean;
}

const recommendationLabel: Record<PolicyLibraryEntry['recommendation'], string> = {
  required: 'Required',
  recommended: 'Recommended',
  optional: 'Optional',
};

const audienceLabel: Record<PolicyLibraryEntry['audience'], string> = {
  internal: 'Internal',
  external: 'Client-facing',
  both: 'Internal + Client',
};

export function PolicyLibraryRow({
  entry,
  adopted,
  onClick,
  consumerLabel,
  showDefaultFallback,
  nextPointer = false,
}: Props) {
  const isAdopted = !!adopted;
  const isRequired = entry.recommendation === 'required';
  const status = adopted?.status;
  const statusMeta = status ? POLICY_STATUS_META[status] : null;

  const surfaces = entry.candidate_surfaces ?? [];
  const visibleSurfaces = surfaces.slice(0, 4);
  const extraSurfaceCount = surfaces.length - visibleSurfaces.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative w-full text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        'transition-colors hover:bg-muted/30',
        isRequired &&
          'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-primary/50',
        isRequired && !isAdopted && 'bg-primary/[0.02]',
      )}
    >
      <div className="@container/row px-4 py-3.5 flex items-start gap-3">
        {/* Status icon */}
        {isAdopted ? (
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        ) : (
          <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
        )}

        {/* Title + description block */}
        <div className="flex-1 min-w-0">
          <h4 className="font-sans text-sm font-medium text-foreground truncate">
            {entry.title}
          </h4>
          <p className="font-sans text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {entry.short_description}
          </p>
          {(consumerLabel || (showDefaultFallback && !isAdopted)) && (
            <p className="font-sans text-xs text-muted-foreground/80 mt-0.5 truncate">
              {consumerLabel}
              {consumerLabel && showDefaultFallback && !isAdopted && (
                <span className="mx-1.5 text-muted-foreground/40">·</span>
              )}
              {showDefaultFallback && !isAdopted && (
                <span className="italic">Using platform default</span>
              )}
            </p>
          )}
        </div>

        {/* Badges + Renders to (right cluster) */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap @[480px]/row:flex-nowrap justify-end">
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <Badge
              variant="outline"
              className={cn(
                'rounded-full font-sans text-[10px] px-2 py-0 h-5',
                entry.recommendation === 'required'
                  ? 'text-primary border-primary/40 bg-primary/5'
                  : 'text-muted-foreground border-border/70',
              )}
            >
              {entry.recommendation === 'required' && <Lock className="w-2.5 h-2.5 mr-1" />}
              {recommendationLabel[entry.recommendation]}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full font-sans text-[10px] px-2 py-0 h-5 border-border/70 text-muted-foreground"
            >
              {audienceLabel[entry.audience]}
            </Badge>
            {statusMeta && (
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full font-sans text-[10px] px-2 py-0 h-5 border-border/70',
                  statusMeta.tone === 'success' && 'text-primary border-primary/30',
                  statusMeta.tone === 'warning' && 'text-foreground border-foreground/30',
                  statusMeta.tone === 'muted' && 'text-muted-foreground',
                )}
              >
                {statusMeta.label}
              </Badge>
            )}
          </div>

          {surfaces.length > 0 && (
            <div className="hidden @[640px]/row:flex items-center gap-1">
              {visibleSurfaces.map((s) => {
                const meta = SURFACE_META[s];
                if (!meta) return null;
                const Icon = meta.icon;
                return (
                  <span
                    key={s}
                    title={meta.label}
                    className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-muted/60 text-muted-foreground"
                  >
                    <Icon className="w-3 h-3" />
                  </span>
                );
              })}
              {extraSurfaceCount > 0 && (
                <span className="font-sans text-[10px] text-muted-foreground ml-0.5">
                  +{extraSurfaceCount}
                </span>
              )}
            </div>
          )}

          {/* Tablet collapsed surface indicator */}
          {surfaces.length > 0 && (
            <span
              title={`Renders to ${surfaces.length} surface${surfaces.length === 1 ? '' : 's'}`}
              className="@[640px]/row:hidden inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-md bg-muted/60 text-muted-foreground font-sans text-[10px]"
            >
              {surfaces.length}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
