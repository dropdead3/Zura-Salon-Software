import { ArrowRight, BarChart3 } from 'lucide-react';
import type { RankedResult } from '@/lib/searchRanker';

interface ReportPreviewProps {
  result: RankedResult;
}

export function ReportPreview({ result }: ReportPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
          <BarChart3 className="w-4 h-4 text-primary/60" />
        </div>
        <div>
          <h3 className="font-display text-sm tracking-wide text-foreground">{result.title}</h3>
          {result.subtitle && (
            <p className="font-sans text-xs text-muted-foreground">{result.subtitle}</p>
          )}
        </div>
      </div>

      {result.metadata && (
        <p className="font-sans text-xs text-muted-foreground">{result.metadata}</p>
      )}

      <p className="font-sans text-xs text-muted-foreground/60">
        Open to view the full report with charts and breakdowns.
      </p>

      <div className="flex items-center gap-1 text-xs font-sans text-primary/80 pt-1">
        <span>Open Report</span>
        <ArrowRight className="w-3 h-3" />
      </div>
    </div>
  );
}
