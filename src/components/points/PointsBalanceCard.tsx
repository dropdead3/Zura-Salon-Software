import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Coins, TrendingUp, Gift, Loader2 } from 'lucide-react';
import { usePointsBalance, usePointsHistory } from '@/hooks/usePoints';
import { Link } from 'react-router-dom';

export function PointsBalanceCard() {
  const { data: balance = 0, isLoading: balanceLoading } = usePointsBalance();
  const { data: history = [], isLoading: historyLoading } = usePointsHistory(5);

  const recentEarnings = history
    .filter((t) => t.points > 0)
    .slice(0, 3);

  const isLoading = balanceLoading || historyLoading;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Coins className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-display text-sm tracking-wide">MY POINTS</h3>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-2xl font-medium">{balance.toLocaleString()}</p>
            )}
          </div>
        </div>
        <Button variant="outline" size={tokens.button.card} asChild>
          <Link to="/dashboard/rewards">
            <Gift className="w-4 h-4 mr-1" />
            Shop
          </Link>
        </Button>
      </div>

      {recentEarnings.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs text-muted-foreground font-display tracking-wide flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            RECENT EARNINGS
          </p>
          {recentEarnings.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground truncate max-w-[180px]">
                {transaction.description || transaction.action_type.replace(/_/g, ' ')}
              </span>
              <span className="text-green-600 font-medium">
                +{transaction.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
