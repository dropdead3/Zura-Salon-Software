import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { usePointsHistory } from '@/hooks/usePoints';
import { format } from 'date-fns';

const actionTypeLabels: Record<string, string> = {
  training_complete: 'Training',
  bell_ring: 'Bell Ring',
  high_five_given: 'High Five Given',
  high_five_received: 'High Five Received',
  challenge_win: 'Challenge Win',
  shift_swap_complete: 'Shift Swap',
  quiz_passed: 'Quiz Passed',
  streak_7_day: '7-Day Streak',
  streak_30_day: '30-Day Streak',
  reward_redeem: 'Reward',
};

export function PointsHistoryPanel() {
  const { data: history = [], isLoading } = usePointsHistory(100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No points activity yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Complete trainings, ring the bell, and help your team to earn points!
        </p>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 pr-4">
        {history.map((transaction) => {
          const isPositive = transaction.points > 0;
          return (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isPositive ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}
                >
                  {isPositive ? (
                    <ArrowUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <ArrowDown className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {transaction.description ||
                      actionTypeLabels[transaction.action_type] ||
                      transaction.action_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
              <Badge
                variant={isPositive ? 'default' : 'destructive'}
                className={isPositive ? 'bg-green-600' : ''}
              >
                {isPositive ? '+' : ''}
                {transaction.points}
              </Badge>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
