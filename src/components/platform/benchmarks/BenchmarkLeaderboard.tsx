import * as React from 'react';
import { Trophy, Medal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatMetricValue, METRIC_CONFIG, type MetricLeaderboard } from '@/hooks/useBenchmarkData';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
} from '@/components/platform/ui/PlatformCard';
import { cn } from '@/lib/utils';

interface BenchmarkLeaderboardProps {
  leaderboard: MetricLeaderboard;
  className?: string;
}

export function BenchmarkLeaderboard({ leaderboard, className }: BenchmarkLeaderboardProps) {
  const navigate = useNavigate();
  const config = METRIC_CONFIG[leaderboard.metric_key];

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="w-4 h-4 text-amber-400" />;
    if (rank === 1) return <Medal className="w-4 h-4 text-slate-300" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-amber-700" />;
    return null;
  };

  return (
    <PlatformCard variant="glass" className={className}>
      <PlatformCardHeader className="pb-2">
        <PlatformCardTitle className="text-base">{leaderboard.metric_label}</PlatformCardTitle>
      </PlatformCardHeader>
      <PlatformCardContent>
        <div className="space-y-2">
          {leaderboard.leaders.map((leader, index) => (
            <button
              key={leader.organization_id}
              onClick={() => navigate(`/dashboard/platform/accounts/${leader.organization_id}?tab=health`)}
              className={cn(
                'w-full flex items-center justify-between p-2 rounded-lg transition-colors',
                'hover:bg-slate-700/50',
                index === 0 && 'bg-amber-500/5 border border-amber-500/20'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="w-6 text-center text-sm text-slate-500">
                  {getRankIcon(index) || `${index + 1}.`}
                </span>
                <span className="text-sm font-medium text-white truncate">
                  {leader.organization_name}
                </span>
              </div>
              <span className="text-sm text-violet-400 font-medium">
                {formatMetricValue(leader.value, config?.format || 'number')}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Platform Average</span>
            <span className="text-slate-300">
              {formatMetricValue(leaderboard.platform_average, config?.format || 'number')}
            </span>
          </div>
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}
