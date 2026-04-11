import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { PIPELINE_STAGES_ORDERED, PIPELINE_STAGE_LABELS } from '@/config/capital-engine/ownership-config';
import type { PipelineSummary } from '@/lib/capital-engine/ownership-engine';

interface DealPipelineCardProps {
  summary: PipelineSummary;
}

export function DealPipelineCard({ summary }: DealPipelineCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <GitBranch className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className={tokens.card.title}>Deal Pipeline</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          {PIPELINE_STAGES_ORDERED.map((stage, i) => (
            <div key={stage} className="flex items-center gap-2">
              <div className="text-center">
                <p className="font-display text-xl tracking-wide">
                  {summary[stage as keyof PipelineSummary]}
                </p>
                <p className="text-xs text-muted-foreground font-sans">
                  {PIPELINE_STAGE_LABELS[stage]?.label}
                </p>
              </div>
              {i < PIPELINE_STAGES_ORDERED.length - 1 && (
                <span className="text-muted-foreground/40 text-lg">→</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          {summary.total} total deal{summary.total !== 1 ? 's' : ''} in pipeline
        </p>
      </CardContent>
    </Card>
  );
}
