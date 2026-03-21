/**
 * TargetWeightProgress — Per-line visual progress indicator.
 *
 * Shows target weight vs current (live) weight with a progress bar.
 * Green when target reached, amber on overpour. Never blocks mixing.
 */

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Check, AlertTriangle } from 'lucide-react';

interface TargetWeightProgressProps {
  productName: string;
  targetWeight: number;
  currentWeight: number;
  unit: string;
}

export function TargetWeightProgress({
  productName,
  targetWeight,
  currentWeight,
  unit,
}: TargetWeightProgressProps) {
  const percentage = targetWeight > 0 ? Math.min((currentWeight / targetWeight) * 100, 100) : 0;
  const isReached = currentWeight >= targetWeight && targetWeight > 0;
  const isOverpour = currentWeight > targetWeight * 1.05 && targetWeight > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={tokens.body.default}>{productName}</span>
        <div className="flex items-center gap-1.5">
          <span className={cn(tokens.body.muted, 'tabular-nums text-xs')}>
            Target: {targetWeight} {unit}
          </span>
          {isReached && !isOverpour && (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          )}
          {isOverpour && (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          )}
        </div>
      </div>

      <Progress
        value={percentage}
        className="h-2"
        indicatorClassName={cn(
          isOverpour
            ? 'bg-amber-500'
            : isReached
              ? 'bg-emerald-500'
              : 'bg-primary',
        )}
      />

      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-xs tabular-nums font-medium',
            isOverpour
              ? 'text-amber-500'
              : isReached
                ? 'text-emerald-500'
                : 'text-muted-foreground',
          )}
        >
          {currentWeight} {unit}
        </span>
        {isOverpour && (
          <span className="text-[10px] text-amber-500">
            +{(currentWeight - targetWeight).toFixed(1)} {unit} over
          </span>
        )}
      </div>
    </div>
  );
}
