/**
 * SessionSummary — Final summary of a completed mix session.
 * Shows total cost, net usage, formula, and status.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { MixSession } from '@/hooks/backroom/useMixSession';
import type { MixBowl } from '@/hooks/backroom/useMixBowls';
import { calculateSessionCost, calculateSessionNetUsage, type BowlSummary } from '@/lib/backroom/mix-calculations';

interface SessionSummaryProps {
  session: MixSession;
  bowls: MixBowl[];
}

export function SessionSummary({ session, bowls }: SessionSummaryProps) {
  const bowlSummaries: BowlSummary[] = bowls.map((b) => ({
    totalDispensedWeight: b.total_dispensed_weight ?? 0,
    totalDispensedCost: b.total_dispensed_cost ?? 0,
    leftoverWeight: b.leftover_weight ?? 0,
    netUsageWeight: b.net_usage_weight ?? b.total_dispensed_weight ?? 0,
  }));

  const totalCost = calculateSessionCost(bowlSummaries);
  const totalNetUsage = calculateSessionNetUsage(bowlSummaries);
  const isUnresolved = session.unresolved_flag;

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {isUnresolved ? (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          )}
          <CardTitle className="font-display text-base tracking-wide">
            Session Summary
          </CardTitle>
          {isUnresolved && (
            <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
              Unresolved
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="font-sans text-xs text-muted-foreground">Bowls</p>
            <p className="font-display text-lg tabular-nums">{bowls.length}</p>
          </div>
          <div>
            <p className="font-sans text-xs text-muted-foreground">Net Usage</p>
            <p className="font-display text-lg tabular-nums">{totalNetUsage.toFixed(1)}g</p>
          </div>
          <div>
            <p className="font-sans text-xs text-muted-foreground">Total Cost</p>
            <p className="font-display text-lg tabular-nums">
              <BlurredAmount value={totalCost} prefix="$" />
            </p>
          </div>
        </div>

        {isUnresolved && session.unresolved_reason && (
          <div className="mt-3 rounded-md bg-amber-500/10 px-3 py-2">
            <p className="font-sans text-xs text-amber-600 dark:text-amber-400">
              {session.unresolved_reason}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
