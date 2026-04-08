/**
 * AICoachingPanel — Displays AI-generated personalized coaching plan.
 * Shows summary, strengths, and prioritized action items with scripts.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  CheckCircle2,
  Target,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import type { CoachingResult } from '@/hooks/useAICoaching';

interface AICoachingPanelProps {
  coaching: CoachingResult;
  onClose: () => void;
}

const priorityConfig = {
  high: { color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200 dark:border-rose-800', label: 'High Impact' },
  medium: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800', label: 'Medium' },
  low: { color: 'bg-muted text-muted-foreground border-border', label: 'Low' },
};

export function AICoachingPanel({ coaching, onClose }: AICoachingPanelProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardContent className="pt-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-display text-xs tracking-wide text-foreground">AI Coaching Plan</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Dismiss
          </button>
        </div>

        {/* Summary */}
        <p className="text-sm text-foreground leading-relaxed">
          {coaching.summary}
        </p>

        {/* Strengths */}
        {coaching.strengths.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              <span className="font-display tracking-wide">Strengths</span>
            </div>
            {coaching.strengths.map((s, i) => (
              <p key={i} className="text-xs text-muted-foreground pl-4">
                {s}
              </p>
            ))}
          </div>
        )}

        {/* Action Items */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs">
            <Target className="w-3 h-3 text-primary" />
            <span className="font-display tracking-wide text-foreground">Action Plan</span>
          </div>

          {coaching.actions.map((action, idx) => {
            const isExpanded = expandedIdx === idx;
            const config = priorityConfig[action.priority] || priorityConfig.medium;

            return (
              <div
                key={idx}
                className="rounded-lg border border-border/60 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-muted/30 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-xs text-foreground flex-1">{action.title}</span>
                  <Badge variant="outline" className={cn('text-[9px] h-4 px-1.5 border', config.color)}>
                    {config.label}
                  </Badge>
                  <span className="text-[9px] text-muted-foreground shrink-0">
                    {action.kpi}
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t border-border/40">
                    <p className="text-xs text-muted-foreground leading-relaxed mt-2 whitespace-pre-line">
                      {action.script}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p className="text-[10px] text-muted-foreground border-t border-border/40 pt-2">
          Generated based on your current performance data. Refresh for updated recommendations.
        </p>
      </CardContent>
    </Card>
  );
}
