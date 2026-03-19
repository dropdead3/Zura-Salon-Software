/**
 * InstantFormulaCard — Surfaces the client's most relevant previous formula
 * at the top of the backroom workspace. Includes formula sharing.
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { Clock, FlaskConical, History, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { FormulaPreview } from './FormulaPreview';
import { useInstantFormulaMemory } from '@/hooks/backroom/useInstantFormulaMemory';
import { Skeleton } from '@/components/ui/skeleton';
import { ShareFormulaDialog } from './ShareFormulaDialog';
import { useShareFormula } from '@/hooks/backroom/useSharedFormulas';
import type { ResolvedFormulaMemory } from '@/lib/backroom/services/formula-resolver';

interface InstantFormulaCardProps {
  clientId: string | null | undefined;
  serviceName: string | null | undefined;
  currentServiceName?: string | null;
  onUseFormula?: (formula: ResolvedFormulaMemory) => void;
  onViewHistory?: () => void;
}

export function InstantFormulaCard({
  clientId,
  serviceName,
  currentServiceName,
  onUseFormula,
  onViewHistory,
}: InstantFormulaCardProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const shareFormula = useShareFormula();
  const { data: formula, isLoading } = useInstantFormulaMemory(clientId, serviceName);

  if (!clientId) return null;

  if (isLoading) {
    return (
      <Card className="rounded-xl border-border/50 bg-card/60">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!formula) {
    return (
      <EmptyState
        icon={FlaskConical}
        title="No Previous Formula"
        description="No previous formula on file for this client."
        className="py-6"
      />
    );
  }

  const isCrossService =
    formula.source === 'client_any_service' &&
    currentServiceName &&
    formula.serviceName &&
    formula.serviceName.toLowerCase() !== currentServiceName.toLowerCase();

  const headerLabel =
    formula.source === 'salon_recipe'
      ? 'Salon Formula'
      : `Last Visit${formula.serviceName ? ` — ${formula.serviceName}` : ''}`;

  const dateLabel = formula.createdAt
    ? format(new Date(formula.createdAt), 'MMMM d')
    : null;

  return (
    <Card className="rounded-xl border-border/50 bg-card/60">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60">
            <FlaskConical className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <span className="font-display text-sm tracking-wide uppercase text-foreground">
              {headerLabel}
            </span>
            {dateLabel && (
              <span className="ml-2 font-sans text-xs text-muted-foreground">{dateLabel}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="secondary" className="text-[10px] font-sans">
            {formula.sourceLabel}
          </Badge>
          {isCrossService && (
            <Badge variant="outline" className="text-[10px] font-sans text-amber-600 border-amber-300">
              Different service
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3">
        <FormulaPreview
          formulaData={formula.lines}
          formulaType="actual"
          compact
        />

        {formula.notes && (
          <p className="font-sans text-xs text-muted-foreground italic px-2">
            {formula.notes}
          </p>
        )}

        {formula.staffName && (
          <div className="flex items-center gap-1.5 px-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="font-sans text-xs text-muted-foreground">
              by {formula.staffName}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          {onUseFormula && (
            <Button
              size="sm"
              variant="default"
              className="font-sans font-medium"
              onClick={() => onUseFormula(formula)}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              Use Last Formula
            </Button>
          )}
          {formula.referenceId && clientId && (
            <Button
              size="sm"
              variant="ghost"
              className="font-sans font-medium text-muted-foreground"
              onClick={() => setShowShareDialog(true)}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
          )}
          {onViewHistory && (
            <Button
              size="sm"
              variant="ghost"
              className="font-sans font-medium text-muted-foreground"
              onClick={onViewHistory}
            >
              <History className="h-3.5 w-3.5" />
              View Formula History
            </Button>
          )}
        </div>

        {formula.referenceId && clientId && (
          <ShareFormulaDialog
            open={showShareDialog}
            onOpenChange={setShowShareDialog}
            onSubmit={(sharedWithUserId, notes) => {
              shareFormula.mutate({
                formulaHistoryId: formula.referenceId!,
                sharedWithUserId,
                clientId: clientId!,
                notes: notes || undefined,
              });
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
