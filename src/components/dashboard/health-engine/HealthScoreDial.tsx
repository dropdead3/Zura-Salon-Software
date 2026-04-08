import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { getRiskTier, getRiskLabel, RISK_TIER_COLORS, RISK_TIER_BG } from '@/hooks/useHealthEngine';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface HealthScoreDialProps {
  score: number;
  trend?: 'improving' | 'stable' | 'declining';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function HealthScoreDial({ score, trend, size = 'md', className }: HealthScoreDialProps) {
  const tier = getRiskTier(score);
  const label = getRiskLabel(tier);

  const sizeConfig = {
    sm: { dim: 96, stroke: 6, fontSize: 'text-xl', labelSize: 'text-[9px]' },
    md: { dim: 144, stroke: 8, fontSize: 'text-3xl', labelSize: 'text-[10px]' },
    lg: { dim: 192, stroke: 10, fontSize: 'text-4xl', labelSize: 'text-xs' },
  };

  const { dim, stroke, fontSize, labelSize } = sizeConfig[size];
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score)) / 100;
  const dashOffset = circumference * (1 - progress);

  const strokeColor = {
    elite: 'stroke-emerald-500',
    strong: 'stroke-blue-500',
    at_risk: 'stroke-amber-500',
    critical: 'stroke-destructive',
  }[tier];

  const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;
  const trendColor = trend === 'improving' ? 'text-emerald-500' : trend === 'declining' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted"
          />
          {/* Progress arc */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={cn(strokeColor, 'transition-all duration-1000 ease-out')}
          />
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-display font-medium', fontSize, RISK_TIER_COLORS[tier])}>
            {score}
          </span>
          <span className={cn('font-display uppercase tracking-wider text-muted-foreground', labelSize)}>
            {label}
          </span>
        </div>
      </div>
      {trend && (
        <div className={cn('flex items-center gap-1', trendColor)}>
          <TrendIcon className="w-3.5 h-3.5" />
          <span className="font-sans text-xs font-medium capitalize">{trend}</span>
        </div>
      )}
    </div>
  );
}
