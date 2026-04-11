import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useSEODomination } from '@/hooks/useSEODomination';
import { SEODominationTargetCard } from './SEODominationTargetCard';
import { useLocations } from '@/hooks/useLocations';

interface Props {
  organizationId: string | undefined;
}

export function SEODominationDashboard({ organizationId }: Props) {
  const { data, isLoading } = useSEODomination(organizationId);
  const { data: locations = [] } = useLocations(organizationId);

  const locationLabels: Record<string, string> = {};
  for (const loc of locations) {
    locationLabels[(loc as any).id] = (loc as any).name ?? (loc as any).id;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Market Domination</CardTitle>
              <CardDescription>Loading market intelligence...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.targets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Market Domination</CardTitle>
              <CardDescription>Define domination targets to begin market intelligence</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={tokens.empty.container}>
            <Crown className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No domination targets defined</h3>
            <p className={tokens.empty.description}>
              Add city + service category targets to start tracking market control
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group scores by city
  const scoresByCity = new Map<string, typeof data.scores>();
  for (const s of data.scores) {
    if (!scoresByCity.has(s.city)) scoresByCity.set(s.city, []);
    scoresByCity.get(s.city)!.push(s);
  }

  // Build stacking directives map
  const stackingDirectives = new Map<string, string>();
  for (const s of data.stacking) {
    stackingDirectives.set(s.nextTargetId, s.directive);
  }

  // City momentum map
  const cityMomentumMap = new Map(data.cityMomentum.map(m => [m.city, m]));

  const MomentumIcon = ({ direction }: { direction: string }) => {
    if (direction === 'gaining') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
    if (direction === 'losing') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
    return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Market Domination</CardTitle>
            <CardDescription>Category control across your markets</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from(scoresByCity.entries()).map(([city, scores]) => {
          const momentum = cityMomentumMap.get(city);
          const sorted = [...scores].sort((a, b) => b.domination_score - a.domination_score);

          return (
            <div key={city} className="space-y-3">
              {/* City header */}
              <div className="flex items-center justify-between">
                <h4 className="font-display text-sm tracking-wide">{city.toUpperCase()}</h4>
                {momentum && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MomentumIcon direction={momentum.direction} />
                    <span className="capitalize">{momentum.direction}</span>
                  </div>
                )}
              </div>

              {/* Target cards */}
              <div className="space-y-2">
                {sorted.map(s => (
                  <SEODominationTargetCard
                    key={s.target_id}
                    serviceCategory={s.serviceCategory}
                    dominationScore={s.domination_score}
                    strategyState={s.strategy_state as any}
                    visibleMarketShare={s.visible_market_share}
                    estimatedMarketDemand={s.estimated_market_demand}
                    capturedRevenueShare={s.captured_revenue_share}
                    contributingLocationIds={s.contributing_location_ids}
                    locationLabels={locationLabels}
                    directive={stackingDirectives.get(s.target_id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
