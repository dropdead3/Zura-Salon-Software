import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, AlertCircle, TrendingDown, ChevronRight } from 'lucide-react';
import type { HealthScoreWithOrg } from '@/hooks/useOrganizationHealth';
import { cn } from '@/lib/utils';

interface RiskAlertsListProps {
  scores: HealthScoreWithOrg[];
  maxItems?: number;
  showViewAll?: boolean;
  className?: string;
}

export function RiskAlertsList({ 
  scores, 
  maxItems = 5,
  showViewAll = true,
  className 
}: RiskAlertsListProps) {
  const navigate = useNavigate();

  // Filter to at-risk and critical, sort by score ascending (worst first)
  const atRiskScores = scores
    .filter((s) => s.risk_level === 'at_risk' || s.risk_level === 'critical')
    .sort((a, b) => Number(a.score) - Number(b.score))
    .slice(0, maxItems);

  if (atRiskScores.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-slate-400">All organizations are healthy!</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {atRiskScores.map((score) => {
        const isCritical = score.risk_level === 'critical';
        const trend = score.trends?.trend;
        const trendDiff = score.trends?.score_7d_ago 
          ? Number(score.score) - score.trends.score_7d_ago 
          : 0;

        // Find the lowest scoring component
        const components = [
          { name: 'Adoption', score: score.score_breakdown.adoption.score },
          { name: 'Engagement', score: score.score_breakdown.engagement.score },
          { name: 'Performance', score: score.score_breakdown.performance.score },
          { name: 'Data Quality', score: score.score_breakdown.data_quality.score },
        ].sort((a, b) => a.score - b.score);

        const weakestComponents = components.filter(c => c.score < 60).slice(0, 2);

        return (
          <button
            key={score.id}
            onClick={() => navigate(`/dashboard/platform/accounts/${score.organization_id}?tab=health`)}
            className={cn(
              'w-full text-left rounded-lg border p-4 transition-all hover:border-violet-500/50',
              isCritical 
                ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10' 
                : 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-1.5 rounded-lg shrink-0',
                  isCritical ? 'bg-red-500/10' : 'bg-amber-500/10'
                )}>
                  {isCritical ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white truncate">
                      {score.organization?.name || 'Unknown'}
                    </span>
                    <span className={cn(
                      'text-sm font-medium px-1.5 py-0.5 rounded',
                      isCritical 
                        ? 'bg-red-500/20 text-red-400' 
                        : 'bg-amber-500/20 text-amber-400'
                    )}>
                      {Math.round(Number(score.score))}
                    </span>
                    {trendDiff !== 0 && (
                      <span className={cn(
                        'text-xs flex items-center gap-0.5',
                        trendDiff > 0 ? 'text-emerald-400' : 'text-red-400'
                      )}>
                        {trendDiff > 0 ? '↑' : '↓'}{Math.abs(trendDiff).toFixed(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {weakestComponents.map((comp) => (
                      <span 
                        key={comp.name}
                        className="text-xs px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400"
                      >
                        {comp.name}: {comp.score}
                      </span>
                    ))}
                  </div>
                  {score.recommendations?.[0] && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                      "{score.recommendations[0]}"
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
            </div>
          </button>
        );
      })}

      {showViewAll && atRiskScores.length >= maxItems && (
        <button
          onClick={() => navigate('/dashboard/platform/health-scores')}
          className="w-full text-center py-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
        >
          View All At-Risk Organizations →
        </button>
      )}
    </div>
  );
}
