/**
 * RetailPerformanceAlert — calm, advisory verdict surfaced as a standalone
 * alert card directly beneath the Revenue Breakdown card.
 *
 * Honors the visibility-contract / silence doctrine: returns null when the
 * verdict helper returns null (sub-materiality, missing inputs, no breakdown).
 */
import { Card } from '@/components/ui/card';
import { TrendingUp, Activity, AlertTriangle, AlertOctagon, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getRetailPerformanceVerdict,
  type RetailPerformanceTier,
} from '@/lib/retailPerformance';

interface RetailPerformanceAlertProps {
  trueRetailPercent: number | undefined;
  retailAttachmentRate: number | undefined;
  total: number;
  hasBreakdown: boolean;
  /**
   * When true, renders without the outer Card wrapper — for embedding inside
   * another card (e.g., bottom of Revenue Breakdown). The tier-tinted left
   * rail and background wash are applied directly to the alert row.
   */
  embedded?: boolean;
}

interface TierVisual {
  border: string;
  wash: string;
  iconWrap: string;
  icon: LucideIcon;
  iconColor: string;
  label: string;
}

const TIER_VISUALS: Record<RetailPerformanceTier, TierVisual> = {
  strong: {
    border: 'border-l-emerald-500/60',
    wash: 'bg-emerald-500/5',
    iconWrap: 'bg-emerald-500/10',
    icon: TrendingUp,
    iconColor: 'text-emerald-500',
    label: 'Strong',
  },
  healthy: {
    border: 'border-l-foreground/30',
    wash: 'bg-muted/30',
    iconWrap: 'bg-muted',
    icon: Activity,
    iconColor: 'text-foreground/70',
    label: 'Healthy',
  },
  soft: {
    border: 'border-l-amber-500/60',
    wash: 'bg-amber-500/5',
    iconWrap: 'bg-amber-500/10',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    label: 'Soft',
  },
  critical: {
    border: 'border-l-red-500/60',
    wash: 'bg-red-500/5',
    iconWrap: 'bg-red-500/10',
    icon: AlertOctagon,
    iconColor: 'text-red-500',
    label: 'Critical',
  },
};

export function RetailPerformanceAlert({
  trueRetailPercent,
  retailAttachmentRate,
  total,
  hasBreakdown,
}: RetailPerformanceAlertProps) {
  if (!hasBreakdown) return null;

  const verdict = getRetailPerformanceVerdict(
    trueRetailPercent,
    retailAttachmentRate,
    total,
  );
  if (!verdict) return null;

  const visual = TIER_VISUALS[verdict.tier];
  const Icon = visual.icon;

  return (
    <Card
      className={cn(
        'overflow-hidden border-l-4 border-border/40',
        visual.border,
        visual.wash,
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
            visual.iconWrap,
          )}
        >
          <Icon className={cn('w-4 h-4', visual.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-xs tracking-wide uppercase text-muted-foreground">
            Retail Health · {visual.label}
          </p>
          <p className="text-sm text-foreground/90 leading-relaxed mt-1">
            {verdict.copy}
          </p>
        </div>
      </div>
    </Card>
  );
}
