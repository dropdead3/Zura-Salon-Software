import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Package, Loader2 } from 'lucide-react';
import type { Reward } from '@/services/pointsService';

interface RewardCardProps {
  reward: Reward;
  userBalance: number;
  onRedeem: (rewardId: string) => void;
  isRedeeming?: boolean;
}

const categoryColors: Record<string, string> = {
  time_off: 'bg-blue-500/10 text-blue-600',
  merchandise: 'bg-purple-500/10 text-purple-600',
  experience: 'bg-pink-500/10 text-pink-600',
  recognition: 'bg-amber-500/10 text-amber-600',
};

export function RewardCard({
  reward,
  userBalance,
  onRedeem,
  isRedeeming,
}: RewardCardProps) {
  const canAfford = userBalance >= reward.points_cost;
  const isOutOfStock =
    reward.quantity_available !== null && reward.quantity_available <= 0;

  return (
    <Card className="overflow-hidden flex flex-col">
      {/* Image or placeholder */}
      <div className="aspect-video bg-muted flex items-center justify-center">
        {reward.image_url ? (
          <img
            src={reward.image_url}
            alt={reward.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="w-12 h-12 text-muted-foreground" />
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        {/* Category badge */}
        {reward.category && (
          <Badge
            variant="secondary"
            className={`w-fit mb-2 ${categoryColors[reward.category] || ''}`}
          >
            {reward.category.replace(/_/g, ' ')}
          </Badge>
        )}

        {/* Name and description */}
        <h3 className="font-medium mb-1">{reward.name}</h3>
        {reward.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {reward.description}
          </p>
        )}

        <div className="mt-auto pt-3 border-t flex items-center justify-between">
          {/* Points cost */}
          <div className="flex items-center gap-1 text-amber-600">
            <Coins className="w-4 h-4" />
            <span className="font-medium">{reward.points_cost.toLocaleString()}</span>
          </div>

          {/* Stock indicator */}
          {reward.quantity_available !== null && (
            <span className="text-xs text-muted-foreground">
              {reward.quantity_available} left
            </span>
          )}
        </div>

        {/* Redeem button */}
        <Button
          className="w-full mt-3"
          disabled={!canAfford || isOutOfStock || isRedeeming}
          onClick={() => onRedeem(reward.id)}
        >
          {isRedeeming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isOutOfStock ? (
            'Out of Stock'
          ) : !canAfford ? (
            `Need ${(reward.points_cost - userBalance).toLocaleString()} more`
          ) : (
            'Redeem'
          )}
        </Button>
      </div>
    </Card>
  );
}
