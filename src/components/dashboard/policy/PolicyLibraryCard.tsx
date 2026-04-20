import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Lock } from 'lucide-react';
import type { PolicyLibraryEntry, OrgPolicy } from '@/hooks/policy/usePolicyData';
import { POLICY_STATUS_META } from '@/hooks/policy/usePolicyData';
import { SURFACE_META } from '@/hooks/policy/usePolicyApplicability';

interface Props {
  entry: PolicyLibraryEntry;
  adopted?: OrgPolicy;
  onClick: () => void;
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

export function PolicyLibraryCard({ entry, adopted, onClick }: Props) {
  const isAdopted = !!adopted;
  const isRequired = entry.recommendation === 'required';
  const status = adopted?.status;
  const statusMeta = status ? POLICY_STATUS_META[status] : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl w-full"
    >
      <Card
        className={cn(
          'relative rounded-xl border transition-all h-full overflow-hidden',
          isRequired && !isAdopted && 'bg-primary/[0.03]',
          !isRequired && 'bg-card/80',
          isAdopted
            ? 'border-primary/30'
            : isRequired
              ? 'border-primary/40 group-hover:border-primary/60'
              : 'border-border/60 group-hover:border-foreground/20',
          isRequired &&
            'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-primary/50',
        )}
      >
        <CardContent className="p-5 flex flex-col gap-3 h-full">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              {isAdopted ? (
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-sans text-sm font-medium text-foreground truncate">
                  {entry.title}
                </h4>
                <p className="font-sans text-xs text-muted-foreground mt-1 line-clamp-2">
                  {entry.short_description}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
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

          {entry.candidate_surfaces && entry.candidate_surfaces.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1 mt-auto border-t border-border/40">
              <span className="font-sans text-[10px] uppercase tracking-wider text-muted-foreground/70">
                Renders to
              </span>
              <div className="flex items-center gap-1">
                {entry.candidate_surfaces.slice(0, 4).map((s) => {
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
                {entry.candidate_surfaces.length > 4 && (
                  <span className="font-sans text-[10px] text-muted-foreground">
                    +{entry.candidate_surfaces.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </button>
  );
}
