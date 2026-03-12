/**
 * ConfidenceScoreBadge — Visual indicator of mix session data reliability.
 * Green ≥ 85, Amber ≥ 60, Red < 60.
 */

import { Badge } from '@/components/ui/badge';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfidenceScoreBadgeProps {
  score: number;
  compact?: boolean;
}

const TIERS = [
  { min: 85, icon: ShieldCheck, label: 'High Confidence', colorClass: 'text-success', bgClass: 'bg-success/10 border-success/30' },
  { min: 60, icon: Shield, label: 'Moderate', colorClass: 'text-warning', bgClass: 'bg-warning/10 border-warning/30' },
  { min: 0, icon: ShieldAlert, label: 'Low Confidence', colorClass: 'text-destructive', bgClass: 'bg-destructive/10 border-destructive/30' },
] as const;

export function ConfidenceScoreBadge({ score, compact = false }: ConfidenceScoreBadgeProps) {
  const roundedScore = Math.round(score);
  const tier = TIERS.find((t) => roundedScore >= t.min) ?? TIERS[2];
  const Icon = tier.icon;

  if (compact) {
    return (
      <Badge variant="outline" className={cn('text-[10px] gap-1', tier.bgClass, tier.colorClass)}>
        <Icon className="w-3 h-3" />
        {roundedScore}%
      </Badge>
    );
  }

  return (
    <div className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1', tier.bgClass)}>
      <Icon className={cn('w-3.5 h-3.5', tier.colorClass)} />
      <span className={cn('font-display text-xs tabular-nums', tier.colorClass)}>
        {roundedScore}%
      </span>
      <span className="font-sans text-[10px] text-muted-foreground ml-0.5">
        {tier.label}
      </span>
    </div>
  );
}
