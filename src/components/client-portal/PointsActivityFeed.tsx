import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowUpCircle, ArrowDownCircle, Gift, Sparkles, Clock } from 'lucide-react';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  points: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

interface PointsActivityFeedProps {
  transactions: Transaction[];
}

const typeIcons: Record<string, typeof Gift> = {
  earned: ArrowUpCircle,
  redeemed: ArrowDownCircle,
  bonus: Sparkles,
  expired: Clock,
  adjustment: Gift,
};

const typeColors: Record<string, string> = {
  earned: 'text-green-500',
  redeemed: 'text-amber-500',
  bonus: 'text-purple-500',
  expired: 'text-muted-foreground',
  adjustment: 'text-blue-500',
};

export function PointsActivityFeed({ transactions }: PointsActivityFeedProps) {
  const { formatDate } = useFormatDate();
  if (!transactions.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            No activity yet. Earn points on your next visit!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {transactions.map((tx) => {
              const Icon = typeIcons[tx.transaction_type] || Gift;
              const colorClass = typeColors[tx.transaction_type] || 'text-muted-foreground';
              const isPositive = tx.points > 0;

              return (
                <div 
                  key={tx.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className={cn('p-2 rounded-full bg-background', colorClass)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tx.description || tx.transaction_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(new Date(tx.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className={cn(
                    'font-medium',
                    isPositive ? 'text-green-600' : 'text-red-600'
                  )}>
                    {isPositive ? '+' : ''}{tx.points.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
