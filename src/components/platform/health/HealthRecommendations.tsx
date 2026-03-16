import * as React from 'react';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthRecommendationsProps {
  recommendations: string[];
  className?: string;
}

export function HealthRecommendations({ recommendations, className }: HealthRecommendationsProps) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className={cn('text-center py-6 text-[hsl(var(--platform-foreground-subtle))]', className)}>
        <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recommendations - this organization is performing well!</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {recommendations.map((rec, index) => (
        <div
          key={index}
          className="flex items-start gap-3 p-3 rounded-lg bg-violet-500/5 border border-violet-500/20"
        >
          <div className="p-1.5 rounded-lg bg-violet-500/10 shrink-0">
            <Lightbulb className="w-4 h-4 text-[hsl(var(--platform-primary))]" />
          </div>
          <p className="text-sm text-[hsl(var(--platform-foreground)/0.85)]">{rec}</p>
        </div>
      ))}
    </div>
  );
}