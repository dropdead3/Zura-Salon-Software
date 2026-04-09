import { ArrowRight, User } from 'lucide-react';
import { AnimatedBlurredAmount } from '@/components/ui/AnimatedBlurredAmount';
import { TrendSparkline } from '@/components/dashboard/TrendSparkline';
import { PreviewSkeleton } from '../CommandPreviewPanel';
import type { RankedResult } from '@/lib/searchRanker';

interface TeamPreviewProps {
  result: RankedResult;
}

export function TeamPreview({ result }: TeamPreviewProps) {
  // For now, show static info from the result since useIndividualStaffReport
  // requires date params that aren't available in the preview context.
  // This avoids a heavy query and keeps the preview instant.

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-display text-sm tracking-wide text-foreground">{result.title}</h3>
          {result.subtitle && (
            <p className="font-sans text-xs text-muted-foreground">{result.subtitle}</p>
          )}
        </div>
      </div>

      {result.metadata && (
        <div className="bg-muted/30 rounded-lg px-3 py-2.5">
          <span className="font-sans text-[10px] text-muted-foreground/70 uppercase tracking-wider">Location</span>
          <p className="font-sans text-sm text-foreground">{result.metadata}</p>
        </div>
      )}

      <div className="flex items-center gap-1 text-xs font-sans text-primary/80 pt-1">
        <span>Open Profile</span>
        <ArrowRight className="w-3 h-3" />
      </div>
    </div>
  );
}
