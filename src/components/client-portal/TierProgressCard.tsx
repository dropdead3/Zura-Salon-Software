import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Crown, Star, Award, Gem } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TierProgressCardProps {
  currentTier: string;
  currentPoints: number;
  lifetimePoints: number;
  tiers: Array<{
    tier_name: string;
    tier_key: string;
    minimum_lifetime_points: number;
    color: string;
    perks: string[];
  }>;
}

const tierIcons: Record<string, typeof Crown> = {
  bronze: Award,
  silver: Star,
  gold: Crown,
  platinum: Gem,
};

export function TierProgressCard({ currentTier, currentPoints, lifetimePoints, tiers }: TierProgressCardProps) {
  // Find current tier index and next tier
  const sortedTiers = [...tiers].sort((a, b) => a.minimum_lifetime_points - b.minimum_lifetime_points);
  const currentTierIndex = sortedTiers.findIndex(t => t.tier_key === currentTier);
  const currentTierData = sortedTiers[currentTierIndex];
  const nextTier = sortedTiers[currentTierIndex + 1];

  // Calculate progress to next tier
  let progressPercent = 100;
  let pointsToNext = 0;

  if (nextTier) {
    const currentThreshold = currentTierData?.minimum_lifetime_points || 0;
    const nextThreshold = nextTier.minimum_lifetime_points;
    const range = nextThreshold - currentThreshold;
    const progress = lifetimePoints - currentThreshold;
    progressPercent = Math.min(Math.round((progress / range) * 100), 100);
    pointsToNext = nextThreshold - lifetimePoints;
  }

  const TierIcon = tierIcons[currentTier] || Star;

  return (
    <Card className="overflow-hidden">
      <div 
        className="h-2" 
        style={{ backgroundColor: currentTierData?.color || 'hsl(var(--primary))' }}
      />
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${currentTierData?.color || 'hsl(var(--primary))'}20` }}
          >
            <TierIcon 
              className="w-8 h-8" 
              style={{ color: currentTierData?.color || 'hsl(var(--primary))' }}
            />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
              Current Tier
            </p>
            <h2 
              className="text-2xl font-medium"
              style={{ color: currentTierData?.color }}
            >
              {currentTierData?.tier_name || 'Member'}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4 border-y">
          <div className="text-center">
            <p className="text-3xl font-medium">{currentPoints.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Available Points</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-medium">{lifetimePoints.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Lifetime Points</p>
          </div>
        </div>

        {nextTier ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress to {nextTier.tier_name}</span>
              <span className="font-medium">{pointsToNext.toLocaleString()} points to go</span>
            </div>
            <Progress 
              value={progressPercent} 
              className="h-3"
              indicatorClassName={cn("transition-all")}
              style={{ 
                '--progress-color': nextTier.color 
              } as React.CSSProperties}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentTierData?.tier_name}</span>
              <span>{nextTier.tier_name}</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">
              🎉 You've reached the highest tier!
            </p>
          </div>
        )}

        {currentTierData?.perks && currentTierData.perks.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Your Perks</p>
            <ul className="space-y-1">
              {currentTierData.perks.map((perk, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span 
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: currentTierData.color }}
                  />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
