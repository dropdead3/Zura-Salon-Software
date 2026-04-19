/**
 * ConflictRow (Wave 28.9)
 *
 * One row per (surface, category) bucket where 2+ policies collide.
 * Each colliding policy gets a clickable title (→ configurator) and a
 * "Disable mapping" action that soft-disables that policy's surface mapping.
 */
import { useMemo, useState } from 'react';
import { ChevronRight, Loader2, PowerOff, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { SURFACE_META } from '@/hooks/policy/usePolicyApplicability';
import {
  POLICY_CATEGORY_META,
  useOrgPolicies,
  type PolicySurfaceConflict,
} from '@/hooks/policy/usePolicyData';
import { useResolvePolicyConflict } from '@/hooks/policy/useResolvePolicyConflict';

interface Props {
  conflict: PolicySurfaceConflict;
  onJumpToPolicy?: (libraryKey: string) => void;
}

export function ConflictRow({ conflict, onJumpToPolicy }: Props) {
  const surfaceMeta = SURFACE_META[conflict.surface];
  const categoryMeta = POLICY_CATEGORY_META[conflict.category];
  const SurfaceIcon = surfaceMeta?.icon ?? AlertTriangle;
  const resolve = useResolvePolicyConflict();
  const { data: adopted = [] } = useOrgPolicies();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const adoptedByKey = useMemo(() => {
    const m = new Map<string, (typeof adopted)[number]>();
    adopted.forEach((p) => m.set(p.library_key, p));
    return m;
  }, [adopted]);

  const handleDisable = (key: string) => {
    const pol = adoptedByKey.get(key);
    if (!pol?.current_version_id) return;
    setPendingKey(key);
    resolve.mutate(
      { versionId: pol.current_version_id, surface: conflict.surface },
      { onSettled: () => setPendingKey(null) },
    );
  };

  return (
    <Card className="rounded-xl border border-border bg-card/80">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className={cn(tokens.card.iconBox, 'bg-foreground/5')}>
            <SurfaceIcon className="w-5 h-5 text-foreground" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-sans text-[10px] border-border/70">
                    {surfaceMeta?.label ?? conflict.surface}
                  </Badge>
                  <Badge variant="outline" className="font-sans text-[10px] border-border/70">
                    {categoryMeta.label}
                  </Badge>
                  <span className="font-sans text-[10px] text-muted-foreground">
                    {conflict.policy_keys.length} policies
                  </span>
                </div>
                <p className="font-sans text-xs text-muted-foreground max-w-xl">
                  Multiple {categoryMeta.label.toLowerCase()} policies wired to{' '}
                  {surfaceMeta?.shortLabel ?? conflict.surface}. Disable all but one to clear
                  the conflict.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              {conflict.policy_keys.map((key, i) => {
                const isPending = pendingKey === key && resolve.isPending;
                const hasVersion = !!adoptedByKey.get(key)?.current_version_id;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 pl-3 pr-1.5 py-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => onJumpToPolicy?.(key)}
                      className="flex-1 min-w-0 flex items-center justify-between text-left group"
                    >
                      <span className="font-sans text-xs text-foreground truncate group-hover:underline">
                        {conflict.policy_titles[i] ?? key}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 ml-2" />
                    </button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isPending || !hasVersion}
                      onClick={() => handleDisable(key)}
                      className="h-7 px-2 font-sans text-[11px]"
                    >
                      {isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <PowerOff className="w-3 h-3 mr-1" />
                          Disable
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
