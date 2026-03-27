/**
 * RatioLockIndicator — Badge showing ratio lock is active.
 *
 * When ratio lock is engaged, displays the locked ratio and adjusts
 * target weights based on the base ingredient's actual weight.
 */

import React from 'react';
import { Lock, Unlock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

interface RatioLockIndicatorProps {
  isLocked: boolean;
  ratio: string | null;
  className?: string;
}

export function RatioLockIndicator({
  isLocked,
  ratio,
  className,
}: RatioLockIndicatorProps) {
  if (!ratio) return null;

  return (
    <Badge
      variant={isLocked ? 'default' : 'outline'}
      className={cn(
        'gap-1 text-[10px] font-sans',
        isLocked ? 'bg-primary/10 text-primary border-primary/20' : '',
        className,
      )}
    >
      {isLocked ? (
        <Lock className="w-3 h-3" />
      ) : (
        <Unlock className="w-3 h-3" />
      )}
      Ratio {ratio}
    </Badge>
  );
}

// ─── Ratio Adjustment Utility ───────────────────────

export interface RatioTarget {
  productName: string;
  originalTarget: number;
  adjustedTarget: number;
  unit: string;
  ratioMultiplier: number;
}

/**
 * Compute adjusted targets when the base ingredient weight changes.
 * The first line is treated as the base ingredient.
 */
export function computeAdjustedTargets(
  lines: Array<{ product_name: string; quantity: number; unit: string }>,
  baseActualWeight: number,
): RatioTarget[] {
  if (lines.length < 2 || lines[0].quantity <= 0) return [];

  const baseOriginal = lines[0].quantity;
  const scaleFactor = baseActualWeight / baseOriginal;

  return lines.map((line, idx) => ({
    productName: line.product_name,
    originalTarget: line.quantity,
    adjustedTarget: idx === 0
      ? baseActualWeight
      : Math.round(line.quantity * scaleFactor * 100) / 100,
    unit: line.unit,
    ratioMultiplier: idx === 0 ? 1 : Math.round((line.quantity / baseOriginal) * 10) / 10,
  }));
}
