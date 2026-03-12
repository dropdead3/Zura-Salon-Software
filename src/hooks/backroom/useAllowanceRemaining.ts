/**
 * useAllowanceRemaining — Real-time allowance tracking for active bowls.
 * Compares current dispensed weight against service allowance policy.
 */

import { useMemo } from 'react';
import { useServiceAllowancePolicies } from '@/hooks/billing/useServiceAllowancePolicies';
import type { MixBowlLine } from '@/hooks/backroom/useMixBowlLines';

export type AllowanceStatus = 'safe' | 'warning' | 'over';

export interface AllowanceRemainingResult {
  included: number;
  used: number;
  remaining: number;
  pct: number;
  status: AllowanceStatus;
  hasPolicy: boolean;
  unit: string;
}

/**
 * Returns live allowance remaining given a service ID and current bowl lines.
 * Warning threshold at 80% usage.
 */
export function useAllowanceRemaining(
  serviceId: string | null | undefined,
  lines: MixBowlLine[]
): AllowanceRemainingResult {
  const { data: policies } = useServiceAllowancePolicies(serviceId ?? undefined);

  return useMemo(() => {
    const activePolicy = policies?.find((p) => p.is_active);

    if (!activePolicy) {
      const totalUsed = lines.reduce((sum, l) => sum + l.dispensed_quantity, 0);
      return {
        included: 0,
        used: totalUsed,
        remaining: 0,
        pct: 0,
        status: 'safe' as AllowanceStatus,
        hasPolicy: false,
        unit: 'g',
      };
    }

    const included = activePolicy.included_allowance_qty;
    const unit = activePolicy.allowance_unit || 'g';
    const used = lines.reduce((sum, l) => sum + l.dispensed_quantity, 0);
    const remaining = Math.max(0, included - used);
    const pct = included > 0 ? (used / included) * 100 : 0;

    let status: AllowanceStatus = 'safe';
    if (pct >= 100) status = 'over';
    else if (pct >= 80) status = 'warning';

    return { included, used, remaining, pct, status, hasPolicy: true, unit };
  }, [policies, lines]);
}
