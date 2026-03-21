import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TrendData } from '@/hooks/useLeaderboardHistory';
import { TrendSparkline } from './TrendSparkline';

interface LeaderboardTrendIndicatorProps {
  trend: TrendData;
  showTooltip?: boolean;
}

export function LeaderboardTrendIndicator({ trend, showTooltip = true }: LeaderboardTrendIndicatorProps) {
  const { rankChange, previousRank, weeklyHistory } = trend;

  // Convert weekly history to score values for sparkline
  const sparklineData = weeklyHistory.map(w => w.score);

  if (weeklyHistory.length < 2) {
    return (
      <div className="w-20 h-6 flex items-center justify-center text-muted-foreground text-xs">
        —
      </div>
    );
  }

  if (!showTooltip) {
    return <TrendSparkline data={sparklineData} width={80} height={24} />;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button className="hover:opacity-80 transition-opacity">
            <TrendSparkline data={sparklineData} width={80} height={24} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="w-56 p-0">
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-display text-xs tracking-wide">RANK HISTORY</span>
              {previousRank && (
                <span className="text-xs text-muted-foreground">
                  Last week: #{previousRank}
                </span>
              )}
            </div>
            
            {/* Mini sparkline chart */}
            <div className="flex items-end gap-1 h-12">
              {weeklyHistory.map((week, idx) => {
                const maxRank = Math.max(...weeklyHistory.map(w => w.rank), 1);
                const height = ((maxRank - week.rank + 1) / maxRank) * 100;
                const isLatest = idx === weeklyHistory.length - 1;
                
                return (
                  <div
                    key={week.week}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className={`w-full rounded-t transition-all ${
                        isLatest ? 'bg-primary' : 'bg-muted'
                      }`}
                      style={{ height: `${Math.max(height, 10)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            
            {/* Week labels */}
            <div className="flex gap-1 text-[10px] text-muted-foreground">
              {weeklyHistory.map((week, idx) => (
                <div key={week.week} className="flex-1 text-center truncate">
                  {idx === 0 || idx === weeklyHistory.length - 1 ? week.week : ''}
                </div>
              ))}
            </div>

            {/* Stats summary */}
            <div className="pt-2 border-t text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Best rank</span>
                <span>#{Math.min(...weeklyHistory.map(w => w.rank))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg score</span>
                <span>{(weeklyHistory.reduce((sum, w) => sum + w.score, 0) / weeklyHistory.length).toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rank change</span>
                <span className={rankChange > 0 ? 'text-chart-2' : rankChange < 0 ? 'text-destructive' : ''}>
                  {rankChange > 0 ? `+${rankChange}` : rankChange < 0 ? rankChange : '—'}
                </span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
