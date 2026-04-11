import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { tokens } from '@/lib/design-tokens';
import {
  DOMINATION_STRATEGY_CONFIG,
  getScoreBand,
  type DominationStrategy,
} from '@/config/seo-engine/seo-domination-config';
import { MapPin, DollarSign } from 'lucide-react';

interface Props {
  serviceCategory: string;
  dominationScore: number;
  strategyState: DominationStrategy;
  visibleMarketShare: number;
  estimatedMarketDemand: number;
  capturedRevenueShare: number;
  contributingLocationIds: string[];
  locationLabels?: Record<string, string>;
  directive?: string;
}

export function SEODominationTargetCard({
  serviceCategory,
  dominationScore,
  strategyState,
  visibleMarketShare,
  estimatedMarketDemand,
  capturedRevenueShare,
  contributingLocationIds,
  locationLabels = {},
  directive,
}: Props) {
  const strategy = DOMINATION_STRATEGY_CONFIG[strategyState];
  const band = getScoreBand(dominationScore);
  const opportunity = Math.round(estimatedMarketDemand * (1 - capturedRevenueShare));
  const locationNames = contributingLocationIds
    .map(id => locationLabels[id] ?? id)
    .filter(Boolean);

  return (
    <div className="p-4 border border-border/60 rounded-lg space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display text-sm tracking-wide">{serviceCategory.toUpperCase()}</span>
          <span className={`text-sm font-display tracking-wide ${band.color}`}>
            {dominationScore}
          </span>
        </div>
        <Badge
          variant="outline"
          className={`${strategy.bgColor} ${strategy.color} ${strategy.borderColor} font-display text-xs tracking-wider`}
        >
          {strategy.label}
        </Badge>
      </div>

      {/* Score bar */}
      <Progress value={dominationScore} className="h-1.5" />

      {/* Metrics row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Market Share: ~{Math.round(visibleMarketShare * 100)}%</span>
        {opportunity > 0 && (
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            +${opportunity.toLocaleString()} opportunity
          </span>
        )}
      </div>

      {/* Contributing locations */}
      {locationNames.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>{locationNames.join(' + ')} contributing</span>
        </div>
      )}

      {/* Directive */}
      {directive && (
        <p className="text-xs text-muted-foreground italic">"{directive}"</p>
      )}
    </div>
  );
}
