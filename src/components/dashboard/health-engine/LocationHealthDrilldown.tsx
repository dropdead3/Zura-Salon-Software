import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { getRiskTier, getRiskLabel, RISK_TIER_COLORS, RISK_TIER_BG, CATEGORY_LABELS, CATEGORY_ORDER } from '@/hooks/useHealthEngine';
import type { LocationHealthScore } from '@/hooks/useHealthEngine';
import { MapPin } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface LocationHealthDrilldownProps {
  locations: Array<LocationHealthScore & { locationName?: string }>;
  className?: string;
}

export function LocationHealthDrilldown({ locations, className }: LocationHealthDrilldownProps) {
  if (locations.length === 0) return null;

  const sorted = [...locations].sort((a, b) => b.score - a.score);

  return (
    <div className={cn('space-y-3', className)}>
      <span className={tokens.heading.subsection}>Location Scores</span>
      <div className="space-y-2">
        {sorted.map((loc) => {
          const tier = getRiskTier(loc.score);
          return (
            <div
              key={loc.location_id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card"
            >
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <span className={cn(tokens.body.emphasis, 'block truncate')}>
                  {loc.locationName || loc.location_id}
                </span>
                <Progress value={loc.score} className="h-1 mt-1" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn('font-display text-sm font-medium', RISK_TIER_COLORS[tier])}>
                  {loc.score}
                </span>
                <span className={cn(
                  'font-sans text-[10px] font-medium px-2 py-0.5 rounded-full',
                  RISK_TIER_BG[tier],
                )}>
                  {getRiskLabel(tier)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
