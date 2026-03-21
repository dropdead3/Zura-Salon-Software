import { useNavigate } from 'react-router-dom';
import { Trophy, Medal, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlatformTheme } from '@/contexts/PlatformThemeContext';
import type { OrganizationMetrics } from '@/hooks/useOrganizationAnalytics';

interface LeaderboardEntry {
  rank: number;
  organization: OrganizationMetrics;
  value: number;
  previousValue?: number;
  formattedValue: string;
}

interface LeaderboardCardProps {
  title: string;
  icon: React.ReactNode;
  entries: LeaderboardEntry[];
  valueLabel: string;
  emptyMessage?: string;
}

export function LeaderboardCard({ title, icon, entries, valueLabel, emptyMessage = 'No data available' }: LeaderboardCardProps) {
  const navigate = useNavigate();
  const { resolvedTheme } = usePlatformTheme();
  const isDark = resolvedTheme === 'dark';

  const getRankStyle = (rank: number) => {
    if (rank === 1) {
      return isDark
        ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/30'
        : 'bg-gradient-to-r from-amber-100 to-yellow-100 border-amber-300';
    }
    if (rank === 2) {
      return isDark
        ? 'bg-gradient-to-r from-slate-400/20 to-gray-400/20 border-slate-400/30'
        : 'bg-gradient-to-r from-slate-200 to-gray-200 border-slate-300';
    }
    if (rank === 3) {
      return isDark
        ? 'bg-gradient-to-r from-orange-600/20 to-amber-600/20 border-orange-500/30'
        : 'bg-gradient-to-r from-orange-100 to-amber-100 border-orange-300';
    }
    return isDark
      ? 'bg-slate-800/50 border-slate-700/50'
      : 'bg-white/50 border-slate-200';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return <Trophy className="h-5 w-5 text-amber-500" />;
    }
    if (rank === 2) {
      return <Medal className="h-5 w-5 text-slate-400" />;
    }
    if (rank === 3) {
      return <Medal className="h-5 w-5 text-orange-500" />;
    }
    return (
      <span className={cn(
        'h-5 w-5 flex items-center justify-center text-sm font-medium rounded-full',
        isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
      )}>
        {rank}
      </span>
    );
  };

  const getTrendIcon = (current: number, previous?: number) => {
    if (!previous) return <Minus className="h-4 w-4 text-slate-400" />;
    if (current > previous) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-slate-400" />;
  };

  return (
    <div className={cn(
      'rounded-xl border p-4',
      isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
    )}>
      <div className="flex items-center gap-2 mb-4">
        <div className={cn(
          'p-2 rounded-lg',
          isDark ? 'bg-violet-500/20' : 'bg-violet-100'
        )}>
          {icon}
        </div>
        <div>
          <h3 className={cn(
            'font-medium',
            isDark ? 'text-white' : 'text-slate-900'
          )}>
            {title}
          </h3>
          <p className={cn(
            'text-xs',
            isDark ? 'text-slate-400' : 'text-slate-500'
          )}>
            {valueLabel}
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className={cn(
          'text-center py-8 text-sm',
          isDark ? 'text-slate-400' : 'text-slate-500'
        )}>
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <button
              key={entry.organization.id}
              onClick={() => navigate(`/dashboard/platform/accounts/${entry.organization.slug}`)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 text-left',
                getRankStyle(entry.rank),
                'hover:scale-[1.01] hover:shadow-md'
              )}
            >
              <div className="shrink-0">
                {getRankIcon(entry.rank)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'font-medium truncate',
                  isDark ? 'text-white' : 'text-slate-900'
                )}>
                  {entry.organization.name}
                </p>
                <p className={cn(
                  'text-xs truncate',
                  isDark ? 'text-slate-400' : 'text-slate-500'
                )}>
                  #{entry.organization.accountNumber} • {entry.organization.subscriptionTier || 'No Plan'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn(
                  'font-medium',
                  isDark ? 'text-violet-400' : 'text-violet-600'
                )}>
                  {entry.formattedValue}
                </span>
                {getTrendIcon(entry.value, entry.previousValue)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
