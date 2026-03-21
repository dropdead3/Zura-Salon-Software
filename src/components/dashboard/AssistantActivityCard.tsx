import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { format, subDays } from 'date-fns';
import { Users, DollarSign } from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAssistantActivity } from '@/hooks/useAssistantActivity';

export function AssistantActivityCard() {
  const [period, setPeriod] = useState<30 | 90>(30);
  const dateTo = format(new Date(), 'yyyy-MM-dd');
  const dateFrom = format(subDays(new Date(), period), 'yyyy-MM-dd');

  const { summaries, totalAssignments, uniqueAssistants, isLoading } = useAssistantActivity(dateFrom, dateTo);
  const { formatCurrency } = useFormatCurrency();
  const [expanded, setExpanded] = useState(false);
  const totalAssistedRevenue = summaries.reduce((sum, s) => sum + (s.assistedRevenue || 0), 0);

  const displayed = expanded ? summaries : summaries.slice(0, 5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Assistant Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (summaries.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Assistant Activity
            </CardTitle>
            <CardDescription>Who's assisting whom — last {period} days</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={period === 30 ? 'secondary' : 'ghost'}
              size={tokens.button.inline}
              className="h-7 text-xs"
              onClick={() => setPeriod(30)}
            >
              30d
            </Button>
            <Button
              variant={period === 90 ? 'secondary' : 'ghost'}
              size={tokens.button.inline}
              className="h-7 text-xs"
              onClick={() => setPeriod(90)}
            >
              90d
            </Button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
          <div>
            <span className="font-medium text-foreground">{totalAssignments}</span>
            <span className="text-muted-foreground ml-1">total assists</span>
          </div>
          <div>
            <span className="font-medium text-foreground">{uniqueAssistants}</span>
            <span className="text-muted-foreground ml-1">assistants active</span>
          </div>
          {totalAssistedRevenue > 0 && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium text-foreground">{formatCurrency(totalAssistedRevenue)}</span>
              <span className="text-muted-foreground">assisted revenue</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {displayed.map((item) => {
          const topPairing = Array.from(item.pairings.values())
            .sort((a, b) => b.count - a.count)[0];

          return (
            <div key={item.assistantUserId} className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={item.photoUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {item.assistantName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{item.assistantName}</span>
                  <span className="text-sm font-mono text-muted-foreground">{item.totalAssists}</span>
                </div>
                {topPairing && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Most with</span>
                    <span className="font-medium text-foreground">{topPairing.name}</span>
                    <span>({topPairing.count}×)</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {summaries.length > 5 && (
          <Button
            variant="ghost"
            size={tokens.button.inline}
            className="w-full text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show less' : `Show all ${summaries.length}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
